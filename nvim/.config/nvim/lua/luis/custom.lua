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

function alt_test_file()
  local filename = vim.api.nvim_buf_get_name(0)
  local handle = io.popen("alt " .. vim.fn.shellescape(filename))
  local output = handle:read("*a")
  handle:close()

  -- Split output into lines
  local lines = {}
  for line in output:gmatch("[^\r\n]+") do
    table.insert(lines, line)
  end

  -- Try to find a test file (adjust pattern if needed)
  local alt_file
  for _, line in ipairs(lines) do
    if line:match("spec/") and line:match("_spec%.rb$") then
      alt_file = line
      break
    end
  end

  if not alt_file then
    print("No test file found for " .. filename)
    return
  end

  -- Clean path just in case
  alt_file = alt_file:gsub("\\$", ""):match("^%s*(.-)%s*$")
  vim.cmd("edit " .. vim.fn.fnameescape(alt_file))
end
