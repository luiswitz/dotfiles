require('nvim-treesitter.configs').setup({
	ensure_installed = { "rust", "lua", "javascript", "ruby", "vim", "typescript", "html", "css", "json", "scss", "sql", "yaml" },

	sync_install = false,

	auto_install = true,

	highlight = {
		enable = true,
		additional_vim_regex_highlighting = false,
	},
})
