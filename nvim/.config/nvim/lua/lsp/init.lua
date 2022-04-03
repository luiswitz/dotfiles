local nvim_lsp = require('lspconfig')

local on_attach = function(client, bufnr)
  local opts = { noremap=true, silent=true }
end

local servers = { 'tsserver', 'ember', 'eslint', 'html', 'tailwindcss' }
for _, lsp in ipairs(servers) do
  nvim_lsp[lsp].setup {
    on_attach = on_attach,
    flags = {
      debounce_text_changes = 150,
    }
  }
end
