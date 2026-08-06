local ok, ts = pcall(require, "nvim-treesitter")
if ok and ts.setup then
  pcall(function()
    ts.setup({
      ensure_installed = {
        "bash",
        "css",
        "ecma",
        "glimmer",
        "html",
        "javascript",
        "json",
        "jsx",
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
    })
  end)
end

-- Start treesitter highlighting for every buffer. No-op when already active or
-- when no parser exists for the filetype. On nvim-treesitter main this is the
-- reliable way to guarantee highlighting (its own autocmd can silently skip
-- buffers whose language is missing, e.g. jsx before it was installed).
vim.api.nvim_create_autocmd("FileType", {
  callback = function(args)
    pcall(vim.treesitter.start, args.buf)
  end,
})

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
