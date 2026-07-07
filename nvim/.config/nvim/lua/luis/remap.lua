vim.g.mapleader = " "

-- move selected lines
vim.keymap.set('v', 'J', ":move +2<CR>gv=gv", { desc = 'Move selection down' })
vim.keymap.set('v', 'K', ":move -2<CR>gv=gv", { desc = 'Move selection up' })

-- keep cursor in the same place when joining lines
vim.keymap.set('n', 'J', 'mzJ`z', { desc = 'Join lines and keep cursor' })

-- preserve copied content
vim.keymap.set('x', '<leader>p', "\"_dp", { desc = 'Paste without overwriting register' })

-- yank to system clipboard
vim.keymap.set('n', '<leader>y', "\"+y", { desc = 'Yank to system clipboard' })
vim.keymap.set('v', '<leader>y', "\"+y", { desc = 'Yank to system clipboard' })
vim.keymap.set('n', '<leader>Y', "\"+Y", { desc = 'Yank line to system clipboard' })

-- better saving
vim.keymap.set("n", "<Leader>s", ":w<CR>", { silent = true, desc = 'Save file' })

-- close files
vim.keymap.set("n", "<Leader>q", ":bdelete<CR>", { silent = true, desc = 'Close buffer' })

-- save and close file
vim.keymap.set("n", "<Leader>wq", ":wq<CR>", { silent = true, desc = 'Save and close' })

-- back to normal mode
vim.keymap.set("i", "jj", "<Esc>", { desc = 'Exit insert mode' })

-- no need to press ;
vim.keymap.set("n", ";", ":", { desc = 'Command mode' })

-- easy search
vim.keymap.set("n", "<Leader>f", "<ESC>/", { desc = 'Search forward' })

-- open alt file
vim.keymap.set("n", "<leader>av", function()
  alt_test_file()
end, { desc = 'Open alternate test file' })

-- execute a file
vim.keymap.set("n", "<leader>e", function()
  ExecuteFile()
end, { desc = 'Execute file in terminal' })
