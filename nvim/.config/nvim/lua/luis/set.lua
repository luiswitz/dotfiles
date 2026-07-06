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

vim.opt.updatetime = 50

vim.opt.colorcolumn = "80"

vim.api.nvim_create_autocmd("TextYankPost", {
  desc = "Copy yanks to the system clipboard",
  callback = function()
    if vim.v.event.operator == "y" then
      vim.fn.setreg("+", vim.fn.getreg('"'))
    end
  end,
})

vim.opt.undofile = true

vim.opt.ignorecase = true
vim.opt.smartcase = true

vim.opt.relativenumber = true
vim.opt.cursorline = true

