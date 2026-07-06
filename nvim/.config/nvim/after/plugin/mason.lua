require("mason").setup({})

require("mason-tool-installer").setup({
  ensure_installed = {
    -- LSP servers
    "ruby-lsp",
    "rubocop",
    "eslint-lsp",
    "tailwindcss-language-server",
    "html-lsp",
    "lua-language-server",
    "typescript-language-server",
    -- Formatters
    "stylua",
    "prettier",
    "prettierd",
  },
  auto_update = false,
  run_on_start = true,
})

-- NOTE: These may need manual installation if not available in Mason:
-- ember-language-server, glint, stimulus-language-server, rustfmt
