import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { createConnection } from "node:net";
import { OAUTH_CALLBACK_PATH, OAUTH_CALLBACK_PORT, parseRedirectUri } from "./oauth-provider.ts";

/** Port of opencode's McpOAuthCallback loopback server. */

const OAUTH_CALLBACK_HOST = "127.0.0.1";
const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

interface PendingAuth {
  resolve: (code: string) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

let currentPort = OAUTH_CALLBACK_PORT;
let currentPath = OAUTH_CALLBACK_PATH;
let server: Server | undefined;
const pendingAuths = new Map<string, PendingAuth>();
// Reverse index: mcpName → oauthState (opencode parity).
const mcpNameToState = new Map<string, string>();

export async function ensureRunning(redirectUri?: string): Promise<void> {
  const { port, path } = parseRedirectUri(redirectUri);

  if (server && (currentPort !== port || currentPath !== path)) {
    await stop();
  }
  if (server) return;

  if (await isPortInUse(port)) return; // another pi instance owns it

  currentPort = port;
  currentPath = path;
  server = createServer(handleRequest);
  await new Promise<void>((resolve, reject) => {
    server!.listen(currentPort, OAUTH_CALLBACK_HOST, () => resolve());
    server!.on("error", reject);
  });
}

export function waitForCallback(oauthState: string, mcpName?: string): Promise<string> {
  if (mcpName) mcpNameToState.set(mcpName, oauthState);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingAuths.has(oauthState)) {
        pendingAuths.delete(oauthState);
        if (mcpName) mcpNameToState.delete(mcpName);
        reject(new Error("OAuth callback timeout — authorization took too long"));
        stopIfIdle();
      }
    }, CALLBACK_TIMEOUT_MS);
    pendingAuths.set(oauthState, { resolve, reject, timeout });
  });
}

export function cancelPending(mcpName: string): void {
  const oauthState = mcpNameToState.get(mcpName);
  const key = oauthState ?? mcpName;
  const pending = pendingAuths.get(key);
  if (pending) {
    clearTimeout(pending.timeout);
    pendingAuths.delete(key);
    mcpNameToState.delete(mcpName);
    pending.reject(new Error("Authorization cancelled"));
    stopIfIdle();
  }
}

export async function stop(): Promise<void> {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
  }
  for (const pending of pendingAuths.values()) {
    clearTimeout(pending.timeout);
    pending.reject(new Error("OAuth callback server stopped"));
  }
  pendingAuths.clear();
  mcpNameToState.clear();
}

async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection(port, OAUTH_CALLBACK_HOST);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });
}

function stopIfIdle(): void {
  if (pendingAuths.size > 0 || !server) return;
  server.close();
  server = undefined;
}

function cleanupStateIndex(oauthState: string): void {
  for (const [name, state] of mcpNameToState) {
    if (state === oauthState) {
      mcpNameToState.delete(name);
      break;
    }
  }
}

function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url || "/", `http://localhost:${currentPort}`);

  if (url.pathname !== currentPath) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (!state) {
    sendPage(res, 400, "Authorization failed", "Missing required state parameter — potential CSRF attack", false);
    return;
  }

  if (error) {
    const message = errorDescription || error;
    const pending = pendingAuths.get(state);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingAuths.delete(state);
      cleanupStateIndex(state);
      pending.reject(new Error(message));
    }
    sendPage(res, 200, "Authorization failed", message, false);
    stopIfIdle();
    return;
  }

  if (!code) {
    sendPage(res, 400, "Authorization failed", "No authorization code provided", false);
    return;
  }

  const pending = pendingAuths.get(state);
  if (!pending) {
    sendPage(res, 400, "Authorization failed", "Invalid or expired state parameter — potential CSRF attack", false);
    return;
  }

  clearTimeout(pending.timeout);
  pendingAuths.delete(state);
  cleanupStateIndex(state);
  pending.resolve(code);

  sendPage(res, 200, "Authorization successful", "You can close this window and return to pi.", true);
  stopIfIdle();
}

function sendPage(res: ServerResponse, status: number, title: string, message: string, success: boolean): void {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!DOCTYPE html>
<html>
<head><title>${escapeHtml(title)} — pi-mcp</title></head>
<body style="font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 80vh; margin: 0; background: #1a1b26; color: #c0caf5;">
  <div style="text-align: center; max-width: 32rem;">
    <div style="font-size: 3rem;">${success ? "✓" : "✗"}</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`);
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
