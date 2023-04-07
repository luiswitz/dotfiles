vim.keymap.set("n", "<leader>zm", function()
  require("zen-mode").setup {
    window = {
      width = 120,
      options = {}
    },
  }
  require("zen-mode").toggle()
  vim.wo.wrap = false
  vim.wo.number = true
  vim.wo.rnu = false
  vim.opt.colorcolumn = "0"
end)
