vim.keymap.set("n", "<leader>t", "<cmd>TestNearest<CR>")
vim.keymap.set("n", "<leader>T", "<cmd>TestFile<CR>")
vim.keymap.set("n", "<leader>A", "<cmd>TestSuite<CR>")

vim.g['test#javascript#ember#options'] = '--path dist'
