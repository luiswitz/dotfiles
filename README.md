# .dotfiles

These are the configs for my current work setup, managed with [GNU Stow](https://www.gnu.org/software/stow/manual/stow.html).

## What's included

| Config | Tool | Notes |
|--------|------|-------|
| `nvim` | [Neovim](https://neovim.io/) | LazyVim-based setup with LSP, conform, flash, trouble, treesitter, custom snippets |
| `tmux` | [tmux](https://github.com/tmux/tmux) | Terminal multiplexer config + themes |
| `herdr` | [herdr](https://herdr.dev/) | Terminal workspace manager for AI coding agents |
| `fish` | [Fish shell](https://fishshell.com/) | Shell config |
| `alacritty` | [Alacritty](https://alacritty.org/) | GPU terminal emulator |
| `ghostty` | [Ghostty](https://ghostty.org/) | Modern terminal emulator |
| `kitty` | [Kitty](https://sw.kovidgoyal.net/kitty/) | GPU terminal emulator |
| `hypr` | [Hyprland](https://hyprland.org/) | Wayland compositor config |
| `omarchy` | [Omarchy](https://omarchy.org/) | Omarchy system customizations |
| `opencode` | [Opencode](https://github.com/sst/opencode) | AI coding assistant config |
| `scripts` | — | Helper scripts in `~/.local/bin` |

## Requirements

- [GNU Stow](https://www.gnu.org/software/stow/)
- Git

Optional, depending on which configs you use:
- Neovim >= 0.11
- tmux + [tpm](https://github.com/tmux-plugins/tpm)
- herdr
- Fish shell
- Alacritty / Ghostty / Kitty
- Hyprland

## Setup

Clone the repo:

```bash
git clone git@github.com:luiswitz/dotfiles.git ~/.dotfiles
cd ~/.dotfiles
```

Use Stow to symlink the configs you want. For example, to set up Neovim:

```bash
stow nvim
```

To set up multiple configs at once:

```bash
stow nvim tmux herdr fish
```

To remove a config later:

```bash
stow -D nvim
```

### tmux

After stowing `tmux`, install plugins by opening tmux and pressing `prefix + I` (default prefix is `ctrl+s` in this config).

### herdr

After stowing `herdr`, reload the server config:

```bash
herdr server reload-config
```

### Neovim

On first launch, [lazy.nvim](https://github.com/folke/lazy.nvim) will bootstrap and install plugins. `mason-tool-installer` will then install configured LSP servers and formatters on startup.

## Branching

Active development is done on the `herdr` branch. `master` is the stable baseline.

## TODO

- [x] Add tmux configs
- [x] Add herdr configs
- [x] Add fish configs
- [ ] Add install script

## License

These are personal configuration files. Use at your own risk.
