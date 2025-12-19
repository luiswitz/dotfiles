local oil = require('oil')

local last_cursor_pos = {}

local function toggle_oil()
  local oil = require("oil")

  if vim.bo.filetype == "oil" then
    local alt_buf = vim.fn.bufnr("#")
    if alt_buf ~= -1 and vim.fn.buflisted(alt_buf) == 1 then
      vim.cmd("buffer #")

      -- Restore cursor if we had a saved position
      local pos = last_cursor_pos[alt_buf]
      if pos then
        vim.api.nvim_win_set_cursor(0, pos)
      end
    else
      vim.cmd("enew")
    end
  else
    -- Save current buffer and cursor position
    local current_buf = vim.api.nvim_get_current_buf()
    last_cursor_pos[current_buf] = vim.api.nvim_win_get_cursor(0)

    oil.open(vim.fn.expand("%:p:h"))
  end
end

vim.keymap.set("n", "<C-n>", toggle_oil, { desc = "Toggle Oil" })


oil.setup({
  view_options = {
    show_hidden = true
  },
  keymaps = {
    ['<C-h>'] = false,
    ['<C-j>'] = false,
    ['<C-k>'] = false,
    ['<C-l>'] = false,
    -- disable preview to be able to trigger Telescope
    ['<C-p>'] = {}
  }
})

vim.keymap.set("n", "<C-n>", toggle_oil, { desc = "Toggle Oil" })
vim.keymap.set("n", "-", "<CMD>Oil<CR>", { desc = "Open parent directory" })
