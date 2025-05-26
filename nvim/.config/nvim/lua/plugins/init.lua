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

  -- Avante
  {
    'yetone/avante.nvim',
    opts = {
      provider = "openai",
      openai = {
        endpoint = "https://api.openai.com/v1",
        model = "gpt-4o",           -- your desired model (or use gpt-4o, etc.)
        timeout = 30000,            -- Timeout in milliseconds, increase this for reasoning models
        temperature = 0,
        max_completion_tokens = 8192, -- Increase this to include reasoning tokens (for reasoning models)
        --reasoning_effort = "medium", -- low|medium|high, only used for reasoning models
      },
    },
    dependencies = {
      "nvim-treesitter/nvim-treesitter",
      "stevearc/dressing.nvim",
      "MunifTanjim/nui.nvim",
      "echasnovski/mini.pick",       -- for file_selector provider mini.pick
      "ibhagwan/fzf-lua",            -- for file_selector provider fzf
      "nvim-tree/nvim-web-devicons", -- or echasnovski/mini.icons
      "zbirenbaum/copilot.lua",      -- for providers='copilot'
      {
        -- support for image pasting
        "HakonHarnes/img-clip.nvim",
        event = "VeryLazy",
        opts = {
          -- recommended settings
          default = {
            embed_image_as_base64 = false,
            prompt_for_file_name = false,
            drag_and_drop = {
              insert_mode = true,
            },
            -- required for Windows users
            use_absolute_path = true,
          },
        },
      },
    }
  }
}
