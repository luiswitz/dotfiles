require('telescope').setup({
  defaults = {
    mappings = {
      i = {
        ["<C-d>"] = require('telescope.actions').delete_buffer
      }
    }
  }
})
