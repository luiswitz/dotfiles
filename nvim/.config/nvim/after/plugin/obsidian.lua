vim.opt_local.conceallevel = 2

local obsidian_dir = os.getenv("OBSIDIAN_VAULT")

if not obsidian_dir then
  vim.notify(
    "OBSIDIAN_VAULT is not set",
    vim.log.levels.WARN
  )
  return
end

require('obsidian').setup({
  dir = obsidian_dir,
  lazy = true,
  ft = "markdown",
  -- Replace the above line with this if you only want to load obsidian.nvim for markdown files in your vault:
  -- event = {
  --   -- If you want to use the home shortcut '~' here you need to call 'vim.fn.expand'.
  --   -- E.g. "BufReadPre " .. vim.fn.expand "~" .. "/my-vault/*.md"
  --   -- refer to `:h file-pattern` for more examples
  --   "BufReadPre path/to/my-vault/*.md",
  --   "BufNewFile path/to/my-vault/*.md",
  -- },
  dependencies = {
    -- Required.
    "nvim-lua/plenary.nvim",
  },
  workspaces = {
    {
      name = "Visible Second Brain",
      path = "~/visible/visible-brain",
    },
  },
})
