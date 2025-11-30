#!/usr/bin/env bash

update() {
  # Read current Omarchy theme
  THEME=$(basename "$(readlink ~/.config/omarchy/current/theme)")

  # Map Omarchy themes to tmux theme files
  case "$THEME" in
    catppuccin)
      FILE="${HOME}/.tmux/themes/catppuccin/mocha.conf"
      ;;
    catppuccin-latte)
      FILE="${HOME}/.tmux/themes/catppuccin/latte.conf"
      ;;
    everforest)
      FILE="${HOME}/.tmux/themes/everforest.conf"
      ;;
    gruvbox)
      FILE="${HOME}/.tmux/themes/gruvbox.conf"
      ;;
    kanagawa)
      FILE="${HOME}/.tmux/themes/kanagawa.conf"
      ;;
    "matte-black")
      FILE="${HOME}/.tmux/themes/"matte-black".conf"
      ;;
    nord)
      FILE="${HOME}/.tmux/themes/nord.conf"
      ;;
    "osaka-jade")
      FILE="${HOME}/.tmux/themes/osaka-jade.conf"
      ;;
    ristretto)
      FILE="${HOME}/.tmux/themes/ristretto.conf"
      ;;
    tokyo-night)
      FILE="${HOME}/.tmux/themes/tokyo-night.conf"
      ;;
    *)
      # fallback theme
      FILE="${HOME}/.tmux/themes/default.conf"
      ;;
  esac

  tmux source $(printf $FILE)
}

update
