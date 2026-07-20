local ok, ts = pcall(require, "nvim-treesitter")
if ok and ts.setup then
  local setup_ok = pcall(function()
    ts.setup({
      ensure_installed = {
        "bash",
        "css",
        "glimmer",
        "html",
        "javascript",
        "json",
        "lua",
        "markdown",
        "markdown_inline",
        "query",
        "ruby",
        "rust",
        "scss",
        "tsx",
        "typescript",
        "vim",
        "vimdoc",
        "yaml",
      },
      auto_install = true,
      highlight = { enable = true },
      indent = { enable = true },
    })
  end)
  if not setup_ok then
    vim.api.nvim_create_autocmd("FileType", {
      callback = function(args)
        pcall(vim.treesitter.start, args.buf)
      end,
    })
  end
else
  vim.api.nvim_create_autocmd("FileType", {
    callback = function(args)
      pcall(vim.treesitter.start, args.buf)
    end,
  })
end

-- The built-in Ruby indent plugin (indent/ruby.vim) is regex-based and a known source of
-- typing lag. Override it with Treesitter indentation for Ruby and ERB files.
vim.api.nvim_create_autocmd("FileType", {
  pattern = { "ruby", "eruby" },
  callback = function(args)
    local has_parser = pcall(vim.treesitter.get_parser, args.buf)
    if has_parser then
      vim.bo[args.buf].indentexpr = "nvim_treesitter#indent()"
    end
  end,
})
