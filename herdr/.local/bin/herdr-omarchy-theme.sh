#!/usr/bin/env bash
#
# Sync the current Omarchy theme to Herdr's config.toml and reload Herdr.
# Modeled after ~/.local/bin/omarchy-tmux-theme.sh.
#
# Usage: herdr-omarchy-theme.sh
#

set -euo pipefail

CONFIG_FILE="${HOME}/.config/herdr/config.toml"
OMARCHY_THEME_LINK="${HOME}/.config/omarchy/current/theme"

# Resolve the current Omarchy theme, if available.
# The current theme is stored in theme.name; the `theme` entry may be a
# symlink or a directory depending on the Omarchy version.
if [[ -f "$HOME/.config/omarchy/current/theme.name" ]]; then
  OMARCHY_THEME=$(cat "$HOME/.config/omarchy/current/theme.name")
elif [[ -L "$OMARCHY_THEME_LINK" ]]; then
  OMARCHY_THEME=$(basename "$(readlink "$OMARCHY_THEME_LINK")")
else
  OMARCHY_THEME=""
fi

# Map Omarchy theme names to the closest built-in Herdr theme.
map_theme() {
  case "$1" in
    catppuccin)          echo "catppuccin" ;;
    catppuccin-latte)    echo "catppuccin" ;;
    everforest)          echo "gruvbox" ;;
    gruvbox)             echo "gruvbox" ;;
    kanagawa)            echo "kanagawa" ;;
    matte-black)         echo "catppuccin" ;;
    nord)                echo "nord" ;;
    osaka-jade)          echo "tokyo-night" ;;
    ristretto)           echo "gruvbox" ;;
    tokyo-night)         echo "tokyo-night" ;;
    *)                   echo "gruvbox" ;;
  esac
}

HERDR_THEME=$(map_theme "${OMARCHY_THEME:-ristretto}")

# Resolve the real config file (follows symlinks back into dotfiles).
if [[ -L "$CONFIG_FILE" ]]; then
  CONFIG_FILE=$(readlink -f "$CONFIG_FILE")
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "error: Herdr config not found at $CONFIG_FILE" >&2
  exit 1
fi

# Update the theme name. The config only has one top-level `name =` key
# inside the [theme] section, so this replacement is safe.
sed -i "s/^name = \"[^\"]*\"/name = \"$HERDR_THEME\"/" "$CONFIG_FILE"

# Reload the running Herdr server if one is available.
if command -v herdr >/dev/null 2>&1; then
  herdr server reload-config 2>/dev/null || true
fi
