-- Snacks picker keymaps (replaces Telescope)
vim.keymap.set('n', '<C-p>', function() Snacks.picker.git_files({ untracked = true }) end, { desc = "Find Git Files" })
vim.keymap.set("n", "<C-b>", function() Snacks.picker.buffers({ hidden = true }) end, { desc = "Buffers" })
vim.keymap.set("n", "<Leader>ag", function() Snacks.picker.grep() end, { desc = "Live Grep" })

vim.keymap.set("v", "ag", function()
  -- Yank visual selection to register v
  vim.cmd('normal! "vy')

  -- Get yanked text and escape it
  local search = vim.fn.escape(vim.fn.getreg("v"), "\\")

  -- Grep with the selected text
  Snacks.picker.grep({ search = search, live = false })
end, { noremap = true, silent = true, desc = "Grep visual selection" })

-- Commands picker (execute immediately on confirm)
vim.keymap.set("n", "<Leader>cc", function()
  Snacks.picker.commands({
    confirm = function(picker, item)
      picker:close()
      if item then
        vim.cmd(item.cmd)
      end
    end,
  })
end, { desc = "Commands" })

-- Quickfix list picker
vim.keymap.set("n", "<Leader>qq", function() Snacks.picker.qflist() end, { desc = "Quickfix List" })
