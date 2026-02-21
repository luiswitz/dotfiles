require("diffview").setup({})

vim.keymap.set("n", "<leader>dv", ":DiffviewOpen<CR>", { desc = "Diffview: Open" })
vim.keymap.set("n", "<leader>dc", ":DiffviewClose<CR>", { desc = "Diffview: Close" })
vim.keymap.set("n", "<leader>dh", ":DiffviewFileHistory %<CR>", { desc = "Diffview: File history (current file)" })
vim.keymap.set("n", "<leader>dH", ":DiffviewFileHistory<CR>", { desc = "Diffview: File history (all)" })

vim.api.nvim_create_user_command("ReviewBranch", function()
  vim.cmd("DiffviewOpen origin/HEAD...HEAD --imply-local")
end, { desc = "Review current branch changes against origin" })

vim.api.nvim_create_user_command("ReviewCommitHistory", function()
  vim.cmd("DiffviewFileHistory --range=origin/HEAD...HEAD --right-only --no-merges")
end, { desc = "Review commit history of current branch against origin" })
