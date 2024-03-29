require('nvim-treesitter.configs').setup({
  ensure_installed = {
    "css",
    "diff",
    "git_rebase",
    "gitattributes",
    "gitcommit",
    "gitignore",
    "glimmer",
    "html",
    "javascript",
    "json",
    "lua",
    "ruby",
    "rust",
    "scss",
    "sql",
    "typescript",
    "vim",
    "yaml",
  },
  sync_install = false,
  auto_install = true,
  highlight = {
    enable = true,
    additional_vim_regex_highlighting = false,
  },
})
