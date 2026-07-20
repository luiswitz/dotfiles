return {
  {
    "nvim-treesitter/nvim-treesitter",
    branch = "main",
    build = ":TSUpdate",
  },
  -- Harpoon
  {
    "ThePrimeagen/harpoon",
    branch = "harpoon2",
    dependencies = { "nvim-lua/plenary.nvim" },
  },

  -- Snippets
  {
    "L3MON4D3/LuaSnip",
    version = "v2.*",
    build = "make install_jsregexp"
  },

  -- Undo tree
  'mbbill/undotree',

  -- Git integration
  'tpope/vim-fugitive',
  'lewis6991/gitsigns.nvim',
  'sindrets/diffview.nvim',

  -- LSP and completion
  'neovim/nvim-lspconfig',
  'hrsh7th/cmp-nvim-lsp',
  'hrsh7th/nvim-cmp',

  -- UI enhancements
  "shortcuts/no-neck-pain.nvim",
  "FooSoft/vim-argwrap",
  "tpope/vim-commentary",
  "tpope/vim-surround",
  "mattn/emmet-vim",
  "vim-test/vim-test",
  'christoomey/vim-tmux-navigator',
  'windwp/nvim-autopairs',

  -- Colorschemes
  "rktjmp/lush.nvim",
  "metalelf0/jellybeans-nvim",
  'projekt0n/github-nvim-theme',
  "rebelot/kanagawa.nvim",
  "chriskempson/base16-vim",
  'arzg/vim-colors-xcode',

  -- File explorer
  {
    'stevearc/oil.nvim',
    opts = {},
    dependencies = { { "nvim-tree/nvim-web-devicons", opts = {} } },
    lazy = false,
  },

  -- Conform
  {
    'stevearc/conform.nvim',
    opts = {},
  },

  {
    "folke/snacks.nvim",
    priority = 1000,
    lazy = false,
    ---@type snacks.Config
    opts = {
      picker = {
        sources = {
          grep = {
            regex = false,
          },
        },
      },
      indent = {},
    },
  },

  -- Markdown preview
  {
    "OXY2DEV/markview.nvim",
    lazy = false,
    dependencies = {
      "nvim-treesitter/nvim-treesitter",
      "nvim-tree/nvim-web-devicons",
    },
  },

  -- Mason
  'williamboman/mason.nvim',
  {
    "WhoIsSethDaniel/mason-tool-installer.nvim",
    dependencies = { "williamboman/mason.nvim" },
  },

  -- Trouble diagnostics
  {
    "folke/trouble.nvim",
    cmd = "Trouble",
    opts = {},
    keys = {
      { "<leader>xx", "<cmd>Trouble diagnostics toggle<cr>", desc = "Diagnostics (Trouble)" },
      { "<leader>xX", "<cmd>Trouble diagnostics toggle filter.buf=0<cr>", desc = "Buffer Diagnostics (Trouble)" },
      { "<leader>xs", "<cmd>Trouble symbols toggle focus=false<cr>", desc = "Symbols (Trouble)" },
      { "<leader>xl", "<cmd>Trouble lsp toggle focus=false win.position=right<cr>", desc = "LSP Definitions / references / ... (Trouble)" },
      { "<leader>xL", "<cmd>Trouble loclist toggle<cr>", desc = "Location List (Trouble)" },
      { "<leader>xQ", "<cmd>Trouble qflist toggle<cr>", desc = "Quickfix List (Trouble)" },
    },
  },

  -- Which-key
  {
    "folke/which-key.nvim",
    event = "VeryLazy",
    opts = {},
  },

  -- Tokyonight
  {
    "folke/tokyonight.nvim",
    lazy = false,
    priority = 1000,
    opts = {},
  },
}
