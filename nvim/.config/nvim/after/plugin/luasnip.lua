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

ls.add_snippets("ruby", {
  s("rspec", {
    t("require 'rails_helper'"),
    t({'',''}),
    t({'',''}),
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
  s("context", {
    t('context \''), i(1), t('\' do'),
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
  s("operation", fmt([[
  module {}
    class {} < Operation
      def initialize(params)
        @params = params
      end

      def run
        # run baby, run...
      end
    end
  end
    ]], {
    i(1),
    i(2),
  }))
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
    i(2),
    t({'','<% end %>'})
  }),
})

-- Utility: check if cursor is inside <template>...</template>
local function is_inside_gjs_template()
  local row = vim.api.nvim_win_get_cursor(0)[1]
  local bufnr = vim.api.nvim_get_current_buf()
  local lines = vim.api.nvim_buf_get_lines(bufnr, 0, -1, false)
  local inside_template = false
  for i = 1, row do
    if lines[i]:find("<template>") then inside_template = true end
    if lines[i]:find("</template>") then inside_template = false end
  end
  return inside_template
end

ls.add_snippets('glimmer', {
  s("if", {
    t('{{#if '), i(1), t(' }}'),
    t({'',''}),
    t('{{/if}}')
  }, {
    condition = is_inside_gjs_template
  }),
  s("each", {
    t('{{#each '), i(1), t(' }}'),
    t({'',''}),
    t('{{/each}}')
  }, {
    condition = function()
      return is_inside_gjs_template()
    end
  })
})

-- Regular JS if snippet for .gjs files, only outside <template>
ls.add_snippets('javascript', {
  s("if", {
    t('if ('), i(1), t(') {'),
    t({'','  '}), i(2),
    t({'',''}) , t('}')
  }, {
    condition = function()
      return not is_inside_gjs_template()
    end
  }),
})
ls.add_snippets('handlebars', {
  s("if", {
    t('{{#if '), i(1), t(' }}'),
    t({'',''}),
    t('{{/if}}')
  }),
  s("each", {
    t('{{#each '), i(1), t(' }}'),
    t({'',''}),
    t('{{/each}}')
  }),
})
