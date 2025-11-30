local null_ls = require("null-ls")

null_ls.setup({
  sources = {
    null_ls.builtins.completion.spell,
    null_ls.builtins.diagnostics.rubocop,
    null_ls.builtins.formatting.rubocop,
    null_ls.builtins.formatting.stylua,
    null_ls.builtins.formatting.prettier,
  },
  dependencies = {
    "jay-babu/mason-null-ls.nvim",
    -- Adding this as a dependency because some of the default lsps were removed
    -- See https://github.com/nvimtools/none-ls.nvim/discussions/81 for more information
    "nvimtools/none-ls-extras.nvim",
  },
  event = { "BufReadPre", "BufNewFile" },
  lazy = true,
  opts = function(_, opts)
    local nls = require("null-ls")
    opts.sources = vim.list_extend(opts.sources or {}, {
      -- These come from the configuration for mason-null-ls.nvim

      -- Diagnostics
      nls.builtins.diagnostics.hadolint,
      nls.builtins.diagnostics.markdownlint,

      -- Formatter
      nls.builtins.formatting.black,
      nls.builtins.formatting.isort,
      nls.builtins.formatting.markdownlint,
      nls.builtins.formatting.prettier,
      nls.builtins.formatting.stylua,

      -- Formatters based-off the new none-ls-extras plugin
      require("none-ls.code_actions.eslint_d"),

      require("none-ls.diagnostics.eslint_d"),

      require("none-ls.formatting.beautysh"),
      require("none-ls.formatting.eslint_d"),
      require("none-ls.formatting.jq"),
    })

    opts.on_attach = function(current_client, bufnr)
      if current_client.supports_method("textDocument/formatting") then
        vim.api.nvim_clear_autocmds({ buffer = bufnr })
        vim.api.nvim_create_autocmd("BufWritePre", {
          buffer = bufnr,
          callback = function()
            vim.lsp.buf.format({
              filter = function(client)
                -- only use null-ls for formatting instead of lsp server
                return client.name == "null-ls"
              end,
              bufnr = bufnr,
            })
          end,
        })
      end
    end
  end
})
