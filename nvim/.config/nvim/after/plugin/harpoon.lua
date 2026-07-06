local harpoon = require('harpoon')

harpoon:setup({})

vim.keymap.set("n", "<leader>a", function()
  harpoon:list():add()
  vim.notify("Added to Harpoon", vim.log.levels.INFO)
end, { desc = "Add file to harpoon" })

vim.keymap.set("n", "<C-e>", function() harpoon.ui:toggle_quick_menu(harpoon:list()) end, { desc = "Toggle harpoon menu" })

harpoon:extend({
  UI_CREATE = function(cx)
    vim.keymap.set("n", "<C-v>", function()
      harpoon.ui:select_menu_item({ vsplit = true })
    end, { buffer = cx.bufnr })

    vim.keymap.set("n", "<C-x>", function()
      harpoon.ui:select_menu_item({ split = true })
    end, { buffer = cx.bufnr })

    vim.keymap.set("n", "<C-t>", function()
      harpoon.ui:select_menu_item({ tabedit = true })
    end, { buffer = cx.bufnr })
  end,
})

vim.keymap.set("n", "<C-Up>", function()
  harpoon:list():prev()
end, { desc = "Harpoon: Previous file" })

vim.keymap.set("n", "<C-Down>", function()
  harpoon:list():next()
end, { desc = "Harpoon: Next file" })
