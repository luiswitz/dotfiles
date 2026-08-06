require("conform").setup({
  default_format_opts = {
    lsp_format = "fallback",
  },
  formatters_by_ft = {
    lua = { "stylua" },
    -- Ruby formatting goes through ruby-lsp, which runs the project's own
    -- rubocop via the composed bundle (correct plugins + versions).
    ruby = { lsp_format = "prefer" },
    rust = { "rustfmt", lsp_format = "fallback" },
    javascript = { "prettierd", "prettier", stop_after_first = true },
    typescript = { "prettierd", "prettier", stop_after_first = true },
    javascriptreact = { "prettierd", "prettier", stop_after_first = true },
    typescriptreact = { "prettierd", "prettier", stop_after_first = true },
    html = { "prettierd", "prettier", stop_after_first = true },
    css = { "prettierd", "prettier", stop_after_first = true },
    scss = { "prettierd", "prettier", stop_after_first = true },
    json = { "prettierd", "prettier", stop_after_first = true },
    yaml = { "prettierd", "prettier", stop_after_first = true },
    markdown = { "prettierd", "prettier", stop_after_first = true },
  },
  -- Disabled: synchronous format-on-save blocks the UI while formatters run.
  -- Format manually with <leader>cs instead.
  format_on_save = false,
})

vim.opt.formatexpr = "v:lua.require'conform'.formatexpr()"
