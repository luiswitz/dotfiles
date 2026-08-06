import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateHead, DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import type { McpManager } from "./manager.ts";
import { describeStatus } from "./manager.ts";
import { toolName } from "./catalog.ts";

/**
 * Proxy tool mode: a single `mcp` tool fronts every configured MCP server.
 * The LLM lists/searches/describes tools on demand and calls them through the
 * proxy — one ~200-token tool definition instead of hundreds (Dilon's setup).
 */

type ProgressUpdate = (partial: { content: { type: "text"; text: string }[]; details: Record<string, unknown> }) => void;

const DESCRIPTION = `Access tools from configured MCP (Model Context Protocol) servers through one proxy.

Workflow:
1. action="list" — show servers, connection status, and tool counts.
2. action="search" with query — find tools across all servers by keyword (lazy-connects servers).
3. action="describe" with server + tool — inspect a tool's full input schema.
4. action="call" with server + tool + arguments — execute the tool.

Always describe a tool before calling it unless you already know its schema.`;

export type GetManager = () => McpManager | undefined;

export function registerProxyTool(pi: ExtensionAPI, getManager: GetManager): void {
  pi.registerTool({
    name: "mcp",
    label: "MCP Proxy",
    description: DESCRIPTION,
    promptSnippet: "Discover and call tools from configured MCP servers",
    promptGuidelines: [
      "Use the mcp tool to discover and call tools provided by configured MCP servers (action=list/search/describe/call).",
      "Always run the mcp tool with action=\"describe\" for a server tool before calling it for the first time.",
    ],
    parameters: Type.Object({
      action: StringEnum(["list", "search", "describe", "call"] as const),
      server: Type.Optional(Type.String({ description: "MCP server name (from action=list)" })),
      tool: Type.Optional(Type.String({ description: "Tool name on the server (bare, without mcp_ prefix)" })),
      query: Type.Optional(Type.String({ description: "Search terms for action=search" })),
      arguments: Type.Optional(
        Type.Record(Type.String(), Type.Any(), { description: "Tool arguments for action=call" }),
      ),
    }),

    async execute(_toolCallId, params, signal, onUpdate) {
      const manager = requireManager(getManager);
      switch (params.action) {
        case "list":
          return listResult(manager);
        case "search":
          return await searchResult(manager, params.query ?? "", onUpdate);
        case "describe":
          return await describeResult(manager, params.server, params.tool);
        case "call":
          return await callResult(manager, params.server, params.tool, params.arguments ?? {}, signal, onUpdate);
      }
    },
  });
}

function requireManager(getManager: GetManager): McpManager {
  const manager = getManager();
  if (!manager) {
    throw new Error("pi-mcp is not initialized (no active session). Try again once the session has started.");
  }
  return manager;
}

function text(value: string): {
  content: { type: "text"; text: string }[];
  details: Record<string, unknown>;
} {
  return { content: [{ type: "text", text: value }], details: {} };
}

function listResult(manager: McpManager) {
  const servers = manager.listServers();
  if (servers.length === 0) {
    return text("No MCP servers configured. Add servers under \"mcp.servers\" in ~/.pi/agent/mcp.json.");
  }
  const lines = servers.map((info) => {
    const tools = info.status.status === "connected" ? `${info.toolCount} tools` : "—";
    return `- ${info.name} [${info.config.type}] ${describeStatus(info.status)} (${tools})`;
  });
  return text(`MCP servers:\n${lines.join("\n")}`);
}

async function searchResult(manager: McpManager, query: string, onUpdate?: ProgressUpdate) {
  if (!query.trim()) throw new Error("action=search requires a non-empty query");

  onUpdate?.({ content: [{ type: "text", text: "Connecting to MCP servers…" }], details: {} });
  await manager.ensureAllDefs();

  const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const matches: { name: string; server: string; tool: string; description: string; score: number }[] = [];

  for (const info of manager.listServers()) {
    for (const def of manager.getDefs(info.name)) {
      const haystack = `${def.name} ${def.description ?? ""} ${info.name}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      if (score > 0) {
        matches.push({
          name: toolName(info.name, def.name),
          server: info.name,
          tool: def.name,
          description: def.description ?? "",
          score,
        });
      }
    }
  }

  matches.sort((a, b) => b.score - a.score);
  const top = matches.slice(0, 20);
  if (top.length === 0) return text(`No MCP tools matched "${query}".`);

  const lines = top.map(
    (match) => `- ${match.name}\n  server=${match.server} tool=${match.tool}\n  ${truncateLine(match.description, 200)}`,
  );
  return text(
    `Matching tools (call via mcp action="call" with server + tool):\n${lines.join("\n")}${
      matches.length > top.length ? `\n… ${matches.length - top.length} more, refine your query` : ""
    }`,
  );
}

async function describeResult(manager: McpManager, server?: string, tool?: string) {
  if (!server) throw new Error("action=describe requires server");
  if (!tool) throw new Error("action=describe requires tool");

  await manager.ensureConnected(server);
  const def = manager.getDefs(server).find((candidate) => candidate.name === tool || toolName(server, candidate.name) === tool);
  if (!def) {
    const available = manager.getDefs(server).map((candidate) => candidate.name);
    throw new Error(
      `Tool "${tool}" not found on server "${server}". Available: ${available.slice(0, 50).join(", ") || "(none)"}`,
    );
  }

  return text(
    `${toolName(server, def.name)}\n${def.description ?? "(no description)"}\n\nInput schema:\n${JSON.stringify(
      def.inputSchema,
      null,
      2,
    )}`,
  );
}

async function callResult(
  manager: McpManager,
  server: string | undefined,
  tool: string | undefined,
  args: Record<string, unknown>,
  signal: AbortSignal | undefined,
  onUpdate?: ProgressUpdate,
) {
  if (!server) throw new Error("action=call requires server");
  if (!tool) throw new Error("action=call requires tool");

  onUpdate?.({ content: [{ type: "text", text: `Calling ${server}:${tool}…` }], details: {} });
  const bareTool = resolveBareToolName(manager, server, tool);
  const content = await manager.callTool(server, bareTool, args, { signal });

  // Truncate text payloads so one call can't swamp the context.
  const truncated = content.map((item) => {
    if (item.type !== "text") return item;
    const result = truncateHead(item.text, { maxLines: DEFAULT_MAX_LINES, maxBytes: DEFAULT_MAX_BYTES });
    if (!result.truncated) return item;
    return {
      type: "text" as const,
      text: `${result.content}\n\n[Truncated: ${result.outputLines} of ${result.totalLines} lines (${formatSize(
        result.outputBytes,
      )} of ${formatSize(result.totalBytes)}). Narrow the query or paginate via the tool's own parameters.]`,
    };
  });

  return { content: truncated, details: {} };
}

/** Accepts bare tool names or fully-qualified mcp_<server>_<tool> names. */
function resolveBareToolName(manager: McpManager, server: string, tool: string): string {
  const defs = manager.getDefs(server);
  if (defs.some((def) => def.name === tool)) return tool;
  const qualified = defs.find((def) => toolName(server, def.name) === tool);
  if (qualified) return qualified.name;
  return tool; // let the server produce the error
}

function truncateLine(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}
