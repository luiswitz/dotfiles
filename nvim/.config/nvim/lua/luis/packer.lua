vim.cmd [[packadd packer.nvim]]

return require('packer').startup(function(user)
  use 'wbthomason/packer.nvim'

  use {
    'nvim-telescope/telescope.nvim',
    requires = { { 'nvim-lua/plenary.nvim' } }
  }
  use { 'nvim-telescope/telescope-media-files.nvim' }
  use({
    'rose-pine/neovim',
    as = 'rose-pine',
    config = function()
      vim.cmd('colorscheme rose-pine')
    end
  })

  use({
    'nvim-treesitter/nvim-treesitter',
    requires = { 'nvim-treesitter/playground' },
    { run = ':TSUpdate' }
  })
  use('nvim-treesitter/playground')
  use('theprimeagen/harpoon')
  use('mbbill/undotree')
  use('tpope/vim-fugitive')
  use {
    'VonHeikemen/lsp-zero.nvim',
    branch = 'v2.x',
    requires = {
      -- LSP Support
      { 'neovim/nvim-lspconfig' }, -- Required
      {
        -- Optional
        'williamboman/mason.nvim',
        run = function()
          pcall(vim.cmd, 'MasonUpdate')
        end,
      },
      { 'williamboman/mason-lspconfig.nvim' }, -- Optional

      -- Autocompletion
      { 'hrsh7th/nvim-cmp' },     -- Required
      { 'hrsh7th/cmp-nvim-lsp' }, -- Required
      {
        'L3MON4D3/LuaSnip',
        version = '2.0.0',
        run = 'make install_jsregexp'
      },
    }
  }

  use({ "shortcuts/no-neck-pain.nvim", tag = "*" })

  -- Makes argument formatting easier
  use("FooSoft/vim-argwrap")

  -- easy comments
  use("tpope/vim-commentary")

  -- Surround text is better with vim surround
  use("tpope/vim-surround")

  use("mattn/emmet-vim")

  use("vim-test/vim-test")

  use('christoomey/vim-tmux-navigator')

  use('windwp/nvim-autopairs')

  use('lewis6991/gitsigns.nvim')

  use("/home/luis/code/neovim-plugins/ember_test")

  use("rktjmp/lush.nvim")
  use("metalelf0/jellybeans-nvim")
  use('projekt0n/github-nvim-theme')
  use("rebelot/kanagawa.nvim")
  use("chriskempson/base16-vim")
  use { "briones-gabriel/darcula-solid.nvim", requires = "rktjmp/lush.nvim" }
  use('arzg/vim-colors-xcode')
end)
