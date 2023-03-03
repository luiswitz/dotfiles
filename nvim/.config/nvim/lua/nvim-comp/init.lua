-- based on https://github.com/tjdevries/config_manager/blob/master/xdg_config/nvim/after/plugin/completion.lua

local cmp = require("cmp")
local lspkind = require("lspkind")

vim.opt.completeopt = { "menu", "menuone", "noselect" }

cmp.setup({
	snippet = {
		expand = function(args)
			require("luasnip").lsp_expand(args.body)
		end,
	},

	experimental = {
		native_menu = false,
		ghost_text = true,
	},

	mapping = {
    ['<C-p>'] = cmp.mapping.select_prev_item(),
    ['<C-n>'] = cmp.mapping.select_next_item(),
		["<c-b>"] = cmp.mapping.scroll_docs(-4),
		["<c-f>"] = cmp.mapping.scroll_docs(4),
		["<c-e>"] = cmp.mapping.close(),
		["<cr>"] = cmp.mapping(
			cmp.mapping.confirm({
				behavior = cmp.ConfirmBehavior.Insert,
				select = true,
			}),
			{ "i", "c" }
		),

		["<c-space>"] = cmp.mapping({
			i = cmp.mapping.complete(),
			c = function(
				_ --[[fallback]]
			)
				if cmp.visible() then
					if not cmp.confirm({ select = true }) then
						return
					end
				else
					cmp.complete()
				end
			end,
		}),
	},

	sources = {
		{ name = "gh_issues" },
		{ name = "nvim_lua" },
		{ name = "nvim_lsp" },
		{ name = "path" },
		{ name = "luasnip" },
		{ name = "buffer", keyword_length = 3 },
	},

	formatting = {
		format = lspkind.cmp_format({
			with_text = true,
			menu = {
				buffer = "[buf]",
				nvim_lsp = "[LSP]",
				nvim_lua = "[api]",
				path = "[path]",
				luasnip = "[snip]",
				gh_issues = "[issues]",
				tn = "[TabNine]",
			},
		}),
	},
})
