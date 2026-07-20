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

if type -q fnm
    fnm env --use-on-cd --shell fish | source
    fnm default 22
end

# Set default Ruby (chruby auto-switching on cd is handled by Homebrew vendor conf)
set -l brew_prefix
if test -d /opt/homebrew
    set brew_prefix /opt/homebrew
else if test -d /home/linuxbrew/.linuxbrew
    set brew_prefix /home/linuxbrew/.linuxbrew
else
    set brew_prefix /usr/local
end

# Load chruby-fish if not already loaded
if not type -q chruby
    test -f $brew_prefix/share/fish/vendor_functions.d/chruby.fish
    and source $brew_prefix/share/fish/vendor_functions.d/chruby.fish
end

if not type -q chruby_auto
    test -f $brew_prefix/share/fish/vendor_conf.d/chruby_auto.fish
    and source $brew_prefix/share/fish/vendor_conf.d/chruby_auto.fish
end

if type -q chruby
    chruby 3.3.5
end

