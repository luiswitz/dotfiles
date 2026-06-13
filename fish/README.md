# Fish Configuration

This directory contains fish shell configuration with the **damin** theme set as default.

## Setup

```bash
cd ~/.dotfiles
stow fish
```

## Theme Installation

The `damin` theme requires [Fisher](https://github.com/jorgebucaran/fisher) (fish plugin manager).

### First time setup:

```fish
# Install fisher (if not already installed)
curl -sL https://raw.githubusercontent.com/jorgebucaran/fisher/main/functions/fisher.fish | source && fisher install jorgebucaran/fisher

# Install damin theme
fisher install miniex/fish-theme-damin
```

### Alternative: Oh My Fish

```fish
# Install Oh My Fish
omf install damin
omf theme damin
```

## Theme Features

- Small, opinionated prompt with florette (`✿`) and heart bullet (`❥`)
- Two-color palette (`#98ABCC` / `#E890B0`)
- No Nerd Font required
- 9 built-in palettes (Catppuccin, gruvbox, tokyonight, rosepine, nord, dracula)
- Live palette switching via `damin_set_palette`

## Useful Commands

| Command | Description |
|---------|-------------|
| `damin_config` | Interactive setup wizard |
| `damin_help` | List all toggles and current values |
| `damin_doctor` | Environment + install diagnostic |
| `damin_set_palette <name>` | Switch color palette |
| `damin_install_themes` | Write `.theme` files into `~/.config/fish/themes/` |

## Palette Options

- `catppuccin` (default)
- `catppuccin_frappe`
- `catppuccin_macchiato`
- `catppuccin_mocha`
- `gruvbox`
- `tokyonight`
- `rosepine`
- `nord`
- `dracula`

Switch with: `damin_set_palette gruvbox`
