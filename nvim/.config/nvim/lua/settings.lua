-- general neovim settings

local set = vim.opt
local cmd = vim.cmd

set.tabstop = 2
set.shiftwidth = 2
set.softtabstop = 2
set.expandtab = true
set.number = true
set.clipboard = 'unnamed'

vim.g.tokyonight_style = "night"
vim.g.tokyonight_italic_functions = true
vim.g.tokyonight_terminal_colors = true
vim.g.tokyonight_italic_variables = true
vim.g.tokyonight_lualine_bold = true

-- set colorscheme
cmd [[
  set termguicolors
  syntax on
  set noswapfile
  autocmd BufNewFile,BufRead *_spec.rb set syntax=rspec 
  colorscheme tokyonight
]]
