-- Auto-install ruby-lsp + rubocop for the Ruby that serves each project.
--
-- With mise (preferred): the ruby_lsp server resolves through mise shims,
-- i.e. it runs on the Ruby a project pins (.ruby-version). The gems must
-- exist in that Ruby's gemset, so on the first Ruby file opened per Ruby
-- version we check and install them in the background if missing.
--
-- Without mise: ruby_lsp resolves from PATH. If no ruby-lsp binary is found
-- but a system Ruby + gem exist, we install with `gem install --user-install`
-- and add the user gem bin dir to this session's PATH.
--
-- (rubocop is installed for CLI use; ruby-lsp runs each project's own
-- rubocop via the composed bundle for diagnostics and formatting.)

local state = {} -- [ruby_version | "system"] = "pending" | "ready" | "failed"
local warned = {} -- dedupe warnings by key

local function notify(msg, level)
  vim.schedule(function()
    vim.notify(msg, level, { title = "ruby-lsp bootstrap" })
  end)
end

local function warn_once(key, msg)
  if warned[key] then return end
  warned[key] = true
  notify(msg, vim.log.levels.WARN)
end

local extra_cmd = nil -- absolute ruby-lsp binstub for the no-mise fallback

local function attach_ruby_buffers()
  vim.schedule(function()
    for _, buf in ipairs(vim.api.nvim_list_bufs()) do
      if vim.api.nvim_buf_is_loaded(buf) and vim.bo[buf].filetype == "ruby" then
        -- NOTE: vim.lsp.start with an explicit config table; mutating the
        -- global vim.lsp.config mid-session re-fires FileType auto-starts
        -- with the stale cmd.
        local cfg = vim.lsp.config.ruby_lsp
        if cfg and extra_cmd then
          cfg = vim.tbl_deep_extend("force", cfg, { cmd = { extra_cmd } })
        end
        if cfg then
          local ok, err = pcall(vim.lsp.start, cfg, { bufnr = buf })
          if not ok then
            notify(("failed to start ruby_lsp: %s"):format(err), vim.log.levels.ERROR)
          end
        end
      end
    end
  end)
end

-- mise path: install gems into the gemset of a specific mise Ruby version
local function install_gems_mise(version)
  state[version] = "pending"
  notify(("Installing ruby-lsp + rubocop for ruby %s (one-time, may take a minute)…"):format(version))
  vim.system(
    { "mise", "exec", "ruby@" .. version, "--", "gem", "install", "ruby-lsp", "rubocop", "bundler", "--no-document" },
    { text = true },
    function(inst)
      if inst.code ~= 0 then
        state[version] = "failed"
        notify(("gem install failed for ruby %s:\n%s"):format(version, vim.trim(inst.stderr or "")),
          vim.log.levels.ERROR)
        return
      end
      state[version] = "ready"
      -- gem install creates new binstubs; mise needs a reshim before the
      -- shims (ruby-lsp, rubocop) resolve for this version
      vim.system({ "mise", "reshim", "ruby@" .. version }, { text = true }, function()
        notify(("ruby-lsp ready for ruby %s — starting LSP"):format(version))
        attach_ruby_buffers()
      end)
    end
  )
end

local function ensure_with_mise(root)
  vim.system({ "mise", "current", "ruby" }, { cwd = root, text = true }, function(cur)
    local version = vim.trim(cur.stdout or "")
    if cur.code ~= 0 or version == "" then
      -- e.g. .ruby-version pins a Ruby that isn't installed
      warn_once(root, ("No usable Ruby for %s — run `mise install` there.\n%s")
        :format(root, vim.trim(cur.stderr or "")))
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
          install_gems_mise(version)
        end
      end
    )
  end)
end

-- No-mise path: use whatever is on PATH, or the system Ruby's user gems
local function add_user_bin_to_path_and_attach()
  -- user gem binstubs are typically not on PATH; add them for this session
  vim.system({ "ruby", "-e", "puts Gem.user_dir, Gem.path.join(':')" }, { text = true }, function(dir)
    if dir.code ~= 0 then
      state.system = "failed"
      notify(("could not query Ruby gem paths:\n%s"):format(vim.trim(dir.stderr or "")), vim.log.levels.ERROR)
      return
    end
    local lines = vim.split(vim.trim(dir.stdout or ""), "\n")
    local user_dir = lines[1] or ""
    local gem_path = lines[2] or ""
    vim.schedule(function()
      state.system = "ready"
      if user_dir ~= "" then
        local bin = user_dir .. "/bin"
        if vim.fn.isdirectory(bin) == 1 then
          vim.env.PATH = bin .. ":" .. vim.env.PATH
          extra_cmd = bin .. "/ruby-lsp"
        end
        -- System Rubies (Arch, macOS) have root-owned gem dirs; route gem and
        -- bundler installs (incl. ruby-lsp's default composed bundle) to the
        -- user-writable dir.
        vim.env.GEM_HOME = user_dir
        vim.env.GEM_PATH = user_dir .. (gem_path ~= "" and (":" .. gem_path) or "")
      end
      notify("ruby-lsp ready — starting LSP")
      attach_ruby_buffers()
    end)
  end)
end

local function ensure_without_mise()
  if state.system then return end

  if vim.fn.executable("ruby-lsp") == 1 then
    state.system = "ready"
    return
  end

  if vim.fn.executable("ruby") == 0 or vim.fn.executable("gem") == 0 then
    warn_once("no-ruby", "ruby-lsp not found and no Ruby/gem available to install it.")
    return
  end

  state.system = "pending"

  -- Gems may already be installed for the system Ruby with only the bin dir
  -- missing from PATH; skip the install in that case.
  vim.system({ "gem", "list", "--exact", "--installed", "ruby-lsp" }, { text = true }, function(check)
    if vim.trim(check.stdout or "") == "true" then
      add_user_bin_to_path_and_attach()
      return
    end

    notify("Installing ruby-lsp + rubocop for the system Ruby (one-time, may take a minute)…")
    vim.system(
      { "gem", "install", "--user-install", "ruby-lsp", "rubocop", "bundler", "--no-document" },
      { text = true },
      function(inst)
        if inst.code ~= 0 then
          state.system = "failed"
          notify(("gem install failed:\n%s"):format(vim.trim(inst.stderr or "")), vim.log.levels.ERROR)
          return
        end
        add_user_bin_to_path_and_attach()
      end
    )
  end)
end

local function ensure_for_buffer(bufnr)
  if vim.fn.executable("mise") == 1 then
    local root = vim.fs.root(bufnr, { "Gemfile", ".ruby-version", ".git" }) or vim.fn.getcwd()
    ensure_with_mise(root)
  else
    ensure_without_mise()
  end
end

vim.api.nvim_create_autocmd("FileType", {
  pattern = "ruby",
  desc = "Ensure ruby-lsp/rubocop gems exist for the project's Ruby",
  callback = function(args) ensure_for_buffer(args.buf) end,
})
