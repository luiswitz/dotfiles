local markview = require("markview")

markview.setup({
  preview = {
    enable = true,
    map_gx = true,
    icon_provider = "devicons",
    filetypes = { "markdown", "quarto", "rmd" },
  },
})

-- Comfortable markdown reading settings
vim.api.nvim_create_autocmd("FileType", {
  pattern = "markdown",
  callback = function()
    vim.opt_local.wrap = true
    vim.opt_local.linebreak = true
    vim.opt_local.conceallevel = 2
    vim.opt_local.spell = true
  end,
})
