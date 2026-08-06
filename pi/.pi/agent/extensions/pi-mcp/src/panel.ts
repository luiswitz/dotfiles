import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { Key, matchesKey, type TUI } from "@earendil-works/pi-tui";
import type { McpManager, ServerInfo, ServerStatus } from "./manager.ts";

/** Interactive /mcp panel: server list + connect/disconnect/auth actions. */

export async function showMcpPanel(ctx: ExtensionContext, manager: McpManager): Promise<void> {
  return ctx.ui.custom<void>((tui, theme, _keybindings, done) => new McpPanel(tui, theme, manager, done), {
    overlay: true,
    overlayOptions: {
      anchor: "center",
      width: "80%",
      maxHeight: "80%",
      minWidth: 60,
    },
  });
}

class McpPanel {
  private selectedIndex = 0;
  private busy: string | undefined;
  private notice: string | undefined;

  constructor(
    private readonly tui: TUI,
    private readonly theme: Theme,
    private readonly manager: McpManager,
    private readonly done: () => void,
  ) {}

  handleInput(data: string): void {
    if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("c")) || data === "q") {
      this.done();
      return;
    }
    if (matchesKey(data, Key.up)) return this.move(-1);
    if (matchesKey(data, Key.down)) return this.move(1);

    const selected = this.getSelected();
    if (!selected || this.busy) return;

    if (matchesKey(data, Key.enter)) {
      void this.run(`connecting ${selected.name}…`, async () => {
        const status = await this.manager.connect(selected.name);
        this.notice = `${selected.name}: ${statusLine(status)}`;
      });
      return;
    }
    if (data === "d") {
      void this.run(`disconnecting ${selected.name}…`, async () => {
        await this.manager.disconnect(selected.name);
        this.notice = `${selected.name}: disconnected`;
      });
      return;
    }
    if (data === "a") {
      if (selected.config.type !== "remote") {
        this.notice = `${selected.name}: OAuth only applies to remote servers`;
        return void this.tui.requestRender();
      }
      if (selected.config.oauth === false) {
        this.notice = `${selected.name}: OAuth disabled in config`;
        return void this.tui.requestRender();
      }
      void this.run(`authenticating ${selected.name} (check your browser)…`, async () => {
        const status = await this.manager.authenticate(selected.name, (url) => {
          this.notice = `Open to authorize: ${url}`;
          this.tui.requestRender();
        });
        this.notice = `${selected.name}: ${statusLine(status)}`;
      });
      return;
    }
    if (data === "x") {
      void this.run(`removing credentials for ${selected.name}…`, async () => {
        await this.manager.removeAuth(selected.name);
        this.notice = `${selected.name}: credentials removed`;
      });
    }
  }

  render(width: number): string[] {
    const innerWidth = Math.max(40, width - 2);
    const servers = this.manager.listServers();
    const rows = this.tui.terminal.rows ?? 30;
    const maxBody = Math.max(6, Math.floor(rows * 0.8) - 10);

    const lines: string[] = [];
    lines.push(border(this.theme, "top", innerWidth));
    lines.push(frame(this.theme, this.header(servers, innerWidth), innerWidth));
    lines.push(divider(this.theme, innerWidth));

    if (servers.length === 0) {
      lines.push(frame(this.theme, this.theme.fg("dim", "No MCP servers configured."), innerWidth));
      lines.push(frame(this.theme, this.theme.fg("dim", 'Add "mcp.servers" to ~/.pi/agent/mcp.json'), innerWidth));
    } else {
      this.selectedIndex = clamp(this.selectedIndex, 0, servers.length - 1);
      const start = Math.max(0, Math.min(this.selectedIndex - Math.floor(maxBody / 2), servers.length - maxBody));
      const visible = servers.slice(start, start + maxBody);
      for (let index = 0; index < visible.length; index += 1) {
        const info = visible[index]!;
        const absolute = start + index;
        const selected = absolute === this.selectedIndex;
        lines.push(frame(this.theme, this.row(info, selected, innerWidth), innerWidth));
      }
      if (servers.length > visible.length) {
        lines.push(frame(this.theme, this.theme.fg("dim", `  … ${servers.length - visible.length} more`), innerWidth));
      }
    }

    const selected = this.getSelected();
    if (selected) {
      lines.push(divider(this.theme, innerWidth));
      for (const line of this.details(selected, innerWidth)) {
        lines.push(frame(this.theme, line, innerWidth));
      }
    }

    lines.push(divider(this.theme, innerWidth));
    if (this.busy) {
      lines.push(frame(this.theme, this.theme.fg("warning", `⏳ ${this.busy}`), innerWidth));
    } else if (this.notice) {
      lines.push(frame(this.theme, fit(this.notice, innerWidth), innerWidth));
    }
    lines.push(
      frame(
        this.theme,
        this.theme.fg("dim", "↑↓ move • enter connect/reconnect • d disconnect • a auth • x clear creds • esc close"),
        innerWidth,
      ),
    );
    lines.push(border(this.theme, "bottom", innerWidth));
    return lines;
  }

  invalidate(): void {}

  private header(servers: ServerInfo[], width: number): string {
    const title = this.theme.fg("accent", this.theme.bold("MCP Servers"));
    const connected = servers.filter((info) => info.status.status === "connected").length;
    const summary = this.theme.fg("muted", `${connected}/${servers.length} connected`);
    const gap = Math.max(1, width - visibleLength(title) - visibleLength(summary));
    return `${title}${" ".repeat(gap)}${summary}`;
  }

  private row(info: ServerInfo, selected: boolean, width: number): string {
    const marker = selected ? "›" : " ";
    const tools = info.status.status === "connected" ? `${info.toolCount} tools` : "—";
    const label = `${marker} ${info.name} ${this.theme.fg("dim", `[${info.config.type}]`)} ${statusBadge(
      this.theme,
      info.status,
    )} ${this.theme.fg("dim", tools)}`;
    const fitted = fit(label, width);
    return selected ? this.theme.fg("accent", this.theme.bold(fitted)) : fitted;
  }

  private details(info: ServerInfo, width: number): string[] {
    const lines: string[] = [];
    const target = info.config.type === "remote" ? info.config.url : info.config.command.join(" ");
    lines.push(this.theme.fg("muted", fit(target, width)));
    const status = statusLine(info.status);
    lines.push(fit(`${this.theme.fg("muted", "Status:")} ${status}`, width));
    if (info.status.status === "connected" && info.toolCount > 0) {
      const names = this.manager.getDefs(info.name).map((def) => def.name);
      lines.push(fit(`${this.theme.fg("muted", "Tools:")} ${names.slice(0, 12).join(", ")}`, width));
      if (names.length > 12) lines.push(this.theme.fg("dim", `  … ${names.length - 12} more`));
    }
    if (info.instructions) {
      lines.push(fit(`${this.theme.fg("muted", "Instructions:")} ${info.instructions}`, width));
    }
    return lines;
  }

  private getSelected(): ServerInfo | undefined {
    return this.manager.listServers()[this.selectedIndex];
  }

  private move(delta: number): void {
    const count = this.manager.listServers().length;
    if (count === 0) return;
    this.selectedIndex = clamp(this.selectedIndex + delta, 0, count - 1);
    this.tui.requestRender();
  }

  private async run(label: string, action: () => Promise<void>): Promise<void> {
    this.busy = label;
    this.notice = undefined;
    this.tui.requestRender();
    try {
      await action();
    } catch (error) {
      this.notice = `Error: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.busy = undefined;
      this.tui.requestRender();
    }
  }
}

export function statusLine(status: ServerStatus): string {
  switch (status.status) {
    case "connected":
      return "connected";
    case "connecting":
      return "connecting…";
    case "disconnected":
      return "not connected (lazy)";
    case "disabled":
      return "disabled";
    case "failed":
      return `failed: ${status.error}`;
    case "needs_auth":
      return "needs auth (press a to authenticate)";
    case "needs_client_registration":
      return status.error;
  }
}

function statusBadge(theme: Theme, status: ServerStatus): string {
  switch (status.status) {
    case "connected":
      return theme.fg("success", "● connected");
    case "connecting":
      return theme.fg("warning", "◐ connecting");
    case "disconnected":
      return theme.fg("dim", "○ lazy");
    case "disabled":
      return theme.fg("dim", "◌ disabled");
    case "failed":
      return theme.fg("error", "✗ failed");
    case "needs_auth":
      return theme.fg("warning", "🔒 needs auth");
    case "needs_client_registration":
      return theme.fg("warning", "🔒 needs client id");
  }
}

// ── minimal frame helpers (same style as pi-skill-toggle) ──

function border(theme: Theme, edge: "top" | "bottom", width: number): string {
  const [left, right] = edge === "top" ? ["╭", "╮"] : ["╰", "╯"];
  return theme.fg("borderMuted", `${left}${"─".repeat(width)}${right}`);
}

function divider(theme: Theme, width: number): string {
  return theme.fg("borderMuted", `├${"─".repeat(width)}┤`);
}

function frame(theme: Theme, content: string, width: number): string {
  const visible = content.replace(/\x1b\[[0-9;]*m/g, "").length;
  const padding = " ".repeat(Math.max(0, width - visible));
  return `${theme.fg("borderMuted", "│")}${content}${padding}${theme.fg("borderMuted", "│")}`;
}

function fit(input: string, width: number): string {
  const visible = input.replace(/\x1b\[[0-9;]*m/g, "");
  if (visible.length <= width) return input;
  return `${visible.slice(0, Math.max(0, width - 1))}…`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function visibleLength(input: string): number {
  return input.replace(/\x1b\[[0-9;]*m/g, "").length;
}
