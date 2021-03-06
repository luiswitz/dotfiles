local custom = {}

-- list all commands from custom module
custom.get_custom_functions = function()
	results = {}

	for key, value in pairs(custom) do
		results[key] = value
	end

	return results
end

-- edit dotfiles easily
custom.search_dotfiles = function()
	require("telescope.builtin").find_files({
		prompt_title = "< VimRC >",
		cwd = "~/.dotfiles",
	})
end

-- runs rubocop on current file
custom.rubocop = function()
	local file_name = vim.api.nvim_buf_get_name(0)
	local command = "tabnew | term rubocop -a " .. file_name
	vim.cmd(command)
end

-- general lint function
custom.format = function()
	local file_type = vim.bo.filetype
	local file_name = vim.api.nvim_buf_get_name(0)

	if file_type == "ruby" or file_type == "rspec.ruby" then
		custom.rubocop()
	elseif file_type == "html.handlebars" then
		vim.lsp.buf.formatting_sync()
		local command = "!rustywind --write %"
		vim.cmd(command)
	else
		vim.lsp.buf.formatting_sync()
	end
end

-- runs current file in a terminal tab
custom.execute_file = function()
	local file_name = vim.api.nvim_buf_get_name(0)
	local command = "tabnew | term " .. file_name
	vim.cmd(command)
end

-- open alternates files
custom.alt_file = function()
	local file_name = vim.api.nvim_buf_get_name(0)
	local handle = io.popen("alt " .. file_name)
	local alt_file = handle:read("*a")
	handle:close()

	if alt_file == "" then
		print("No alternate file for " .. file_name)
	else
		vim.cmd("e " .. alt_file)
	end
end

return custom
