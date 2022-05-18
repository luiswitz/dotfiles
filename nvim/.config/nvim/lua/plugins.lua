local fn = vim.fn
local install_path = fn.stdpath('data')..'/site/pack/packer/start/packer.nvim'
if fn.empty(fn.glob(install_path)) > 0 then
  packer_bootstrap = fn.system({'git', 'clone', '--depth', '1', 'https://github.com/wbthomason/packer.nvim', install_path})
end

return require('packer').startup(function(use)
  -- plugin manager
  use 'wbthomason/packer.nvim'
  -- file explorer
  use {
	  'kyazdani42/nvim-tree.lua',
	  requires = {
		  'kyazdani42/nvim-web-devicons', -- optional, for file icon
	  },
	  config = function() require'nvim-tree'.setup {} end
  }
  -- fuzzy finder
  use {
	  'nvim-telescope/telescope.nvim',
	  requires = { {'nvim-lua/plenary.nvim'} }
  }
  -- git ui
  use { 'TimUntersberger/neogit', requires = 'nvim-lua/plenary.nvim' }
  -- git status in file
  use {
    'lewis6991/gitsigns.nvim',
    requires = {
      'nvim-lua/plenary.nvim'
    },
    config = function()
      require('gitsigns').setup()
    end
    -- tag = 'release' -- To use the latest release
  }
  use 'vim-test/vim-test'
  use {
    'nvim-treesitter/nvim-treesitter',
    run = ':TSUpdate'
  }
  -- colorshceme
  use 'folke/tokyonight.nvim'
  use 'marko-cerovac/material.nvim'

  -- better ember hbs highlight
  use 'joukevandermaas/vim-ember-hbs'

  -- better rspec syntax highlight
  use 'keith/rspec.vim'

  -- Makes argument formatting easier
  use 'FooSoft/vim-argwrap'

  -- Surround text is better with vim surround
  use 'tpope/vim-surround'

  -- easy comments
  use 'tpope/vim-commentary'

  -- enable autopairs
  use {
    'windwp/nvim-autopairs',
    config = function()
      require('nvim-autopairs').setup{} 
    end
  }

  -- lsp
  use 'neovim/nvim-lspconfig'

  -- completion
  use 'hrsh7th/nvim-cmp'
  use 'hrsh7th/cmp-buffer'
  use 'hrsh7th/cmp-path'
  use 'hrsh7th/cmp-nvim-lua'
  use 'hrsh7th/cmp-nvim-lsp'

  -- snips
  use {
    'saadparwaiz1/cmp_luasnip',
    requires = { 'L3MON4D3/LuaSnip' }
  }
  -- completion formatting
  use 'onsails/lspkind-nvim'

  -- colors
  use 'tjdevries/colorbuddy.nvim'

  -- emmet
  use 'mattn/emmet-vim'

  use 'jose-elias-alvarez/null-ls.nvim'

  -- tailwind class sorter
  -- TODO: check how to use it
  -- use 'steelsojka/headwind.nvim'

  -- Automatically set up your configuration after cloning packer.nvim
  -- Put this at the end after all plugins
  --if packer_bootstrap then
  --  require('packer').sync()
  --end
end)
