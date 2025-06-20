local wezterm = require 'wezterm'

wezterm.on("gui-startup", function(cmd)
  local tab, pane, window = wezterm.mux.spawn_window(cmd or {})
  window:gui_window():toggle_fullscreen()
end)

return {
  -- font = wezterm.font("SauceCodePro Nerd Font"),
  font = wezterm.font("JetBrainsMono Nerd Font"),
  font_size = 18,
  default_cursor_style = "BlinkingBlock",
  cursor_blink_rate = 600,
  bold_brightens_ansi_colors = true,
  default_prog = { "/bin/zsh", "--login" },
  scrollback_lines = 10000,
  window_decorations = "NONE",
  enable_tab_bar = false,

  window_padding = {
    left = 0,
    right = 0,
    top = 0,
    bottom = 0,
  },
  keys = {
    {
      key = "6",
      mods = "CTRL",
      action = wezterm.action.SendString("\x1e"),
    },
    {
      key = "9",
      mods = "CMD",
      action = wezterm.action.ResetFontSize,
    },
  },
}

