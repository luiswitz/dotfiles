require("bufferline").setup{
  options = {
    diagnostics = "nvim_lsp",
    offsets = {
      {
        filetype = "NvimTree",
        text = "Explorer",
        highlight = "PanelHeading",
        padding = 1,
      },
    },
    right_mouse_command = "vertical sbuffer %d",
    left_mouse_command = function(bufnum)
      require('bufdelete').bufdelete(bufnum, true)
    end,
    separator_style = "thin",
  }
}
