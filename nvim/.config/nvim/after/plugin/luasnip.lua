local ls = require("luasnip")
local s = ls.snippet
local sn = ls.snippet_node
local isn = ls.indent_snippet_node
local t = ls.text_node
local i = ls.insert_node
local f = ls.function_node
local c = ls.choice_node
local d = ls.dynamic_node
local r = ls.restore_node
local events = require("luasnip.util.events")
local ai = require("luasnip.nodes.absolute_indexer")
local extras = require("luasnip.extras")
local l = extras.lambda
local rep = extras.rep
local p = extras.partial
local m = extras.match
local n = extras.nonempty
local dl = extras.dynamic_lambda
local fmt = require("luasnip.extras.fmt").fmt
local fmta = require("luasnip.extras.fmt").fmta
local conds = require("luasnip.extras.expand_conditions")
local postfix = require("luasnip.extras.postfix").postfix
local types = require("luasnip.util.types")
local parse = require("luasnip.util.parser").parse_snippet
local ms = ls.multi_snippet
local k = require("luasnip.nodes.key_indexer").new_key

vim.keymap.set({"i"}, "<C-a>", function() ls.expand() end, {silent = true})
vim.keymap.set({"i", "s"}, "<C-L>", function() ls.jump( 1) end, {silent = true})
vim.keymap.set({"i", "s"}, "<C-J>", function() ls.jump(-1) end, {silent = true})

ls.add_snippets("lua", {
	s("ternary", {
		-- equivalent to "${1:cond} ? ${2:then} : ${3:else}"
		i(1, "cond"), t(" ? "), i(2, " then"), t(" : "), i(3, "else")
	})
})

ls.add_snippets("ruby", {
  s("rspec", {
    t('RSpec.describe '), i(1), t(' do'),
    t({'',''}),
    t('end')
  }),
  s("desc", {
    t('describe \''), i(1), t('\' do'),
    t({'',''}),
    t('end')
  }),
  s("it", {
    t('it \''), i(1), t('\' do'),
    t({'',''}),
    t('end')
  }),
  s("controller", {
    t('class '), i(1), t(' < ApplicationController'),
    t({'',''}),
    t('end')
  }),
  s("serializer", {
    t('class '), i(1), t(' < ActiveModel::Serializer'),
    t({'',''}),
    t('end')
  }),
})

ls.add_snippets('eruby', {
  s("%=", {
    t('<%= '), i(1), t(' %>')
  }),
  s("%", {
    t('<% '), i(1), t(' %>')
  }),
  s("tft", {
    t('<%= turbo_frame_tag "'), i(1), t('" do %>'),
    t(i(2), {'',''}),
    t('<% end %>')
  }),
})

ls.add_snippets('handlebars', {
  s("if", {
    t('{{#if '), i(1), t(' }}'),
    t({'',''}),
    t('{{/if}}')
  }),
  s("%", {
    t('<% '), i(1), t(' %>')
  }),
})
