local null_ls = require("null-ls")

local formatting = null_ls.builtins.formatting

vim.lsp.buf.format(nil, 2000)

local sources = {
	formatting.eslint,
  formatting.erb_lint,
	formatting.jq,
	formatting.prettier,
	formatting.rubocop,
	formatting.stylua,
}

null_ls.setup({
	sources = sources,
})
