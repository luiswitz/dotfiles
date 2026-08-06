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

if vim.env.BASE16_THEME == nil then
	Colorize()
end

vim.api.nvim_set_hl(0, "CursorLineNr", { fg = "#00FF7F", bold = true })

-- Colorful JSX (kanagawa palette): components teal, builtin elements poppy red,
-- delimiters visible steel blue. Attributes stay carpYellow via kanagawa.
vim.api.nvim_set_hl(0, "@tag", { fg = "#7AA89F" })          -- components: waveAqua2
vim.api.nvim_set_hl(0, "@tag.builtin", { fg = "#E46876" })  -- html elements: waveRed
vim.api.nvim_set_hl(0, "@tag.delimiter", { fg = "#7C9FB2" }) -- </>: springBlue2
