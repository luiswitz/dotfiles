vim.keymap.set("n", "<leader>t", "<cmd>TestNearest<CR>")
vim.keymap.set("n", "<leader>T", "<cmd>TestFile<CR>")
vim.keymap.set("n", "<leader>A", "<cmd>TestSuite<CR>")

vim.g['test#javascript#ember#options'] = '--path dist'

-- Global toggle: 0 = local, 1 = docker-compose
vim.g['test_in_docker'] = 0
vim.g['test_docker_container'] = 'app'

function _G.docker_compose_run_strategy(cmd)
  local container = vim.g['test_docker_container'] or 'app'
  local full_cmd = string.format('docker-compose run %s %s', container, cmd)
  vim.cmd('tabnew | terminal ' .. full_cmd)
end

function _G.set_test_strategy()
  if vim.g['test_in_docker'] == 1 then
    vim.g['test#custom_strategies'] = { docker_compose = _G.docker_compose_run_strategy }
    vim.g['test#strategy'] = 'docker_compose'
    print('vim-test: Running tests in Docker (container: ' .. vim.g['test_docker_container'] .. ')')
  else
    vim.g['test#strategy'] = 'basic'
    print('vim-test: Running tests locally')
  end
end

-- Command to toggle Docker mode
vim.api.nvim_create_user_command('TestDockerToggle', function()
  vim.g['test_in_docker'] = 1 - vim.g['test_in_docker']
  _G.set_test_strategy()
end, {})

-- Command to set container name
vim.api.nvim_create_user_command('TestDockerSetContainer', function(opts)
  vim.g['test_docker_container'] = opts.args
  if vim.g['test_in_docker'] == 1 then
    _G.set_test_strategy()
  end
  print('vim-test: Docker container set to ' .. opts.args)
end, { nargs = 1 })

-- Set initial strategy
_G.set_test_strategy()
