import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import type { Tool as MCPToolDef } from "@modelcontextprotocol/sdk/types.js";
import type { McpManager } from "./manager.ts";
import { toolName } from "./catalog.ts";

/**
 * Direct tool mode ("opencode classic"): every discovered MCP tool is
 * registered as a first-class pi tool named mcp_<server>_<tool>.
 * Requires eager connection at session start so defs are known.
 */

export type GetManager = () => McpManager | undefined;

export async function registerDirectTools(
  pi: ExtensionAPI,
  getManager: GetManager,
  registered: Set<string>,
): Promise<void> {
  const manager = getManager();
  if (!manager) return;
  await manager.ensureAllDefs();
  syncDirectTools(pi, getManager, undefined, registered);
}

/** Register newly appeared tools (initial sync or tools/list_changed). */
export function syncDirectTools(
  pi: ExtensionAPI,
  getManager: GetManager,
  serverName: string | undefined,
  registered: Set<string>,
): void {
  const manager = getManager();
  if (!manager) return;
  for (const info of manager.listServers()) {
    if (serverName && info.name !== serverName) continue;
    for (const def of manager.getDefs(info.name)) {
      const name = toolName(info.name, def.name);
      if (registered.has(name)) continue;
      registerOne(pi, getManager, info.name, def);
      registered.add(name);
    }
  }
}

function registerOne(pi: ExtensionAPI, getManager: GetManager, serverName: string, def: MCPToolDef): void {
  const name = toolName(serverName, def.name);
  pi.registerTool({
    name,
    label: `${serverName}: ${def.name}`,
    description: `[MCP ${serverName}] ${def.description ?? def.name}`,
    // MCP input schemas are plain JSON Schema; Type.Unsafe passes them through
    // to pi's validator as-is.
    parameters: Type.Unsafe<Record<string, unknown>>({
      ...(def.inputSchema as Record<string, unknown>),
      type: "object",
      properties: (def.inputSchema as { properties?: unknown }).properties ?? {},
      additionalProperties: true,
    }),
    async execute(_toolCallId, params, signal) {
      const manager = getManager();
      if (!manager) throw new Error("pi-mcp is not initialized (no active session)");
      const content = await manager.callTool(serverName, def.name, params, { signal });
      return { content, details: {} };
    },
  });
}
