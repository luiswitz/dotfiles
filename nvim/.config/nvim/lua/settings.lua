-- general neovim settings

local set = vim.opt
local cmd = vim.cmd

set.tabstop = 2
set.shiftwidth = 2
set.softtabstop = 2
set.expandtab = true
set.number = true
set.termguicolors = true

-- set colorscheme
cmd [[
  syntax enable
  colorscheme tokyonight
  autocmd BufNewFile,BufRead *_spec.rb set syntax=rspec 
]]
