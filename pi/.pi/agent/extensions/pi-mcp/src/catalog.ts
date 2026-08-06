import { createHash } from "node:crypto";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  ListToolsResultSchema,
  ToolSchema,
  type Tool as MCPToolDef,
} from "@modelcontextprotocol/sdk/types.js";

/** Port of opencode's catalog helpers (no Effect, plain promises). */

const MAX_LIST_PAGES = 1_000;
export const MAX_TOOL_NAME = 64;

// Tolerate servers whose outputSchema fails SDK validation (opencode parity).
const TolerantListToolsResultSchema = ListToolsResultSchema.extend({
  tools: ToolSchema.omit({ outputSchema: true }).array(),
});

export async function paginate<T, R extends { nextCursor?: string }>(
  list: (cursor?: string) => Promise<R>,
  items: (result: R) => T[],
): Promise<T[]> {
  const result: T[] = [];
  const cursors = new Set<string>();
  let cursor: string | undefined;

  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const current = await list(cursor);
    result.push(...items(current));
    if (current.nextCursor === undefined) return result;
    if (cursors.has(current.nextCursor)) {
      throw new Error(`MCP list returned duplicate cursor: ${current.nextCursor}`);
    }
    cursors.add(current.nextCursor);
    cursor = current.nextCursor;
  }

  throw new Error(`MCP list exceeded ${MAX_LIST_PAGES} pages`);
}

/** Paginated tools/list, tolerating servers with broken outputSchema validation. */
export async function listToolDefs(client: Client, timeout: number): Promise<MCPToolDef[]> {
  return paginate(
    async (cursor) => {
      const params = cursor === undefined ? undefined : { cursor };
      try {
        return await client.listTools(params, { timeout });
      } catch (error) {
        if (!(error instanceof Error) || !isOutputSchemaValidationError(error)) throw error;
        // Tolerate servers whose outputSchema fails SDK validation: re-request
        // with a schema that omits outputSchema (matches opencode's behavior).
        return client.request(
          { method: "tools/list", params },
          TolerantListToolsResultSchema as typeof ListToolsResultSchema,
          { timeout },
        );
      }
    },
    (result) => result.tools,
  );
}

function isOutputSchemaValidationError(error: Error): boolean {
  return /can't resolve reference|resolves to more than one schema|outputSchema|schema.*reference|reference.*schema/i.test(
    error.message,
  );
}

export const sanitize = (value: string): string => value.replace(/[^a-zA-Z0-9_-]/g, "_");

/**
 * Stable pi tool name for an MCP tool: mcp_<server>_<tool>, sanitized and
 * capped at 64 chars with a hash suffix so names stay constant across reconnects.
 */
export function toolName(serverName: string, mcpToolName: string): string {
  const full = `mcp_${sanitize(serverName)}_${sanitize(mcpToolName)}`;
  if (full.length <= MAX_TOOL_NAME) return full;
  const hash = createHash("sha256").update(full).digest("hex").slice(0, 8);
  return `${full.slice(0, MAX_TOOL_NAME - 9)}_${hash}`;
}

export interface PiTextContent {
  type: "text";
  text: string;
}
/** Matches pi-ai's ImageContent (flat shape). */
export interface PiImageContent {
  type: "image";
  data: string;
  mimeType: string;
}
export type PiToolResultContent = PiTextContent | PiImageContent;

/**
 * Convert an MCP CallToolResult into pi tool result content.
 * Throws on isError (pi marks tool results as errors via thrown exceptions).
 */
export function convertCallResult(result: {
  isError?: boolean;
  content?: unknown;
  structuredContent?: unknown;
}): PiToolResultContent[] {
  const content = Array.isArray(result.content) ? result.content : [];

  if (result.isError) {
    const message = content
      .flatMap((item) =>
        typeof item === "object" && item !== null && (item as { type?: string }).type === "text"
          ? [String((item as { text?: unknown }).text ?? "")]
          : [],
      )
      .filter((text) => text.trim())
      .join("\n\n");
    throw new Error(message || "MCP tool returned an error");
  }

  const out: PiToolResultContent[] = [];
  for (const item of content) {
    if (typeof item !== "object" || item === null) continue;
    const typed = item as {
      type?: string;
      text?: unknown;
      data?: unknown;
      mimeType?: unknown;
      resource?: { text?: unknown; blob?: unknown; mimeType?: unknown; uri?: unknown };
      uri?: unknown;
    };
    switch (typed.type) {
      case "text":
        out.push({ type: "text", text: String(typed.text ?? "") });
        break;
      case "image":
        if (typeof typed.data === "string") {
          out.push({
            type: "image",
            data: typed.data,
            mimeType: typeof typed.mimeType === "string" ? typed.mimeType : "image/png",
          });
        }
        break;
      case "resource": {
        const resource = typed.resource;
        if (!resource) break;
        if (typeof resource.text === "string") {
          const uri = typeof resource.uri === "string" ? resource.uri : undefined;
          out.push({
            type: "text",
            text: uri ? `[resource ${uri}]\n${resource.text}` : resource.text,
          });
        } else if (typeof resource.blob === "string") {
          const mime = typeof resource.mimeType === "string" ? resource.mimeType : "application/octet-stream";
          const uri = typeof resource.uri === "string" ? resource.uri : "unknown";
          out.push({ type: "text", text: `[resource ${uri}: base64 ${mime}, ${resource.blob.length} chars]` });
        }
        break;
      }
      case "resource_link":
        out.push({ type: "text", text: `[resource link ${String(typed.uri ?? "")}]` });
        break;
      default:
        out.push({ type: "text", text: JSON.stringify(item) });
    }
  }

  // Fall back to structuredContent when the server returned no content items
  // (same behavior as opencode).
  if (out.length === 0 && result.structuredContent !== undefined && result.structuredContent !== null) {
    out.push({ type: "text", text: JSON.stringify(result.structuredContent) });
  }
  if (out.length === 0) {
    out.push({ type: "text", text: "(no output)" });
  }
  return out;
}
