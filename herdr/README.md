# Herdr Configuration

Configuration for [Herdr](https://herdr.dev), a terminal workspace manager for AI coding agents.

## Setup

```bash
cd ~/.dotfiles
stow herdr
```

This creates:

- `~/.config/herdr/config.toml`
- `~/.local/bin/herdr-omarchy-theme.sh`

## Translated from tmux

The keybindings and behavior are ported from `tmux/.tmux.conf`:

| tmux                    | Herdr                                 |
|-------------------------|---------------------------------------|
| `C-b` prefix            | `ctrl+s`                              |
| `prefix + \|`           | `prefix + shift + \` (vertical split) |
| `prefix + -`            | `prefix + minus` (horizontal split)   |
| `prefix + r`            | `prefix + r` (reload config)          |
| `prefix + h/j/k/l`      | `ctrl + h/j/k/l` (focus panes)        |
| `prefix + m`            | `prefix + m` (zoom pane)              |
| `prefix + c`            | `prefix + c` (new tab)                |
| `prefix + p/n`          | `prefix + p/n` (prev/next tab)        |
| `prefix + 1..9`         | `prefix + 1..9` (switch tab)          |
| `prefix + x`            | `prefix + x` (close pane)             |
| `prefix + [`            | `prefix + [` (copy mode)              |
| `prefix + d`            | `prefix + d` (detach)                 |
| `prefix + w`            | `prefix + w` (workspace picker)       |
| Mouse                   | `ui.mouse_capture = true`             |

Resize uses Herdr's resize mode (`prefix + shift + r`) because Herdr does not
support tmux-style repeatable resize keys.

## Omarchy theme sync

If you use Omarchy, run the helper to match Herdr's theme to the current
Omarchy theme:

```bash
~/.local/bin/herdr-omarchy-theme.sh
```

You can also bind this to an Omarchy theme-change hook or run it manually
after switching themes.

## Validation

To verify the config parses correctly:

```bash
herdr server reload-config
```

Or restart Herdr:

```bash
herdr server stop
herdr
```
