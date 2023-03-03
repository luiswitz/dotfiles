local ls = require("luasnip") 
local types = require("luasnip.util.types")

ls.config.set_config {
  history = true,

  updateevents = "TextChanged,TextChangedI",

  enable_autosnippet = true,

  ext_opts = {
    [types.choiceNode] = {
      active = {
        virt_text = { {"🠔", "Error"} },
      },
    },
  },
}

ls.snippets = {
  all = {
    ls.parser.parse_snippet("test", "-- this is a snippet"),
  },
}

vim.keymap.set({ "i", "s" }, "<C-k>", function()
  if ls.expand_or_jumpable() then
    ls.expand_or_jump()
  end
end, { silent = true })

vim.keymap.set({ "i", "s" }, "<C-j>", function()
  if ls.jumpable(-1) then
    ls.jump(-1)
  end
end, { silent = true })

vim.keymap.set("i", "<C-l>", function()
  if ls.choice_active() then
    ls.change_choice(1)
  end
end, { silent = true })

vim.keymap.set("n", "<leader><leader>s", "<cmd>source ~/dotfiles/nvim/.config/nvim/lua/luasnip-config/init.lua<CR>")
