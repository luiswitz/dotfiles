import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpManager } from "../src/manager.ts";
import { AuthStore } from "../src/auth-store.ts";
import type { McpConfig } from "../src/config.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, "fixtures", "echo-server.ts");

async function makeManager(config: McpConfig): Promise<{ manager: McpManager; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), "pi-mcp-e2e-"));
  const auth = new AuthStore(join(dir, "mcp-auth.json"));
  const manager = new McpManager(config, auth, process.cwd());
  return {
    manager,
    cleanup: async () => {
      await manager.shutdown();
      await rm(dir, { recursive: true, force: true });
    },
  };
}

const lazyConfig: McpConfig = {
  toolMode: "proxy",
  startup: "lazy",
  servers: {
    echo: {
      type: "local",
      command: ["node", "--import", "tsx", fixture],
      timeout: 30_000,
    },
  },
};

test("lazy startup: not connected until first use, then connects and calls", async () => {
  const { manager, cleanup } = await makeManager(lazyConfig);
  try {
    await manager.start();
    assert.equal(manager.getStatus("echo").status, "disconnected");

    const result = await manager.callTool("echo", "echo", { text: "hello" });
    assert.deepEqual(result, [{ type: "text", text: "echo: hello" }]);

    assert.equal(manager.getStatus("echo").status, "connected");
    assert.equal(manager.getDefs("echo").length, 2);
    assert.equal(manager.getConnectedInstructions()[0]?.instructions, "Echo fixture server for pi-mcp tests.");
  } finally {
    await cleanup();
  }
});

test("isError results throw with the server's message", async () => {
  const { manager, cleanup } = await makeManager(lazyConfig);
  try {
    await manager.start();
    await assert.rejects(manager.callTool("echo", "fail", {}), /intentional failure/);
  } finally {
    await cleanup();
  }
});

test("eager startup connects during start()", async () => {
  const { manager, cleanup } = await makeManager({ ...lazyConfig, startup: "eager" });
  try {
    await manager.start();
    assert.equal(manager.getStatus("echo").status, "connected");
    const names = manager.getDefs("echo").map((def) => def.name);
    assert.deepEqual(names.sort(), ["echo", "fail"]);
  } finally {
    await cleanup();
  }
});

test("failed servers report status without hanging", async () => {
  const { manager, cleanup } = await makeManager({
    toolMode: "proxy",
    startup: "eager",
    servers: {
      missing: { type: "local", command: ["definitely-not-a-real-command-xyz"], timeout: 5_000 },
    },
  });
  try {
    await manager.start();
    const status = manager.getStatus("missing");
    assert.equal(status.status, "failed");
  } finally {
    await cleanup();
  }
});
