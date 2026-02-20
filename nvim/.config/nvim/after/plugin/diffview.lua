require("diffview").setup({})

vim.keymap.set("n", "<leader>dv", ":DiffviewOpen<CR>", { desc = "Diffview: Open" })
vim.keymap.set("n", "<leader>dc", ":DiffviewClose<CR>", { desc = "Diffview: Close" })
vim.keymap.set("n", "<leader>dh", ":DiffviewFileHistory %<CR>", { desc = "Diffview: File history (current file)" })
vim.keymap.set("n", "<leader>dH", ":DiffviewFileHistory<CR>", { desc = "Diffview: File history (all)" })
