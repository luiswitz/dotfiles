#!/usr/bin/env fish

# Git aliases
alias gs='git status --short'
alias lg='lazygit'

# Damin theme setup
# This theme requires Fisher to be installed first:
#   curl -sL https://raw.githubusercontent.com/jorgebucaran/fisher/main/functions/fisher.fish | source && fisher install jorgebucaran/fisher
# Then install the theme:
#   fisher install miniex/fish-theme-damin

# Set damin as the default theme if fisher and the theme are available
if type -q fisher
    if test -d $__fish_config_dir/functions/fish_prompt.fish
        # Theme is likely installed via fisher
    end
end

# Set damin palette (optional - default is catppuccin)
# set -g theme_damin_palette catppuccin

# Ensure damin theme is active by setting fish_theme if using OMF
if test -n "$OMF_PATH"
    omf theme damin 2>/dev/null
end
