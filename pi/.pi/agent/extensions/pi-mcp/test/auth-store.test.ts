import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AuthStore } from "../src/auth-store.ts";

test("AuthStore round-trips entries with URL binding", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi-mcp-auth-"));
  const file = join(dir, "mcp-auth.json");
  const store = new AuthStore(file);

  await store.updateTokens("server", { accessToken: "tok", refreshToken: "ref", expiresAt: 9999999999 }, "https://a.example.com/mcp");
  await store.updateClientInfo("server", { clientId: "cid" }, "https://a.example.com/mcp");
  await store.updateCodeVerifier("server", "verifier");

  const entry = await store.get("server");
  assert.equal(entry?.tokens?.accessToken, "tok");
  assert.equal(entry?.clientInfo?.clientId, "cid");
  assert.equal(entry?.codeVerifier, "verifier");
  assert.equal(entry?.serverUrl, "https://a.example.com/mcp");

  // URL binding: same name, different URL → no credentials
  assert.equal(await store.getForUrl("server", "https://evil.example.com/mcp"), undefined);
  assert.equal((await store.getForUrl("server", "https://a.example.com/mcp"))?.tokens?.accessToken, "tok");

  // File permissions are 0600
  const mode = (await stat(file)).mode & 0o777;
  assert.equal(mode, 0o600);

  await store.clearCodeVerifier("server");
  assert.equal((await store.get("server"))?.codeVerifier, undefined);

  await store.remove("server");
  assert.equal(await store.get("server"), undefined);

  await rm(dir, { recursive: true, force: true });
});

test("AuthStore tolerates concurrent mutations", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi-mcp-auth-"));
  const file = join(dir, "mcp-auth.json");
  const store = new AuthStore(file);

  await Promise.all(
    Array.from({ length: 10 }, (_, index) =>
      store.updateTokens(`server-${index}`, { accessToken: `tok-${index}` }, "https://a.example.com/mcp"),
    ),
  );

  const raw = JSON.parse(await readFile(file, "utf8"));
  assert.equal(Object.keys(raw).length, 10);

  await rm(dir, { recursive: true, force: true });
});
