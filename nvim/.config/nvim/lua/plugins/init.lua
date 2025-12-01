return {
  -- Telescope and related plugins
  {
    'nvim-telescope/telescope.nvim',
    requires = { { 'nvim-lua/plenary.nvim' } }
  },
  'nvim-telescope/telescope-media-files.nvim',

  -- Treesitter and related plugins
  {
    'nvim-treesitter/nvim-treesitter',
    requires = { { 'nvim-treesitter/playground' } },
  },
  'nvim-treesitter/playground',

  -- Harpoon
  {
    "ThePrimeagen/harpoon",
    branch = "harpoon2",
    requires = { { "nvim-lua/plenary.nvim" } }
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
    opts = {},
  },

  -- Mason
  'williamboman/mason.nvim',

  -- Tokyonight
  {
    "folke/tokyonight.nvim",
    lazy = false,
    priority = 1000,
    opts = {},
  },

  -- Avante
  {
    'yetone/avante.nvim',
    opts = {
      provider="openai",
      providers = {
        openai = {
          endpoint = "https://api.openai.com/v1",
          model = "gpt-4.1",
          timeout = 30000,
          extra_request_body = {
            temperature = 0,
            max_completion_tokens = 8192,
            reasoning_effort = "medium",
          },
        },
      },
    },
    dependencies = {
      "nvim-treesitter/nvim-treesitter",
      "stevearc/dressing.nvim",
      "MunifTanjim/nui.nvim",
      "echasnovski/mini.pick",
      "ibhagwan/fzf-lua",
      "nvim-tree/nvim-web-devicons",
      "zbirenbaum/copilot.lua",
      {
        "HakonHarnes/img-clip.nvim",
        event = "VeryLazy",
        opts = {
          default = {
            embed_image_as_base64 = false,
            prompt_for_file_name = false,
            drag_and_drop = {
              insert_mode = true,
            },
            use_absolute_path = true,
          },
        },
      },
    }
  }
}
