local builtin = require('telescope.builtin')

vim.keymap.set('n', '<C-p>', builtin.git_files, {})
vim.keymap.set("n", "<C-b>", ":Telescope buffers hidden=true<CR>")
vim.keymap.set("n", "<Leader>ag", ":Telescope live_grep<CR>")

require('telescope').load_extension('media_files');
