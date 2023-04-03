function ExecuteFile()
	local file_name = vim.api.nvim_buf_get_name(0)
	local command = "tabnew | term " .. file_name
	vim.cmd(command)
end
