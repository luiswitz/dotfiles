import { homedir } from "node:os";
import { join } from "node:path";

/** Resolve the pi agent dir (defaults to ~/.pi/agent, overridable via env). */
export function getAgentDir(): string {
  const configured = process.env.PI_CODING_AGENT_DIR?.trim();
  if (configured) return expandHome(configured);
  return join(homedir(), ".pi", "agent");
}

/** Global MCP config: <agentDir>/mcp.json */
export function getGlobalConfigPath(): string {
  return join(getAgentDir(), "mcp.json");
}

/** OAuth token store: <agentDir>/mcp-auth.json */
export function getAuthStorePath(): string {
  return join(getAgentDir(), "mcp-auth.json");
}

/** Optional explicit project config, useful for workspace launchers serving nested repos. */
export function getExplicitProjectConfigPath(): string | undefined {
  const configured = process.env.PI_MCP_PROJECT_CONFIG?.trim();
  return configured ? expandHome(configured) : undefined;
}

function expandHome(input: string): string {
  if (input === "~") return homedir();
  if (input.startsWith("~/")) return join(homedir(), input.slice(2));
  return input;
}
