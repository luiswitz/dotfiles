import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { interpolate, loadConfig } from "../src/config.ts";

test("interpolate replaces ${VAR} and records missing vars", () => {
  process.env.PI_MCP_TEST_TOKEN = "secret-123";
  const missing = new Set<string>();

  assert.equal(interpolate("Bearer ${PI_MCP_TEST_TOKEN}", missing), "Bearer secret-123");
  assert.equal(missing.size, 0);

  assert.equal(interpolate("Bearer ${PI_MCP_UNSET_VAR}", missing), "Bearer ${PI_MCP_UNSET_VAR}");
  assert.deepEqual([...missing], ["PI_MCP_UNSET_VAR"]);
});

test("loadConfig parses opencode-style servers", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi-mcp-config-"));
  const file = join(dir, "mcp.json");
  process.env.PI_MCP_TEST_HEADER = "abc";
  await writeFile(
    file,
    JSON.stringify({
      mcp: {
        toolMode: "proxy",
        startup: "lazy",
        servers: {
          remote: {
            type: "remote",
            url: "https://example.com/mcp",
            headers: { Authorization: "Bearer ${PI_MCP_TEST_HEADER}" },
            oauth: false,
            enabled: true,
            timeout: 60000,
          },
          local: {
            type: "local",
            command: ["npx", "-y", "some-server"],
            environment: { KEY: "value" },
          },
          oauthServer: {
            type: "remote",
            url: "https://oauth.example.com/mcp",
            oauth: { clientId: "id", scope: "read" },
          },
        },
      },
    }),
  );

  const { config, missingEnv, problems } = await loadConfig(file);
  assert.deepEqual(problems, []);
  assert.deepEqual(missingEnv, []);
  assert.equal(config.toolMode, "proxy");
  assert.equal(config.startup, "lazy");

  const remote = config.servers.remote;
  assert.equal(remote?.type, "remote");
  assert.equal(remote.type === "remote" && remote.headers?.Authorization, "Bearer abc");
  assert.equal(remote.type === "remote" && remote.oauth, false);
  assert.equal(remote?.timeout, 60000);

  const local = config.servers.local;
  assert.equal(local?.type, "local");
  assert.deepEqual(local?.type === "local" && local.command, ["npx", "-y", "some-server"]);

  const oauthServer = config.servers.oauthServer;
  assert.equal(
    oauthServer?.type === "remote" && typeof oauthServer.oauth === "object" && oauthServer.oauth.clientId,
    "id",
  );

  await rm(dir, { recursive: true, force: true });
});

test("project config overrides global per-server", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi-mcp-config-"));
  const globalFile = join(dir, "global.json");
  const projectFile = join(dir, "project.json");

  await writeFile(
    globalFile,
    JSON.stringify({
      mcp: {
        toolMode: "proxy",
        servers: {
          shared: { type: "remote", url: "https://global.example.com/mcp" },
          globalOnly: { type: "local", command: ["a"] },
        },
      },
    }),
  );
  await writeFile(
    projectFile,
    JSON.stringify({
      mcp: {
        toolMode: "direct",
        servers: {
          shared: { type: "remote", url: "https://project.example.com/mcp" },
          projectOnly: { type: "local", command: ["b"] },
        },
      },
    }),
  );

  const { config, problems } = await loadConfig(globalFile, projectFile);
  assert.deepEqual(problems, []);
  assert.equal(config.toolMode, "direct");
  assert.equal(
    config.servers.shared?.type === "remote" && config.servers.shared.url,
    "https://project.example.com/mcp",
  );
  assert.ok(config.servers.globalOnly);
  assert.ok(config.servers.projectOnly);

  await rm(dir, { recursive: true, force: true });
});

test("ignores foreign config keys (e.g. mcpServers) and reports bad shapes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi-mcp-config-"));
  const foreign = join(dir, "foreign.json");
  const bad = join(dir, "bad.json");

  await writeFile(foreign, JSON.stringify({ mcpServers: { semble: { command: "uvx" } } }));
  const foreignResult = await loadConfig(foreign);
  assert.deepEqual(foreignResult.problems, []);
  assert.deepEqual(foreignResult.config.servers, {});

  await writeFile(bad, JSON.stringify({ mcp: { servers: { broken: { type: "remote" } } } }));
  const badResult = await loadConfig(bad);
  assert.equal(badResult.problems.length, 1);
  assert.match(badResult.problems[0]!, /url/);

  await rm(dir, { recursive: true, force: true });
});
