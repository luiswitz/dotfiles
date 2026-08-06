import { spawn } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Client, type ClientOptions } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import {
  CallToolResultSchema,
  ListRootsRequestSchema,
  LoggingMessageNotificationSchema,
  ToolListChangedNotificationSchema,
  type Tool as MCPToolDef,
} from "@modelcontextprotocol/sdk/types.js";
import type { LocalServerConfig, McpConfig, RemoteServerConfig, ServerConfig } from "./config.ts";
import { listToolDefs, type PiToolResultContent, convertCallResult } from "./catalog.ts";
import type { AuthStore } from "./auth-store.ts";
import { McpOAuthPendingProvider, McpOAuthProvider, OAUTH_CALLBACK_PATH, randomState } from "./oauth-provider.ts";
import * as oauthCallback from "./oauth-callback.ts";
import { openInBrowser } from "./browser.ts";

/**
 * Server lifecycle manager — a plain-TypeScript port of opencode's MCP service
 * (packages/opencode/src/mcp/index.ts), minus the Effect scaffolding.
 */

export const DEFAULT_TIMEOUT = 30_000;

export type ServerStatus =
  | { status: "connected" }
  | { status: "connecting" }
  | { status: "disconnected" } // lazy startup: configured but not connected yet
  | { status: "disabled" }
  | { status: "failed"; error: string }
  | { status: "needs_auth" }
  | { status: "needs_client_registration"; error: string };

export interface ServerInfo {
  name: string;
  config: ServerConfig;
  status: ServerStatus;
  toolCount: number;
  instructions?: string;
}

type Transport = StdioClientTransport | StreamableHTTPClientTransport | SSEClientTransport;
type TransportWithAuth = StreamableHTTPClientTransport | SSEClientTransport;

export interface ManagerHooks {
  /** Fired when a server's tool list changed or the connection dropped. */
  onToolsChanged?: (serverName: string) => void;
  /** Fired for MCP logging notifications from servers. */
  onServerLog?: (serverName: string, level: string, data: unknown) => void;
  /** Fired when a server reports needs_auth during connect. */
  onNeedsAuth?: (serverName: string) => void;
  /** Fired when a server needs a pre-registered client id. */
  onNeedsClientRegistration?: (serverName: string, error: string) => void;
}

export class McpManager {
  private clients: Record<string, Client> = {};
  private defs: Record<string, MCPToolDef[]> = {};
  private instructions: Record<string, string> = {};
  private statuses: Record<string, ServerStatus> = {};
  private inFlight = new Map<string, Promise<ServerStatus>>();
  private pendingOAuthTransports = new Map<string, { transport: TransportWithAuth; provider?: McpOAuthPendingProvider }>();

  constructor(
    private readonly config: McpConfig,
    private readonly auth: AuthStore,
    private readonly cwd: string,
    private readonly hooks: ManagerHooks = {},
  ) {}

  /** Apply initial statuses; eagerly connect when startup === "eager". */
  async start(): Promise<void> {
    const jobs: Promise<void>[] = [];
    for (const [name, serverConfig] of Object.entries(this.config.servers)) {
      if (serverConfig.enabled === false) {
        this.statuses[name] = { status: "disabled" };
        continue;
      }
      if (this.config.startup === "eager") {
        jobs.push(this.connect(name).then(() => {}));
      } else {
        this.statuses[name] = { status: "disconnected" };
      }
    }
    await Promise.all(jobs);
  }

  serverNames(): string[] {
    return Object.keys(this.config.servers);
  }

  getStatus(name: string): ServerStatus {
    return this.statuses[name] ?? { status: "disabled" };
  }

  allStatus(): Record<string, ServerStatus> {
    const out: Record<string, ServerStatus> = {};
    for (const name of this.serverNames()) out[name] = this.getStatus(name);
    return out;
  }

  listServers(): ServerInfo[] {
    return this.serverNames().map((name) => ({
      name,
      config: this.config.servers[name]!,
      status: this.getStatus(name),
      toolCount: this.defs[name]?.length ?? 0,
      instructions: this.instructions[name],
    }));
  }

  getDefs(name: string): MCPToolDef[] {
    return this.defs[name] ?? [];
  }

  getConnectedInstructions(): { name: string; instructions: string; tools: string[] }[] {
    return Object.entries(this.instructions)
      .filter(([name]) => this.statuses[name]?.status === "connected")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, instructions]) => ({ name, instructions, tools: (this.defs[name] ?? []).map((t) => t.name) }));
  }

  /** Connect a server (idempotent; dedupes concurrent attempts). */
  async connect(name: string): Promise<ServerStatus> {
    const existing = this.inFlight.get(name);
    if (existing) return existing;

    const job = this.createAndStore(name)
      .catch((error) => {
        const status: ServerStatus = { status: "failed", error: errorMessage(error) };
        this.statuses[name] = status;
        return status;
      })
      .finally(() => this.inFlight.delete(name));
    this.inFlight.set(name, job);
    return job;
  }

  /** Connect if not already connected (lazy startup entry point). */
  async ensureConnected(name: string): Promise<Client> {
    const client = this.clients[name];
    if (client && this.statuses[name]?.status === "connected") return client;
    const status = await this.connect(name);
    if (status.status !== "connected") {
      throw new Error(`MCP server "${name}" is not connected (${describeStatus(status)})`);
    }
    return this.clients[name]!;
  }

  async disconnect(name: string): Promise<void> {
    await this.closeClient(name);
    this.statuses[name] = { status: "disconnected" };
  }

  /** Call a tool on a server, lazy-connecting first. Returns pi tool result content. */
  async callTool(
    serverName: string,
    tool: string,
    args: Record<string, unknown>,
    options: { signal?: AbortSignal } = {},
  ): Promise<PiToolResultContent[]> {
    const client = await this.ensureConnected(serverName);
    const serverConfig = this.config.servers[serverName];
    const result = await client.callTool(
      { name: tool, arguments: args },
      CallToolResultSchema,
      {
        resetTimeoutOnProgress: true,
        signal: options.signal,
        timeout: serverConfig?.timeout,
        // The SDK only sends a progress token when this hook is present,
        // enabling timeout resets (opencode parity).
        onprogress: () => {},
      },
    );
    return convertCallResult(result as { isError?: boolean; content?: unknown; structuredContent?: unknown });
  }

  /** Ensure tool defs are cached for all enabled servers (lazy-connects them). */
  async ensureAllDefs(): Promise<void> {
    await Promise.all(
      this.serverNames()
        .filter((name) => this.config.servers[name]?.enabled !== false)
        .map(async (name) => {
          if (this.statuses[name]?.status !== "connected") {
            await this.connect(name);
          }
        }),
    );
  }

  // ── OAuth flow (port of startAuth / authenticate / finishAuth / removeAuth) ──

  async startAuth(name: string): Promise<{ authorizationUrl: string; oauthState: string; client?: Client }> {
    const serverConfig = this.requireRemoteConfig(name);
    if (serverConfig.oauth === false) throw new Error(`MCP server "${name}" has OAuth explicitly disabled`);
    const url = parseUrl(serverConfig.url, name);
    if (!url) throw new Error(`Invalid MCP URL for "${name}"`);

    const oauthConfig = typeof serverConfig.oauth === "object" ? serverConfig.oauth : undefined;
    const effectiveRedirectUri =
      oauthConfig?.redirectUri ??
      (oauthConfig?.callbackPort ? `http://127.0.0.1:${oauthConfig.callbackPort}${OAUTH_CALLBACK_PATH}` : undefined);

    await oauthCallback.ensureRunning(effectiveRedirectUri);

    const oauthState = randomState();
    await this.auth.updateOAuthState(name, oauthState);

    let capturedUrl: URL | undefined;
    const provider = new McpOAuthPendingProvider(
      name,
      serverConfig.url,
      {
        clientId: oauthConfig?.clientId,
        clientSecret: oauthConfig?.clientSecret,
        scope: oauthConfig?.scope,
        redirectUri: effectiveRedirectUri,
      },
      { onRedirect: (redirect) => void (capturedUrl = redirect) },
      this.auth,
    );

    const transport = new StreamableHTTPClientTransport(url, {
      authProvider: provider,
      requestInit: serverConfig.headers ? { headers: serverConfig.headers } : undefined,
    });

    try {
      const client = this.createClient();
      await client.connect(transport);
      await provider.commit();
      return { authorizationUrl: "", oauthState, client };
    } catch (error) {
      if (error instanceof UnauthorizedError && capturedUrl) {
        this.pendingOAuthTransports.set(name, { transport, provider });
        return { authorizationUrl: capturedUrl.toString(), oauthState };
      }
      throw error;
    }
  }

  /**
   * Full interactive auth: starts the flow, opens the browser, waits for the
   * loopback callback, verifies state, and finishes auth. `onAuthorization`
   * receives the URL so callers can display it (headless/remote use).
   */
  async authenticate(name: string, onAuthorization?: (authorizationUrl: string) => void): Promise<ServerStatus> {
    const result = await this.startAuth(name);

    if (!result.authorizationUrl) {
      // Already authorized (stored tokens) — store the connected client.
      const client = result.client;
      if (!client) return { status: "failed", error: "Auth flow returned no client" };
      await this.auth.clearOAuthState(name);
      return this.storeClient(name, client);
    }

    const callbackPromise = oauthCallback.waitForCallback(result.oauthState, name);
    onAuthorization?.(result.authorizationUrl);

    try {
      await openInBrowser(result.authorizationUrl);
    } catch {
      // Browser open failure is non-fatal: the user can open the URL manually.
    }

    const code = await callbackPromise;

    const storedState = await this.auth.getOAuthState(name);
    if (storedState !== result.oauthState) {
      await this.auth.clearOAuthState(name);
      throw new Error("OAuth state mismatch — potential CSRF attack");
    }
    await this.auth.clearOAuthState(name);
    return this.finishAuth(name, code);
  }

  async finishAuth(name: string, authorizationCode: string): Promise<ServerStatus> {
    const pending = this.pendingOAuthTransports.get(name);
    if (!pending) throw new Error(`No pending OAuth flow for MCP server: ${name}`);

    try {
      await pending.transport.finishAuth(authorizationCode);
    } catch (error) {
      return { status: "failed", error: `OAuth completion failed: ${errorMessage(error)}` };
    }

    await pending.provider?.commit();
    await this.auth.clearCodeVerifier(name);
    this.pendingOAuthTransports.delete(name);

    return this.connect(name);
  }

  async removeAuth(name: string): Promise<void> {
    await this.auth.remove(name);
    oauthCallback.cancelPending(name);
    this.pendingOAuthTransports.delete(name);
  }

  async getAuthStatus(name: string): Promise<"authenticated" | "expired" | "not_authenticated"> {
    const serverConfig = this.config.servers[name];
    if (!serverConfig || serverConfig.type !== "remote") return "not_authenticated";
    const entry = await this.auth.getForUrl(name, serverConfig.url);
    if (!entry?.tokens) return "not_authenticated";
    if (entry.tokens.expiresAt && entry.tokens.expiresAt < Date.now() / 1000) return "expired";
    return "authenticated";
  }

  // ── Connection lifecycle ──

  private async createAndStore(name: string): Promise<ServerStatus> {
    const serverConfig = this.config.servers[name];
    if (!serverConfig) {
      const status: ServerStatus = { status: "failed", error: `No MCP server named "${name}" in config` };
      this.statuses[name] = status;
      return status;
    }
    if (serverConfig.enabled === false) {
      this.statuses[name] = { status: "disabled" };
      return this.statuses[name];
    }

    this.statuses[name] = { status: "connecting" };
    const { client, status } = await this.create(name, serverConfig);
    this.statuses[name] = status;
    if (!client) {
      await this.closeClient(name);
      return status;
    }
    return this.storeClient(name, client);
  }

  private async create(
    name: string,
    serverConfig: ServerConfig,
  ): Promise<{ client?: Client; status: ServerStatus }> {
    const result =
      serverConfig.type === "remote"
        ? await this.connectRemote(name, serverConfig)
        : await this.connectLocal(name, serverConfig);
    if (!result.client) return result;

    try {
      const defs = result.client.getServerCapabilities()?.tools
        ? await listToolDefs(result.client, serverConfig.timeout ?? DEFAULT_TIMEOUT)
        : [];
      this.defs[name] = defs;
      const instructions = result.client.getInstructions()?.trim();
      if (instructions) this.instructions[name] = instructions;
      else delete this.instructions[name];
      return result;
    } catch (error) {
      await result.client.close().catch(() => {});
      return { status: { status: "failed", error: `Failed to list tools: ${errorMessage(error)}` } };
    }
  }

  private async connectRemote(
    name: string,
    serverConfig: RemoteServerConfig,
  ): Promise<{ client?: Client; status: ServerStatus }> {
    const url = parseUrl(serverConfig.url, name);
    if (!url) return { status: { status: "failed", error: `Invalid MCP URL for "${name}"` } };

    const oauthDisabled = serverConfig.oauth === false;
    const oauthConfig = typeof serverConfig.oauth === "object" ? serverConfig.oauth : undefined;

    let authProvider: McpOAuthProvider | undefined;
    if (!oauthDisabled) {
      authProvider = new McpOAuthProvider(
        name,
        serverConfig.url,
        {
          clientId: oauthConfig?.clientId,
          clientSecret: oauthConfig?.clientSecret,
          scope: oauthConfig?.scope,
          callbackPort: oauthConfig?.callbackPort,
          redirectUri: oauthConfig?.redirectUri,
        },
        { onRedirect: async () => {} },
        this.auth,
      );
    }

    // StreamableHTTP first, SSE fallback (opencode parity).
    const transports: TransportWithAuth[] = [
      new StreamableHTTPClientTransport(url, {
        authProvider,
        requestInit: serverConfig.headers ? { headers: serverConfig.headers } : undefined,
      }),
      new SSEClientTransport(url, {
        authProvider,
        requestInit: serverConfig.headers ? { headers: serverConfig.headers } : undefined,
      }),
    ];

    let lastStatus: ServerStatus | undefined;
    for (const transport of transports) {
      try {
        const client = await this.connectTransport(transport, serverConfig.timeout ?? DEFAULT_TIMEOUT);
        return { client, status: { status: "connected" } };
      } catch (error) {
        const isAuthError =
          error instanceof UnauthorizedError || (authProvider !== undefined && errorMessage(error).includes("OAuth"));

        if (isAuthError) {
          const message = errorMessage(error);
          if (message.includes("registration") || message.includes("client_id")) {
            lastStatus = {
              status: "needs_client_registration",
              error: "Server does not support dynamic client registration. Provide oauth.clientId in config.",
            };
            this.hooks.onNeedsClientRegistration?.(name, lastStatus.error);
          } else {
            this.pendingOAuthTransports.set(name, { transport });
            lastStatus = { status: "needs_auth" };
            this.hooks.onNeedsAuth?.(name);
          }
          break; // auth errors: don't try the other transport
        }

        lastStatus = { status: "failed", error: errorMessage(error) };
      }
    }

    return { status: lastStatus ?? { status: "failed", error: "Unknown error" } };
  }

  private async connectLocal(
    name: string,
    serverConfig: LocalServerConfig,
  ): Promise<{ client?: Client; status: ServerStatus }> {
    const [cmd, ...args] = serverConfig.command;
    if (!cmd) return { status: { status: "failed", error: `MCP server "${name}" has an empty command` } };

    const cwd = serverConfig.cwd ? resolveCwd(this.cwd, serverConfig.cwd) : this.cwd;
    const transport = new StdioClientTransport({
      command: cmd,
      args,
      cwd,
      stderr: "pipe",
      env: { ...process.env, ...serverConfig.environment } as Record<string, string>,
    });

    try {
      const client = await this.connectTransport(transport, serverConfig.timeout ?? DEFAULT_TIMEOUT);
      return { client, status: { status: "connected" } };
    } catch (error) {
      return { status: { status: "failed", error: errorMessage(error) } };
    }
  }

  /** Connect with timeout; close the transport on failure. */
  private async connectTransport(transport: Transport, timeout: number): Promise<Client> {
    const client = this.createClient();
    try {
      await withTimeout(client.connect(transport), timeout, () => `MCP connect timed out after ${timeout}ms`);
      return client;
    } catch (error) {
      await transport.close().catch(() => {});
      throw error;
    }
  }

  private createClient(): Client {
    const options: ClientOptions = { capabilities: { roots: {} } };
    const client = new Client({ name: "pi-mcp", version: "0.1.0" }, options);
    client.setRequestHandler(ListRootsRequestSchema, () =>
      Promise.resolve({ roots: [{ uri: pathToFileURL(this.cwd).href }] }),
    );
    return client;
  }

  private async storeClient(name: string, client: Client): Promise<ServerStatus> {
    const previous = this.clients[name];
    this.clients[name] = client;

    if (this.defs[name] === undefined) {
      // Auth path: client connected but defs not listed yet.
      const serverConfig = this.config.servers[name];
      if (client.getServerCapabilities()?.tools) {
        this.defs[name] = await listToolDefs(client, serverConfig?.timeout ?? DEFAULT_TIMEOUT);
      } else {
        this.defs[name] = [];
      }
      const instructions = client.getInstructions()?.trim();
      if (instructions) this.instructions[name] = instructions;
    }

    this.watch(name, client);
    this.statuses[name] = { status: "connected" };
    if (previous && previous !== client) await previous.close().catch(() => {});
    return this.statuses[name];
  }

  private watch(name: string, client: Client): void {
    client.onclose = () => {
      if (this.clients[name] !== client) return;
      delete this.clients[name];
      delete this.defs[name];
      delete this.instructions[name];
      this.statuses[name] = { status: "failed", error: "Connection closed" };
      this.hooks.onToolsChanged?.(name);
    };

    client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
      this.hooks.onServerLog?.(name, notification.params.level, notification.params.data);
    });

    if (!client.getServerCapabilities()?.tools) return;
    client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
      if (this.clients[name] !== client || this.statuses[name]?.status !== "connected") return;
      const serverConfig = this.config.servers[name];
      try {
        const listed = await listToolDefs(client, serverConfig?.timeout ?? DEFAULT_TIMEOUT);
        if (this.clients[name] !== client || this.statuses[name]?.status !== "connected") return;
        this.defs[name] = listed;
        this.hooks.onToolsChanged?.(name);
      } catch {
        // Keep stale defs on refresh failure (no tool churn).
      }
    });
  }

  private async closeClient(name: string): Promise<void> {
    const client = this.clients[name];
    delete this.clients[name];
    delete this.defs[name];
    delete this.instructions[name];
    if (client) await client.close().catch(() => {});
  }

  private requireRemoteConfig(name: string): RemoteServerConfig {
    const serverConfig = this.config.servers[name];
    if (!serverConfig) throw new Error(`No MCP server named "${name}" in config`);
    if (serverConfig.type !== "remote") throw new Error(`MCP server "${name}" is not a remote server`);
    return serverConfig;
  }

  /** Graceful shutdown: kill stdio process trees, close clients, stop callback server. */
  async shutdown(): Promise<void> {
    const clients = Object.values(this.clients);
    this.clients = {};
    this.defs = {};
    this.instructions = {};
    await Promise.all(
      clients.map(async (client) => {
        const pid = client.transport instanceof StdioClientTransport ? client.transport.pid : null;
        if (typeof pid === "number") {
          for (const childPid of await descendants(pid)) {
            try {
              process.kill(childPid, "SIGTERM");
            } catch {}
          }
        }
        await client.close().catch(() => {});
      }),
    );
    this.pendingOAuthTransports.clear();
    await oauthCallback.stop().catch(() => {});
  }
}

export function describeStatus(status: ServerStatus): string {
  switch (status.status) {
    case "connected":
      return "connected";
    case "connecting":
      return "connecting…";
    case "disconnected":
      return "not connected (lazy)";
    case "disabled":
      return "disabled";
    case "failed":
      return `failed: ${status.error}`;
    case "needs_auth":
      return "needs auth (run /mcp auth)";
    case "needs_client_registration":
      return status.error;
  }
}

function parseUrl(value: string, name: string): URL | undefined {
  if (!URL.canParse(value)) return undefined;
  return new URL(value);
}

function resolveCwd(base: string, configured: string): string {
  return path.resolve(base, configured);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function withTimeout<T>(promise: Promise<T>, ms: number, message?: () => string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message?.() ?? `Timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Recursively collect descendant pids (non-Windows; opencode parity). */
async function descendants(pid: number): Promise<number[]> {
  if (process.platform === "win32") return [];
  const pids: number[] = [];
  const queue = [pid];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index]!;
    try {
      const output = await execText("pgrep", ["-P", String(current)]);
      for (const token of output.split("\n")) {
        const childPid = parseInt(token, 10);
        if (!Number.isNaN(childPid) && !pids.includes(childPid)) {
          pids.push(childPid);
          queue.push(childPid);
        }
      }
    } catch {
      // pgrep exits 1 when no children — fine
    }
  }
  return pids;
}

function execText(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve(out) : reject(new Error(`exit ${code}`))));
  });
}
