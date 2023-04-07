function ExecuteFile()
  local file_name = vim.api.nvim_buf_get_name(0)
  local command = "tabnew | term " .. file_name
  vim.cmd(command)
end

function AltFile()
  local filename = vim.api.nvim_buf_get_name(0)
  local handle = io.popen("alt " .. filename)
  local alt_file = handle:read("*a")

  handle:close()

  if alt_file == "" then
    print("No alternate file for " .. filename)
  else
    vim.cmd("e " .. alt_file)
  end
end
