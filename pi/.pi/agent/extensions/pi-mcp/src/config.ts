import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Config schema — a faithful port of opencode's MCP config (opencode.json `mcp`
 * key), wrapped under `mcp.servers` with adapter-level settings alongside.
 *
 * ```jsonc
 * {
 *   "mcp": {
 *     "toolMode": "proxy",        // "proxy" | "direct"
 *     "startup": "lazy",          // "lazy" | "eager"
 *     "servers": {
 *       "remote-name": {
 *         "type": "remote",
 *         "url": "https://example.com/mcp",
 *         "headers": { "Authorization": "Bearer ${MY_TOKEN}" },
 *         "oauth": {},            // or false to disable OAuth auto-detection
 *         "enabled": true,
 *         "timeout": 30000
 *       },
 *       "local-name": {
 *         "type": "local",
 *         "command": ["npx", "-y", "some-mcp-server"],
 *         "cwd": ".",
 *         "environment": { "KEY": "${SOME_ENV}" },
 *         "enabled": true,
 *         "timeout": 30000
 *       }
 *     }
 *   }
 * }
 * ```
 */

export interface OAuthConfig {
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  callbackPort?: number;
  redirectUri?: string;
}

export interface RemoteServerConfig {
  type: "remote";
  url: string;
  headers?: Record<string, string>;
  oauth?: OAuthConfig | false;
  enabled?: boolean;
  timeout?: number;
}

export interface LocalServerConfig {
  type: "local";
  command: string[];
  cwd?: string;
  environment?: Record<string, string>;
  enabled?: boolean;
  timeout?: number;
}

export type ServerConfig = RemoteServerConfig | LocalServerConfig;

export type ToolMode = "proxy" | "direct";
export type Startup = "lazy" | "eager";

export interface McpConfig {
  toolMode: ToolMode;
  startup: Startup;
  servers: Record<string, ServerConfig>;
}

export interface LoadedConfig {
  config: McpConfig;
  /** Environment variables referenced via ${VAR} that were not set. */
  missingEnv: string[];
  /** Human-readable config problems (unknown keys, bad shapes). */
  problems: string[];
}

const DEFAULTS: McpConfig = { toolMode: "proxy", startup: "lazy", servers: {} };

/** Load and merge global + project mcp.json. Project wins per-server. */
export async function loadConfig(globalPath: string, projectPath?: string): Promise<LoadedConfig> {
  const missingEnv = new Set<string>();
  const problems: string[] = [];

  const globalRaw = await readRaw(globalPath, problems);
  const projectRaw = projectPath ? await readRaw(projectPath, problems) : undefined;

  const merged: McpConfig = { ...DEFAULTS, servers: {} };

  for (const [file, raw] of [
    [globalPath, globalRaw],
    [projectPath ?? "", projectRaw],
  ] as const) {
    if (!raw) continue;
    const mcp = raw.mcp;
    if (mcp === undefined) continue; // file may hold other extensions' config (e.g. "mcpServers")
    if (typeof mcp !== "object" || mcp === null || Array.isArray(mcp)) {
      problems.push(`${file}: "mcp" must be an object`);
      continue;
    }
    const section = mcp as Record<string, unknown>;
    if (section.toolMode !== undefined) {
      if (section.toolMode === "proxy" || section.toolMode === "direct") {
        merged.toolMode = section.toolMode;
      } else {
        problems.push(`${file}: mcp.toolMode must be "proxy" or "direct"`);
      }
    }
    if (section.startup !== undefined) {
      if (section.startup === "lazy" || section.startup === "eager") {
        merged.startup = section.startup;
      } else {
        problems.push(`${file}: mcp.startup must be "lazy" or "eager"`);
      }
    }
    if (section.servers !== undefined) {
      if (typeof section.servers !== "object" || section.servers === null || Array.isArray(section.servers)) {
        problems.push(`${file}: mcp.servers must be an object`);
      } else {
        for (const [name, serverRaw] of Object.entries(section.servers as Record<string, unknown>)) {
          const parsed = parseServer(name, serverRaw, `${file}: mcp.servers.${name}`, problems, missingEnv);
          if (parsed) merged.servers[name] = parsed;
          else if (projectPath && file === projectPath) delete merged.servers[name]; // invalid project entry masks global
        }
      }
    }
  }

  return { config: merged, missingEnv: [...missingEnv], problems };
}

export function getProjectConfigPath(cwd: string, configDirName: string): string {
  return join(cwd, configDirName, "mcp.json");
}

type RawFile = { mcp?: unknown } & Record<string, unknown>;

async function readRaw(path: string, problems: string[]): Promise<RawFile | undefined> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch {
    return undefined; // missing file is fine
  }
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      problems.push(`${path}: config root must be an object`);
      return undefined;
    }
    return parsed as RawFile;
  } catch (error) {
    problems.push(`${path}: invalid JSON — ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

function parseServer(
  name: string,
  raw: unknown,
  at: string,
  problems: string[],
  missingEnv: Set<string>,
): ServerConfig | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    problems.push(`${at}: server config must be an object`);
    return undefined;
  }
  const obj = raw as Record<string, unknown>;
  const type = obj.type;
  const enabled = parseOptionalBoolean(obj.enabled, `${at}.enabled`, problems);
  const timeout = parseOptionalNumber(obj.timeout, `${at}.timeout`, problems);

  if (type === "remote") {
    if (typeof obj.url !== "string" || obj.url.length === 0) {
      problems.push(`${at}: remote server requires a non-empty "url"`);
      return undefined;
    }
    const headers = parseStringRecord(obj.headers, `${at}.headers`, problems, missingEnv);
    let oauth: OAuthConfig | false | undefined;
    if (obj.oauth === false) {
      oauth = false;
    } else if (obj.oauth !== undefined) {
      if (typeof obj.oauth === "object" && obj.oauth !== null && !Array.isArray(obj.oauth)) {
        const o = obj.oauth as Record<string, unknown>;
        oauth = {
          clientId: parseOptionalString(o.clientId, `${at}.oauth.clientId`, problems),
          clientSecret: parseOptionalString(o.clientSecret, `${at}.oauth.clientSecret`, problems),
          scope: parseOptionalString(o.scope, `${at}.oauth.scope`, problems),
          callbackPort: parseOptionalNumber(o.callbackPort, `${at}.oauth.callbackPort`, problems),
          redirectUri: parseOptionalString(o.redirectUri, `${at}.oauth.redirectUri`, problems),
        };
      } else {
        problems.push(`${at}.oauth: must be an object or false`);
      }
    }
    return {
      type: "remote",
      url: interpolate(obj.url, missingEnv),
      headers,
      oauth,
      enabled,
      timeout,
    };
  }

  if (type === "local") {
    if (!Array.isArray(obj.command) || obj.command.length === 0 || !obj.command.every((c) => typeof c === "string")) {
      problems.push(`${at}: local server requires "command" as a non-empty string array`);
      return undefined;
    }
    return {
      type: "local",
      command: (obj.command as string[]).map((c) => interpolate(c, missingEnv)),
      cwd: parseOptionalString(obj.cwd, `${at}.cwd`, problems),
      environment: parseStringRecord(obj.environment, `${at}.environment`, problems, missingEnv),
      enabled,
      timeout,
    };
  }

  problems.push(`${at}: "type" must be "remote" or "local"`);
  return undefined;
}

/** ${VAR} interpolation, matching Dilon's/opencode-style env references. */
export function interpolate(value: string, missingEnv: Set<string>): string {
  return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, name: string) => {
    const resolved = process.env[name];
    if (resolved === undefined) {
      missingEnv.add(name);
      return match; // leave the reference visible so failures are debuggable
    }
    return resolved;
  });
}

function parseStringRecord(
  raw: unknown,
  at: string,
  problems: string[],
  missingEnv: Set<string>,
): Record<string, string> | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    problems.push(`${at}: must be an object of string values`);
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "string") {
      problems.push(`${at}.${key}: must be a string`);
      continue;
    }
    out[key] = interpolate(value, missingEnv);
  }
  return out;
}

function parseOptionalString(raw: unknown, at: string, problems: string[]): string | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "string") {
    problems.push(`${at}: must be a string`);
    return undefined;
  }
  return raw;
}

function parseOptionalBoolean(raw: unknown, at: string, problems: string[]): boolean | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "boolean") {
    problems.push(`${at}: must be a boolean`);
    return undefined;
  }
  return raw;
}

function parseOptionalNumber(raw: unknown, at: string, problems: string[]): number | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    problems.push(`${at}: must be a finite number`);
    return undefined;
  }
  return raw;
}
