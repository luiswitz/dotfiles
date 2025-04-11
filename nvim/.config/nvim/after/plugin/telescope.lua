local builtin = require('telescope.builtin')

vim.keymap.set('n', '<C-p>', builtin.git_files, {})
vim.keymap.set("n", "<C-b>", ":Telescope buffers hidden=true<CR>")
vim.keymap.set("n", "<Leader>ag", ":Telescope live_grep<CR>")

vim.keymap.set("v", "ag", function()
  -- Yank visual selection to register v
  vim.cmd('normal! "vy')

  -- Get yanked text and escape it
  local search = vim.fn.escape(vim.fn.getreg("v"), "\\")

  -- Call live_grep with the selected text
  require('telescope.builtin').live_grep({ default_text = search })
end, { noremap = true, silent = true })


require('telescope').load_extension('media_files');
