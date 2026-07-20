vim.opt.guicursor = ""

vim.opt.nu = true

vim.opt.tabstop = 2
vim.opt.softtabstop = 2
vim.opt.shiftwidth = 2
vim.opt.expandtab = true

vim.opt.smartindent = true

vim.opt.wrap = false

vim.opt.swapfile = false
vim.opt.backup = false

vim.opt.hlsearch = false
vim.opt.incsearch = true

vim.opt.termguicolors = true

vim.opt.scrolloff = 8
vim.opt.signcolumn = "yes"
vim.opt.isfname:append("@-@")

vim.opt.splitright = true
vim.opt.splitbelow = true

vim.opt.updatetime = 250

vim.opt.inccommand = "split"
vim.opt.confirm = true

vim.opt.colorcolumn = "80"

vim.api.nvim_create_autocmd("TextYankPost", {
  desc = "Copy yanks to the system clipboard",
  callback = function()
    if vim.v.event.operator == "y" then
      vim.fn.setreg("+", vim.fn.getreg('"'))
    end
  end,
})

vim.api.nvim_create_autocmd({ "FocusGained", "BufEnter" }, {
  desc = "Auto-reload buffers changed outside Neovim",
  pattern = "*",
  command = "checktime",
})

vim.opt.autoread = true

vim.opt.ignorecase = true
vim.opt.smartcase = true

vim.opt.relativenumber = true
vim.opt.cursorline = true

-- Disable built-in matchparen; it calls searchpairpos on every cursor move and is a
-- known source of typing lag in Ruby and other syntax-heavy files.
vim.g.loaded_matchparen = 1

