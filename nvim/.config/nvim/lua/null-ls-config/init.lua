local null_ls = require("null-ls")

local formatting = null_ls.builtins.formatting

local sources = {
	formatting.eslint,
	formatting.rustywind,
	formatting.erb_lint,
	formatting.jq,
	formatting.prettier,
	formatting.rubocop,
	formatting.stylua,
}

null_ls.setup({
	sources = soruces,
})
