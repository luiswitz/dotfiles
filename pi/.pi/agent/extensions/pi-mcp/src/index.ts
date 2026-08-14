import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent";
import { getAuthStorePath, getExplicitProjectConfigPath, getGlobalConfigPath } from "./paths.ts";
import { getProjectConfigPath, loadConfig, type McpConfig } from "./config.ts";
import { AuthStore } from "./auth-store.ts";
import { McpManager, describeStatus } from "./manager.ts";
import { registerProxyTool } from "./proxy.ts";
import { registerDirectTools, syncDirectTools } from "./direct.ts";
import { showMcpPanel } from "./panel.ts";

/**
 * pi-mcp — an MCP client for pi, ported from opencode's MCP implementation.
 *
 * Config: ~/.pi/agent/mcp.json (+ project .pi/mcp.json override)
 * {
 *   "mcp": {
 *     "toolMode": "proxy" | "direct",   // default "proxy"
 *     "startup": "lazy" | "eager",      // default "lazy"
 *     "servers": { ... }                // opencode-style server configs
 *   }
 * }
 */

export default async function (pi: ExtensionAPI) {
  const globalPath = getGlobalConfigPath();
  const auth = new AuthStore(getAuthStorePath());

  // Tools resolve the manager lazily: pi re-instantiates extensions on session
  // replacement, but tool registrations persist for the factory instance, so
  // execute-time lookup is required to avoid stale-manager bugs.
  let manager: McpManager | undefined;
  let config: McpConfig = { toolMode: "proxy", startup: "lazy", servers: {} };
  const getManager = () => manager;
  const directRegistered = new Set<string>();

  registerProxyTool(pi, getManager);

  pi.on("session_start", async (_event, ctx) => {
    const projectPath = ctx.isProjectTrusted()
      ? getExplicitProjectConfigPath() ?? getProjectConfigPath(ctx.cwd, CONFIG_DIR_NAME)
      : undefined;
    const loaded = await loadConfig(globalPath, projectPath);
    config = loaded.config;

    for (const problem of loaded.problems) {
      ctx.ui.notify(`pi-mcp config: ${problem}`, "warning");
    }
    if (loaded.missingEnv.length > 0) {
      ctx.ui.notify(`pi-mcp: missing environment variables: ${loaded.missingEnv.join(", ")}`, "warning");
    }

    manager = new McpManager(config, auth, ctx.cwd, {
      onToolsChanged: (serverName) => {
        if (config.toolMode === "direct" && manager) {
          syncDirectTools(pi, getManager, serverName, directRegistered);
        }
        updateStatus(ctx, manager);
      },
      onNeedsAuth: (serverName) => {
        ctx.ui.notify(`MCP server "${serverName}" requires authentication — run /mcp auth ${serverName}`, "warning");
      },
      onNeedsClientRegistration: (serverName, error) => {
        ctx.ui.notify(`MCP server "${serverName}": ${error}`, "warning");
      },
    });

    await manager.start();

    if (config.toolMode === "direct") {
      // Direct mode needs defs up-front: connect everything, register each tool.
      await registerDirectTools(pi, getManager, directRegistered);
    }

    updateStatus(ctx, manager);
  });

  pi.on("session_shutdown", async () => {
    if (manager) {
      const current = manager;
      manager = undefined;
      await current.shutdown();
    }
  });

  // Surface connected servers' instructions in the system prompt.
  pi.on("before_agent_start", async (event) => {
    if (!manager) return;
    const blocks = manager.getConnectedInstructions();
    if (blocks.length === 0) return;
    const section = blocks
      .map((block) => `## MCP server "${block.name}" instructions\n${block.instructions}`)
      .join("\n\n");
    return { systemPrompt: `${event.systemPrompt}\n\n${section}` };
  });

  pi.registerCommand("mcp", {
    description: "Manage MCP servers: /mcp [status|connect|disconnect|auth|logout] [server]",
    getArgumentCompletions: (prefix) => {
      const subcommands = ["status", "connect", "disconnect", "auth", "logout"].map((value) => ({
        value,
        label: value,
      }));
      const servers = (manager?.serverNames() ?? []).map((value) => ({ value, label: value }));
      const parts = prefix.split(/\s+/).filter(Boolean);
      const pool = parts.length <= 1 && !prefix.endsWith(" ") ? [...subcommands, ...servers] : servers;
      const current = prefix.endsWith(" ") ? "" : (parts[parts.length - 1] ?? "");
      const filtered = pool.filter((item) => item.value.startsWith(current));
      return filtered.length > 0 ? filtered : null;
    },
    handler: async (args, ctx) => {
      if (!manager) {
        ctx.ui.notify("pi-mcp is not initialized yet", "error");
        return;
      }
      const [subcommand, server] = args.trim().split(/\s+/).filter(Boolean);

      switch (subcommand) {
        case undefined:
        case "":
          return await openPanelOrStatus(ctx, manager);
        case "status":
          return await showStatus(ctx, manager, server);
        case "connect":
          return requireServer(ctx, manager, server, async (name) => {
            const status = await manager!.connect(name);
            ctx.ui.notify(`${name}: ${describeStatus(status)}`, status.status === "connected" ? "info" : "warning");
          });
        case "disconnect":
          return requireServer(ctx, manager, server, async (name) => {
            await manager!.disconnect(name);
            ctx.ui.notify(`${name}: disconnected`, "info");
          });
        case "auth":
          return requireServer(ctx, manager, server, async (name) => {
            const serverConfig = manager!.listServers().find((info) => info.name === name)?.config;
            if (serverConfig?.type !== "remote") {
              ctx.ui.notify(`${name}: OAuth only applies to remote servers`, "warning");
              return;
            }
            if (serverConfig.oauth === false) {
              ctx.ui.notify(`${name}: OAuth disabled in config`, "warning");
              return;
            }
            ctx.ui.notify(`Starting OAuth for ${name} — check your browser`, "info");
            const status = await manager!.authenticate(name, (url) => {
              ctx.ui.notify(`Open to authorize:\n${url}`, "info");
            });
            ctx.ui.notify(`${name}: ${describeStatus(status)}`, status.status === "connected" ? "info" : "warning");
          });
        case "logout":
          return requireServer(ctx, manager, server, async (name) => {
            await manager!.removeAuth(name);
            ctx.ui.notify(`${name}: credentials removed`, "info");
          });
        default:
          // Treat unknown subcommand as a server name for convenience.
          if (manager.serverNames().includes(subcommand)) {
            return await showStatus(ctx, manager, subcommand);
          }
          ctx.ui.notify(`Unknown /mcp subcommand: ${subcommand}`, "error");
      }
    },
  });
}

async function openPanelOrStatus(ctx: ExtensionCommandContext, manager: McpManager): Promise<void> {
  if (ctx.mode === "tui") {
    await showMcpPanel(ctx, manager);
    return;
  }
  await showStatus(ctx, manager);
}

async function showStatus(ctx: ExtensionCommandContext, manager: McpManager, server?: string): Promise<void> {
  const infos = server ? manager.listServers().filter((info) => info.name === server) : manager.listServers();
  if (infos.length === 0) {
    ctx.ui.notify(server ? `No MCP server named "${server}"` : "No MCP servers configured", "warning");
    return;
  }
  const lines = infos.map((info) => {
    const tools = info.status.status === "connected" ? `, ${info.toolCount} tools` : "";
    return `${info.name} [${info.config.type}]: ${describeStatus(info.status)}${tools}`;
  });
  ctx.ui.notify(lines.join("\n"), "info");
}

async function requireServer(
  ctx: ExtensionCommandContext,
  manager: McpManager,
  server: string | undefined,
  action: (name: string) => Promise<void>,
): Promise<void> {
  let name = server;
  if (!name) {
    const names = manager.serverNames();
    if (names.length === 0) {
      ctx.ui.notify("No MCP servers configured", "warning");
      return;
    }
    if (ctx.hasUI) {
      name = await ctx.ui.select("Pick a server:", names);
      if (!name) return;
    } else {
      ctx.ui.notify(`Usage requires a server name. Configured: ${names.join(", ")}`, "warning");
      return;
    }
  }
  if (!manager.serverNames().includes(name)) {
    ctx.ui.notify(`No MCP server named "${name}". Configured: ${manager.serverNames().join(", ")}`, "error");
    return;
  }
  try {
    await action(name);
  } catch (error) {
    ctx.ui.notify(`pi-mcp: ${error instanceof Error ? error.message : String(error)}`, "error");
  }
}

function updateStatus(ctx: ExtensionContext, manager: McpManager | undefined): void {
  if (!ctx.hasUI || !manager) return;
  const infos = manager.listServers();
  if (infos.length === 0) return;
  const connected = infos.filter((info) => info.status.status === "connected").length;
  ctx.ui.setStatus("pi-mcp", `MCP ${connected}/${infos.length}`);
}
