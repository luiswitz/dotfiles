local treesitter = require("nvim-treesitter.configs")

treesitter.setup {
  ensure_installed = {
    "css",
    "glimmer",
    "go",
    "html",
    "javascript",
    "json",
    "lua",
    "regex",
    "markdown",
    "query",
    "ruby",
    "tsx",
    "typescript",
  },

  highlight = {
    enable = true,
  },
}
