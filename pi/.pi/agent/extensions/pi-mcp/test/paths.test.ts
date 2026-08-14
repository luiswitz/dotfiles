import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getExplicitProjectConfigPath } from "../src/paths.ts";

const original = process.env.PI_MCP_PROJECT_CONFIG;

afterEach(() => {
  if (original === undefined) delete process.env.PI_MCP_PROJECT_CONFIG;
  else process.env.PI_MCP_PROJECT_CONFIG = original;
});

describe("getExplicitProjectConfigPath", () => {
  it("returns undefined when no override is configured", () => {
    delete process.env.PI_MCP_PROJECT_CONFIG;
    assert.equal(getExplicitProjectConfigPath(), undefined);
  });

  it("expands a home-relative override", () => {
    process.env.PI_MCP_PROJECT_CONFIG = "~/.config/pi/workspace-mcp.json";
    assert.equal(
      getExplicitProjectConfigPath(),
      `${process.env.HOME}/.config/pi/workspace-mcp.json`,
    );
  });
});
