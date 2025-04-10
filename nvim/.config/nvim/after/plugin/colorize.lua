vim.cmd([[
  if exists('$BASE16_THEME') && (!exists('g:colors_name') || g:colors_name != 'base16-$BASE16_THEME')
    let base16colorspace=256
    colorscheme base16-$BASE16_THEME
  endif
]])

function Colorize(color)
	color = color or "base16-material-darker"
	vim.cmd.colorscheme(color)
end

Colorize()
