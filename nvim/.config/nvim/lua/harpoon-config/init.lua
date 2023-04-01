vim.keymap.set('n', '<C-h>', '<cmd>lua require("harpoon.ui").toggle_quick_menu()<CR>')
vim.keymap.set('n', '<C-e>', '<cmd>lua require("harpoon.ui").nav_next()<CR>')
vim.keymap.set('n', '<C-t>', '<cmd>lua require("harpoon.ui").nav_prev()<CR>')
vim.keymap.set('n', '<C-a>', '<cmd>lua require("harpoon.mark").add_file()<CR>')
