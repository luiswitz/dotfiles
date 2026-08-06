/**
 * Fixture MCP stdio server for e2e tests. Spawned as a child process by the
 * manager's StdioClientTransport.
 *
 * Run: node --import tsx test/fixtures/echo-server.ts
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer(
  { name: "echo-fixture", version: "1.0.0" },
  { instructions: "Echo fixture server for pi-mcp tests." },
);

server.registerTool(
  "echo",
  {
    description: "Echo back the input text",
    inputSchema: { text: z.string().describe("Text to echo") },
  },
  async ({ text }) => ({
    content: [{ type: "text", text: `echo: ${text}` }],
  }),
);

server.registerTool(
  "fail",
  { description: "Always returns an error result", inputSchema: {} },
  async () => ({
    isError: true,
    content: [{ type: "text", text: "intentional failure" }],
  }),
);

await server.connect(new StdioServerTransport());
