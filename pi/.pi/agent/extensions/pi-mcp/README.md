# pi-mcp

MCP (Model Context Protocol) client for [pi](https://pi.dev), ported from
[opencode](https://github.com/anomalyco/opencode)'s MCP implementation
(`packages/opencode/src/mcp/`) — the same setup Dilon uses, minus the Effect
scaffolding.

## Features

- **Proxy tool mode (default)** — one `mcp` tool fronts every server (~200
  tokens instead of hundreds of tool schemas); the LLM discovers tools via
  `action=list/search/describe` and executes via `action=call`
- **Direct tool mode** — every MCP tool registered as a first-class pi tool
  (`mcp_<server>_<tool>`, opencode classic)
- **Lazy startup (default)** — servers connect on first use, not at session
  start; `eager` connects everything up front
- **All three transports** — stdio, streamable-http, SSE fallback (opencode order)
- **OAuth 2.1** — 401 detection, RFC 7591 dynamic client registration, PKCE,
  loopback callback server (`127.0.0.1:19876`), URL-bound token storage in
  `~/.pi/agent/mcp-auth.json` (0600)
- **`${ENV_VAR}` interpolation** — secrets stay out of config
- **Paginated `tools/list`** — cursor following, broken-`outputSchema` tolerance
- **Live refresh** — `notifications/tools/list_changed` re-syncs tool defs
- **`/mcp` panel** — interactive TUI overlay: connect, disconnect, auth,
  clear credentials

## Setup

```bash
npm install   # in this directory — pulls @modelcontextprotocol/sdk
```

The extension auto-loads from `~/.pi/agent/extensions/pi-mcp/` (via stow).
Reload pi with `/reload`.

## Config

`~/.pi/agent/mcp.json` (global), with an optional project override at
`.pi/mcp.json` (trusted projects only; per-server shallow merge):

```jsonc
{
  "mcp": {
    "toolMode": "proxy",      // "proxy" | "direct"   (default "proxy")
    "startup": "lazy",        // "lazy" | "eager"     (default "lazy")
    "servers": {
      "executor": {
        "type": "remote",
        "url": "https://example.com/mcp"
      },
      "uidotsh": {
        "type": "remote",
        "url": "https://ui.sh/mcp?agent=pi",
        "headers": { "Authorization": "Bearer ${UIDOTSH_TOKEN}" },
        "oauth": false          // disable OAuth auto-detection for bearer servers
      },
      "cf-portal": {
        "type": "remote",
        "url": "https://portal.mcp.cfdata.org/mcp",
        "oauth": {}             // optional: { clientId, clientSecret, scope, callbackPort, redirectUri }
      },
      "computer": {
        "type": "local",
        "command": ["open-computer-use", "mcp"],
        "environment": { "DEBUG": "1" },
        "enabled": true,
        "timeout": 60000
      }
    }
  }
}
```

Notes:

- A top-level `mcpServers` key (used by other extensions) is ignored, so this
  config can coexist with e.g. `pi-mcp-extension` in the same file.
- `toolMode: "direct"` implies eager behavior at session start (defs must be
  known to register tools).
- Lazy servers that fail to connect report `failed` on first use; retry with
  `/mcp connect <name>`.

## Commands

| Command | Description |
|---|---|
| `/mcp` | Interactive panel (TUI) or status summary |
| `/mcp status [server]` | Status of all servers (or one) |
| `/mcp connect <server>` | Connect / reconnect |
| `/mcp disconnect <server>` | Disconnect (back to lazy) |
| `/mcp auth <server>` | Run OAuth flow (opens browser) |
| `/mcp logout <server>` | Remove stored credentials |

Panel keys: `↑↓` move, `enter` connect/reconnect, `d` disconnect, `a` auth,
`x` clear credentials, `esc/q` close.

## Proxy tool workflow (what the LLM sees)

```
mcp action="list"                                  → servers + status + tool counts
mcp action="search" query="create issue"           → ranked tools across servers
mcp action="describe" server="gh" tool="create"    → full input schema
mcp action="call" server="gh" tool="create" arguments={…}  → result (truncated at 50KB/2000 lines)
```

## Porting notes (opencode → pi)

| opencode | pi-mcp |
|---|---|
| `mcp/index.ts` (Effect service) | `src/manager.ts` (plain promises) |
| `mcp/auth.ts` (`~/.local/share/opencode/mcp-auth.json`) | `src/auth-store.ts` (`~/.pi/agent/mcp-auth.json`) |
| `mcp/oauth-provider.ts` | `src/oauth-provider.ts` (near-verbatim) |
| `mcp/oauth-callback.ts` | `src/oauth-callback.ts` (near-verbatim) |
| `mcp/catalog.ts` | `src/catalog.ts` (+ pi result conversion) |
| Effect tool registration | `src/direct.ts` (`Type.Unsafe` JSON-schema passthrough) |
| — (opencode has no proxy mode) | `src/proxy.ts` |
| `mcp.servers` flat under `mcp` | nested under `mcp.servers` to make room for `toolMode`/`startup` |

Known deltas vs opencode:

- Tool results are truncated (50KB / 2000 lines) to protect pi's context.
- `tools/list_changed` in direct mode registers new tools; removed tools are
  not unregistered (pi 0.84 has no `unregisterTool`).
- No `!command` secret syntax (yet) — use `${ENV_VAR}`.
