-- Auto-install ruby-lsp + rubocop for the Ruby that serves each project.
--
-- The ruby_lsp server resolves through mise shims, i.e. it runs on the Ruby a
-- project pins (.ruby-version). The gems must exist in that Ruby's gemset, so
-- on the first Ruby file opened per Ruby version we check and install them in
-- the background if missing. (rubocop is installed for CLI/conform use in
-- bundle-less contexts; in bundled projects ruby-lsp uses the project's own
-- rubocop via the composed bundle.)
--
-- Unpinned projects resolve to mise's global Ruby, which is expected to have
-- the gems already (install once with:
--   mise exec ruby@<version> -- gem install ruby-lsp rubocop --no-document)

local state = {} -- [ruby_version] = "pending" | "ready" | "failed"
local warned_roots = {} -- roots with no usable ruby, to avoid notify spam

local function notify(msg, level)
  vim.schedule(function()
    vim.notify(msg, level, { title = "ruby-lsp bootstrap" })
  end)
end

local function attach_ruby_buffers()
  vim.schedule(function()
    for _, buf in ipairs(vim.api.nvim_list_bufs()) do
      if vim.api.nvim_buf_is_loaded(buf) and vim.bo[buf].filetype == "ruby" then
        pcall(vim.lsp.start, vim.lsp.config.ruby_lsp, { bufnr = buf })
      end
    end
  end)
end

local function install_gems(version)
  state[version] = "pending"
  notify(("Installing ruby-lsp + rubocop for ruby %s (one-time, may take a minute)…"):format(version))
  vim.system(
    { "mise", "exec", "ruby@" .. version, "--", "gem", "install", "ruby-lsp", "rubocop", "--no-document" },
    { text = true },
    function(inst)
      if inst.code == 0 then
        state[version] = "ready"
        -- gem install creates new binstubs; mise needs a reshim before the
        -- shims (ruby-lsp, rubocop) resolve for this version
        vim.system({ "mise", "reshim", "ruby@" .. version }, { text = true }, function()
          notify(("ruby-lsp ready for ruby %s — starting LSP"):format(version))
          attach_ruby_buffers()
        end)
      else
        state[version] = "failed"
        notify(("gem install failed for ruby %s:\n%s"):format(version, vim.trim(inst.stderr or "")),
          vim.log.levels.ERROR)
      end
    end
  )
end

local function ensure_for_buffer(bufnr)
  local root = vim.fs.root(bufnr, { "Gemfile", ".ruby-version", ".git" }) or vim.fn.getcwd()

  vim.system({ "mise", "current", "ruby" }, { cwd = root, text = true }, function(cur)
    local version = vim.trim(cur.stdout or "")
    if cur.code ~= 0 or version == "" then
      -- e.g. .ruby-version pins a Ruby that isn't installed
      if not warned_roots[root] then
        warned_roots[root] = true
        local detail = vim.trim(cur.stderr or "")
        notify(("No usable Ruby for %s — run `mise install` there.\n%s"):format(root, detail),
          vim.log.levels.WARN)
      end
      return
    end

    if state[version] then return end

    vim.system(
      { "mise", "exec", "ruby@" .. version, "--", "gem", "list", "--exact", "--installed", "ruby-lsp" },
      { text = true },
      function(check)
        if vim.trim(check.stdout or "") == "true" then
          state[version] = "ready"
        else
          install_gems(version)
        end
      end
    )
  end)
end

vim.api.nvim_create_autocmd("FileType", {
  pattern = "ruby",
  desc = "Ensure ruby-lsp/rubocop gems exist for the project's Ruby",
  callback = function(args) ensure_for_buffer(args.buf) end,
})
