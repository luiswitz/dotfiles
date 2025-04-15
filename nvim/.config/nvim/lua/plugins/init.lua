return {
  {
    'nvim-telescope/telescope.nvim',
    requires = { { 'nvim-lua/plenary.nvim' } }
  },
  'nvim-telescope/telescope-media-files.nvim',
  {
    'nvim-treesitter/nvim-treesitter',
    requires = { { 'nvim-treesitter/playground' } },
  },
  'nvim-treesitter/playground',
  {
    "ThePrimeagen/harpoon",
    branch = "harpoon2",
    requires = { { "nvim-lua/plenary.nvim" } }
  },
  {
    "L3MON4D3/LuaSnip",
    -- follow latest release.
    version = "v2.*", -- Replace <CurrentMajor> by the latest released major (first number of latest release)
    -- install jsregexp (optional!).
    build = "make install_jsregexp"
  },

  'mbbill/undotree',

  'tpope/vim-fugitive',

  'neovim/nvim-lspconfig',
  'hrsh7th/cmp-nvim-lsp',
  'hrsh7th/nvim-cmp',

  "shortcuts/no-neck-pain.nvim",

  -- Makes argument formatting easier
  "FooSoft/vim-argwrap",

  -- easy comments
  "tpope/vim-commentary",

  -- Surround text is better with vim surround
  "tpope/vim-surround",

  "mattn/emmet-vim",

  "vim-test/vim-test",

  'christoomey/vim-tmux-navigator',

  'windwp/nvim-autopairs',

  'lewis6991/gitsigns.nvim',
  "rktjmp/lush.nvim",
  "metalelf0/jellybeans-nvim",
  'projekt0n/github-nvim-theme',
  "rebelot/kanagawa.nvim",
  "chriskempson/base16-vim",
  'arzg/vim-colors-xcode',

  {
    'stevearc/oil.nvim',
    opts = {},
    dependencies = { { "nvim-tree/nvim-web-devicons", opts = {} } },
    lazy = false,
  },

  -- colorschemes
  "rebelot/kanagawa.nvim",

  -- linters
  'nvimtools/none-ls.nvim',

  -- Mason
  'williamboman/mason.nvim',
}
