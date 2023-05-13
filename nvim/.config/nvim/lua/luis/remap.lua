vim.g.mapleader = " "

-- toggle files explorer
vim.keymap.set("n", "<C-n>", vim.cmd.Ex)

-- move selected lines
vim.keymap.set('v', 'J', ":move +2<CR>gv=gv")
vim.keymap.set('v', 'K', ":move -2<CR>gv=gv")

-- keep cursor in the same place when joining lines
vim.keymap.set('n', 'J', 'mzJ`z')

-- preserve copied content
vim.keymap.set('x', '<leader>p', "\"_dp")

-- yank to system clipboard
vim.keymap.set('n', '<leader>y', "\"+y")
vim.keymap.set('v', '<leader>y', "\"+y")
vim.keymap.set('n', '<leader>Y', "\"+Y")

-- better saving
vim.keymap.set("n", "<Leader>s", ":w<CR>")

-- close files
vim.keymap.set("n", "<Leader>q", ":bdelete<CR>")

-- save and close file
vim.keymap.set("n", "<Leader>wq", ":wq<CR>")

-- back to normal mode
vim.keymap.set("i", "jj", "<Esc>")

-- no need to press ;
vim.keymap.set("n", ";", ":")

-- easy search
vim.keymap.set("n", "<Leader>f", "<ESC>/")

-- open alt file
vim.keymap.set("n", "<leader>av", function()
  AltFile()
end)

-- execute a file
vim.keymap.set("n", "<leader>e", function()
  ExecuteFile()
end)
