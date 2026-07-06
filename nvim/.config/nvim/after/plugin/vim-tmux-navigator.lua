vim.g.tmux_navigator_disable_when_zoomed = 1

vim.keymap.del('n', '<C-h>', { silent = true })
vim.keymap.del('n', '<C-j>', { silent = true })
vim.keymap.del('n', '<C-k>', { silent = true })
vim.keymap.del('n', '<C-l>', { silent = true })

vim.keymap.set('n', '<C-h>', '<cmd>TmuxNavigateLeft<cr>', { silent = true })
vim.keymap.set('n', '<C-j>', '<cmd>TmuxNavigateDown<cr>', { silent = true })
vim.keymap.set('n', '<C-k>', '<cmd>TmuxNavigateUp<cr>', { silent = true })
vim.keymap.set('n', '<C-l>', '<cmd>TmuxNavigateRight<cr>', { silent = true })
