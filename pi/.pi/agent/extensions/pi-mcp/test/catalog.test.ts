import { test } from "node:test";
import assert from "node:assert/strict";
import { convertCallResult, paginate, sanitize, toolName, MAX_TOOL_NAME } from "../src/catalog.ts";

test("sanitize replaces invalid chars", () => {
  assert.equal(sanitize("my server!"), "my_server_");
  assert.equal(sanitize("cf-portal"), "cf-portal");
});

test("toolName builds stable mcp_ prefixed names with 64-char cap", () => {
  assert.equal(toolName("executor", "run"), "mcp_executor_run");
  assert.equal(toolName("my server", "do thing"), "mcp_my_server_do_thing");

  const long = toolName("a-very-long-server-name", "a-very-long-tool-name-that-keeps-going-and-going");
  assert.ok(long.length <= MAX_TOOL_NAME);
  // Deterministic hash suffix
  assert.equal(long, toolName("a-very-long-server-name", "a-very-long-tool-name-that-keeps-going-and-going"));
});

test("paginate follows cursors and detects duplicates", async () => {
  const pages = [
    { items: ["a"], nextCursor: "c1" },
    { items: ["b"], nextCursor: "c2" },
    { items: ["c"] },
  ];
  let index = 0;
  const result = await paginate(
    async () => pages[index++]!,
    (page) => page.items,
  );
  assert.deepEqual(result, ["a", "b", "c"]);

  let dupCalls = 0;
  await assert.rejects(
    paginate(
      async () => {
        dupCalls++;
        return { items: ["x"], nextCursor: "same" };
      },
      (page) => page.items,
    ),
    /duplicate cursor/,
  );
});

test("convertCallResult maps text/image/resource and throws on isError", () => {
  assert.deepEqual(convertCallResult({ content: [{ type: "text", text: "hello" }] }), [
    { type: "text", text: "hello" },
  ]);

  assert.deepEqual(
    convertCallResult({ content: [{ type: "image", data: "aGk=", mimeType: "image/png" }] }),
    [{ type: "image", data: "aGk=", mimeType: "image/png" }],
  );

  assert.deepEqual(
    convertCallResult({
      content: [{ type: "resource", resource: { uri: "file:///x", text: "body" } }],
    }),
    [{ type: "text", text: "[resource file:///x]\nbody" }],
  );

  assert.deepEqual(convertCallResult({ content: [], structuredContent: { ok: true } }), [
    { type: "text", text: '{"ok":true}' },
  ]);

  assert.throws(
    () => convertCallResult({ isError: true, content: [{ type: "text", text: "boom" }] }),
    /boom/,
  );
});
