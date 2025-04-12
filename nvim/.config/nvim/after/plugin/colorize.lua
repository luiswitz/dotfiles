vim.cmd([[
  if exists('$BASE16_THEME') && (!exists('g:colors_name') || g:colors_name != 'base16-$BASE16_THEME')
    let base16colorspace=256
    colorscheme base16-$BASE16_THEME
  endif
]])

function Colorize(color)
	color = color or "kanagawa"
	vim.cmd.colorscheme(color)
end

Colorize()

vim.api.nvim_set_hl(0, "CursorLineNr", { fg = "#00FF7F", bold = true })
