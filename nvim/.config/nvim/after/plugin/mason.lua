require("mason").setup({})

require("mason-tool-installer").setup({
  ensure_installed = {
    -- LSP servers
    -- NOTE: ruby-lsp and rubocop are intentionally absent. They must run on
    -- each project's own Ruby (via mise shims); see ruby-lsp-bootstrap.lua.
    "eslint-lsp",
    "tailwindcss-language-server",
    "html-lsp",
    "lua-language-server",
    "typescript-language-server",
    "css-lsp",
    "ember-language-server",
    "pyright",
    "ruff",
    "debugpy",
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
