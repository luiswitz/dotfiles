import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * OAuth credential store — port of opencode's McpAuth service.
 * Persists to <agentDir>/mcp-auth.json with 0600 permissions.
 * Entries are URL-bound: credentials are only returned for the server URL
 * they were issued against.
 */

export interface Tokens {
  accessToken: string;
  refreshToken?: string;
  /** Epoch seconds. */
  expiresAt?: number;
  scope?: string;
}

export interface ClientInfo {
  clientId: string;
  clientSecret?: string;
  clientIdIssuedAt?: number;
  clientSecretExpiresAt?: number;
}

export interface AuthEntry {
  tokens?: Tokens;
  clientInfo?: ClientInfo;
  codeVerifier?: string;
  oauthState?: string;
  serverUrl?: string;
}

type AuthData = Record<string, AuthEntry>;

/** Simple promise queue — serializes read-modify-write cycles in-process. */
export class AuthStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filepath: string) {}

  async all(): Promise<AuthData> {
    return this.read();
  }

  async get(mcpName: string): Promise<AuthEntry | undefined> {
    return (await this.read())[mcpName];
  }

  /** Only returns the entry if it was issued for this exact server URL. */
  async getForUrl(mcpName: string, serverUrl: string): Promise<AuthEntry | undefined> {
    const entry = await this.get(mcpName);
    if (!entry?.serverUrl || entry.serverUrl !== serverUrl) return undefined;
    return entry;
  }

  async set(mcpName: string, entry: AuthEntry, serverUrl?: string): Promise<void> {
    await this.mutate((data) => {
      data[mcpName] = serverUrl ? { ...entry, serverUrl } : entry;
    });
  }

  async remove(mcpName: string): Promise<void> {
    await this.mutate((data) => {
      delete data[mcpName];
    });
  }

  async updateTokens(mcpName: string, tokens: Tokens, serverUrl?: string): Promise<void> {
    await this.updateField(mcpName, "tokens", tokens, serverUrl);
  }

  async updateClientInfo(mcpName: string, clientInfo: ClientInfo, serverUrl?: string): Promise<void> {
    await this.updateField(mcpName, "clientInfo", clientInfo, serverUrl);
  }

  async updateCodeVerifier(mcpName: string, codeVerifier: string): Promise<void> {
    await this.updateField(mcpName, "codeVerifier", codeVerifier);
  }

  async clearCodeVerifier(mcpName: string): Promise<void> {
    await this.clearField(mcpName, "codeVerifier");
  }

  async updateOAuthState(mcpName: string, oauthState: string): Promise<void> {
    await this.updateField(mcpName, "oauthState", oauthState);
  }

  async getOAuthState(mcpName: string): Promise<string | undefined> {
    return (await this.get(mcpName))?.oauthState;
  }

  async clearOAuthState(mcpName: string): Promise<void> {
    await this.clearField(mcpName, "oauthState");
  }

  private async updateField<K extends keyof AuthEntry>(
    mcpName: string,
    field: K,
    value: NonNullable<AuthEntry[K]>,
    serverUrl?: string,
  ): Promise<void> {
    await this.mutate((data) => {
      const entry = data[mcpName] ?? {};
      entry[field] = value;
      if (serverUrl) entry.serverUrl = serverUrl;
      data[mcpName] = entry;
    });
  }

  private async clearField(mcpName: string, field: keyof AuthEntry): Promise<void> {
    await this.mutate((data) => {
      const entry = data[mcpName];
      if (!entry) return;
      delete entry[field];
      data[mcpName] = entry;
    });
  }

  private async read(): Promise<AuthData> {
    try {
      const text = await readFile(this.filepath, "utf8");
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
      return parsed as AuthData;
    } catch {
      return {};
    }
  }

  private mutate(update: (data: AuthData) => void): Promise<void> {
    const run = this.queue.then(async () => {
      const data = await this.read();
      update(data);
      await mkdir(dirname(this.filepath), { recursive: true });
      await writeFile(this.filepath, JSON.stringify(data, null, 2), { mode: 0o600 });
    });
    this.queue = run.catch(() => {});
    return run;
  }
}
