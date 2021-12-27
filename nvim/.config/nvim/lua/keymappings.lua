-- leader remap
vim.api.nvim_set_keymap('n', '<Space>', '<NOP>', { noremap = true, silent = true })
vim.g.mapleader = ' '

-- clean search
vim.api.nvim_set_keymap('n', '<Leader>F', ':set hlsearch!<CR>', { noremap = true, silent = true })

-- no need to press ;
vim.api.nvim_set_keymap('n', ';', ':', { noremap = true, silent = true })

-- easy search
vim.api.nvim_set_keymap('n', '<Leader>f', '<ESC>/', { noremap = true, silent = true })

-- escape terminal emulator
vim.api.nvim_set_keymap('t', '<ESC>', '<C-\\><C-n>', { noremap = true, silent = true })

-- back to normal mode
vim.api.nvim_set_keymap('i', 'jj', '<Esc>', { noremap = true, silent = true })

-- quit files
vim.api.nvim_set_keymap('n', '<Leader>q', ':q<CR>', { noremap = true })

-- save and close file
vim.api.nvim_set_keymap('n', '<Leader>wq', ':wq<CR>', { noremap = true })

-- better saving
vim.api.nvim_set_keymap('n', '<Leader>s', ':w<CR>', { noremap = true })

-- file explorer
vim.api.nvim_set_keymap('n', '<C-n>', ':NvimTreeToggle<CR>', { noremap = true })

-- better window movements
vim.api.nvim_set_keymap('n', '<C-h>', '<C-w>h', { noremap = true })
vim.api.nvim_set_keymap('n', '<C-j>', '<C-w>j', { noremap = true })
vim.api.nvim_set_keymap('n', '<C-l>', '<C-w>l', { noremap = true })
vim.api.nvim_set_keymap('n', '<C-k>', '<C-w>k', { noremap = true })

--  Tab switch buffer
vim.api.nvim_set_keymap('n', '<TAB>', ':bnext<CR>', { noremap = true, silent = true })
vim.api.nvim_set_keymap('n', '<S-TAB>', ':bprevious<CR>', { noremap = true, silent = true })

-- Move selected line
vim.api.nvim_set_keymap('x', 'K', ':move \'<-2<CR>gv-gv\'', { noremap = true, silent = true })
vim.api.nvim_set_keymap('x', 'J', ':move \'>+1<CR>gv-gv\'', { noremap = true, silent = true })

-- Telescope
vim.api.nvim_set_keymap('n', '<C-p>', ':Telescope find_files<CR>', { noremap = true, silent = true })
vim.api.nvim_set_keymap('n', '<Leader>ag', ':Telescope live_grep<CR>', { noremap = true, silent = true })

-- vim test
vim.api.nvim_set_keymap('n', '<Leader>t', ':TestNearest<CR>', { noremap = true, silent = true })
vim.api.nvim_set_keymap('n', '<Leader>T', ':TestFile<CR>', { noremap = true, silent = true })

-- argument wrap
vim.api.nvim_set_keymap('n', '<Leader>wa', ':ArgWrap<CR>', { noremap = true, silent = true })

-- neogit
vim.api.nvim_set_keymap('n', '<Leader>gc', ':Neogit<CR>', { noremap = true, silent = true })

-- execute file
vim.api.nvim_set_keymap('n', '<Leader>e', ':lua require(\'custom\').execute_file()<CR>', { noremap = true, silent = true })

-- rubocop lint
vim.api.nvim_set_keymap('n', '<Leader>cs', ':lua require(\'custom\').rubocop()<CR>', { noremap = true, silent = true})

-- search dotfiles
vim.api.nvim_set_keymap('n', '<Leader>df', ':lua require(\'custom\').search_dotfiles()<CR>', { noremap = true, silent = true})

-- open alternate file
vim.api.nvim_set_keymap('n', '<Leader>av', ':lua require(\'custom\').alt_file()<CR>', { noremap = true, silent = true})
