vim.lsp.log.set_level("ERROR")

vim.diagnostic.config({
  virtual_text = true,
  signs = true,
  underline = true,
  update_in_insert = false,
  severity_sort = true,
})

-- Disable built-in LSP document colors (nvim-highlight-colors already renders
-- swatches); otherwise tailwindcss LSP paints background boxes over class names.
if vim.lsp.document_color then
  vim.lsp.document_color.enable(false)
end

-- Reserve a space in the gutter
vim.opt.signcolumn = 'yes'

-- Add blink.cmp capabilities to lspconfig
-- This should be executed before you configure any language server
local lspconfig_defaults = require('lspconfig').util.default_config
lspconfig_defaults.capabilities = vim.tbl_deep_extend(
  'force',
  lspconfig_defaults.capabilities,
  require('blink.cmp').get_lsp_capabilities()
)

-- This is where you enable features that only work
-- if there is a language server active in the file
vim.api.nvim_create_autocmd('LspAttach', {
  desc = 'LSP actions',
  callback = function(event)
    local opts = { buffer = event.buf }

    vim.keymap.set('n', 'K', '<cmd>lua vim.lsp.buf.hover()<cr>', vim.tbl_extend('force', opts, { desc = 'LSP hover' }))
    vim.keymap.set('n', 'gd', '<cmd>lua vim.lsp.buf.definition()<cr>', vim.tbl_extend('force', opts, { desc = 'Go to definition' }))
    vim.keymap.set('n', 'gD', '<cmd>lua vim.lsp.buf.declaration()<cr>', vim.tbl_extend('force', opts, { desc = 'Go to declaration' }))
    vim.keymap.set('n', 'gi', '<cmd>lua vim.lsp.buf.implementation()<cr>', vim.tbl_extend('force', opts, { desc = 'Go to implementation' }))
    vim.keymap.set('n', 'go', '<cmd>lua vim.lsp.buf.type_definition()<cr>', vim.tbl_extend('force', opts, { desc = 'Go to type definition' }))
    vim.keymap.set('n', 'gr', '<cmd>lua vim.lsp.buf.references()<cr>', vim.tbl_extend('force', opts, { desc = 'Find references' }))
    vim.keymap.set('n', 'gs', '<cmd>lua vim.lsp.buf.signature_help()<cr>', vim.tbl_extend('force', opts, { desc = 'Signature help' }))
    vim.keymap.set('n', '<F2>', '<cmd>lua vim.lsp.buf.rename()<cr>', vim.tbl_extend('force', opts, { desc = 'Rename symbol' }))
    vim.keymap.set({ 'n', 'x' }, '<leader>cs', function()
      local mode = vim.fn.mode()
      if mode == 'v' or mode == 'V' or mode == '\22' then
        -- Format the visual selection using conform's formatexpr
        vim.api.nvim_feedkeys('gq', 'x', false)
      else
        require('conform').format({ async = true, lsp_format = 'fallback' })
      end
    end, vim.tbl_extend('force', opts, { desc = 'Format buffer/selection (conform)' }))
    vim.keymap.set('n', '<F4>', '<cmd>lua vim.lsp.buf.code_action()<cr>', vim.tbl_extend('force', opts, { desc = 'Code action' }))
    vim.keymap.set('n', 'vd', '<cmd>lua vim.diagnostic.open_float()<cr>', vim.tbl_extend('force', opts, { desc = 'Show diagnostic' }))
    vim.keymap.set('n', '[d', '<cmd>lua vim.diagnostic.goto_prev()<cr>', vim.tbl_extend('force', opts, { desc = 'Previous diagnostic' }))
    vim.keymap.set('n', ']d', '<cmd>lua vim.diagnostic.goto_next()<cr>', vim.tbl_extend('force', opts, { desc = 'Next diagnostic' }))
    vim.keymap.set('n', '<leader>cd', '<cmd>lua vim.diagnostic.setloclist()<cr>', vim.tbl_extend('force', opts, { desc = 'List diagnostics' }))
  end,
})

-- You'll find a list of language servers here:
-- https://github.com/neovim/nvim-lspconfig/blob/master/doc/configs.md
vim.lsp.enable('ruby_lsp')
-- NOTE: no standalone rubocop server — ruby-lsp's RuboCop addon runs the
-- project's own rubocop via the composed bundle (correct plugins + versions).
-- A bundle-less rubocop binary breaks in projects whose .rubocop.yml loads
-- plugin gems with app dependencies (e.g. rubocop-rails -> activesupport).
vim.lsp.enable('ember')
-- Glimmer
-- Use the project's Glint installation so the language server and its
-- template-imports environment always come from the same dependency tree.
-- Preload the upstream multi-byte location fix for Glint 1.5.2; the preload is
-- version-gated and becomes a no-op after the project upgrades.
vim.lsp.config('glint', {
  cmd = function(dispatchers, config)
    local cmd = 'glint-language-server'
    if config.root_dir then
      local local_cmd = vim.fs.joinpath(config.root_dir, 'node_modules/.bin', cmd)
      if vim.fn.executable(local_cmd) == 1 then
        cmd = local_cmd
      end
    end

    local patch = vim.fs.joinpath(vim.fn.stdpath('config'), 'scripts', 'glint-1.5.2-preprocess-fix.cjs')
    local node_options = '--require=' .. patch
    if vim.env.NODE_OPTIONS and vim.env.NODE_OPTIONS ~= '' then
      node_options = node_options .. ' ' .. vim.env.NODE_OPTIONS
    end

    return vim.lsp.rpc.start({ 'env', 'NODE_OPTIONS=' .. node_options, cmd }, dispatchers)
  end,
  init_options = {
    glint = {
      useGlobal = false,
    },
  },
})
vim.lsp.enable('glint')
vim.lsp.enable('eslint')

-- Silence noisy "class can be written as X" suggestions from tailwindcss
vim.lsp.config('tailwindcss', {
  settings = {
    tailwindCSS = {
      lint = {
        suggestCanonicalClasses = "ignore",
      },
    },
  },
})
vim.lsp.enable('tailwindcss')

-- HTML
local capabilities = vim.tbl_deep_extend(
  'force',
  lspconfig_defaults.capabilities,
  {
    textDocument = {
      completion = {
        completionItem = {
          snippetSupport = true,
        },
      },
    },
  }
)

vim.lsp.config('html', {
  capabilities = capabilities
})
vim.lsp.enable('html')

-- CSS (installed via mason as css-lsp)
vim.lsp.enable('cssls')

vim.lsp.config('lua_ls', {
  settings = {
    Lua = {
      runtime = {
        version = 'LuaJIT',
      },
      diagnostics = {
        globals = { 'vim' },
      },
      workspace = {
        library = vim.api.nvim_get_runtime_file("", true),
        checkThirdParty = false, -- prevents annoying prompts
      },
      telemetry = {
        enable = false,
      },
    },
  },
})
vim.lsp.enable('lua_ls')

-- Python
vim.lsp.config('ruff', {
  on_attach = function(client)
    -- Disable hover in favor of pyright
    client.server_capabilities.hoverProvider = false
  end,
})
vim.lsp.enable('ruff')

vim.lsp.config('pyright', {
  settings = {
    python = {
      analysis = {
        autoImportCompletions = true,
        autoSearchPaths = true,
        useLibraryCodeForTypes = true,
        diagnosticMode = 'openFilesOnly',
      },
    },
  },
})
vim.lsp.enable('pyright')

vim.lsp.enable('stimulus_ls')
vim.lsp.enable('ts_ls')

