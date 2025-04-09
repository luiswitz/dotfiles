local harpoon = require('harpoon')
harpoon:setup({})

vim.keymap.set("n", "<leader>a", function()
  harpoon:list():add()
  vim.notify("Added to Harpoon", vim.log.levels.INFO)
end)

local actions = require("telescope.actions")
local action_state = require("telescope.actions.state")
local conf = require("telescope.config").values

local function toggle_telescope(harpoon_files)
  local file_paths = {}
  for _, item in ipairs(harpoon_files.items) do
    table.insert(file_paths, item.value)
  end

  require("telescope.pickers").new({}, {
    prompt_title = "Harpoon",
    finder = require("telescope.finders").new_table({
      results = file_paths,
    }),    
    previewer = conf.file_previewer({}),
    sorter = conf.generic_sorter({}),
    attach_mappings = function(prompt_bufnr, map)
      local function delete_selected()
        local picker = action_state.get_current_picker(prompt_bufnr)
        local entry = action_state.get_selected_entry()

        if not entry then
          return
        end

        -- Find and remove the entry from Harpoon
        local idx_to_remove
        for idx, item in ipairs(harpoon:list().items) do
          if item.value == entry.value then
            idx_to_remove = idx
            break
          end
        end

        if idx_to_remove then
          harpoon:list():remove_at(idx_to_remove)

          vim.notify("Removed " .. entry.value .. " from Harpoon", vim.log.levels.INFO)
        end

        -- Refresh the picker
        picker:refresh(
          require("telescope.finders").new_table({
            results = vim.tbl_map(function(item)
              return item.value
            end, harpoon:list().items),
          }),
          { reset_prompt = true }
        )
      end

      map("i", "<C-d>", function() delete_selected() end)
      map("n", "<C-d>", function() delete_selected() end)

      return true
    end,
  }):find()
end

vim.keymap.set("n", "<C-Up>", function()
  harpoon:list():prev()
end, { desc = "Harpoon: Previous file" })

vim.keymap.set("n", "<C-Down>", function()
  harpoon:list():next()
end, { desc = "Harpoon: Next file" })

vim.keymap.set("n", "<C-e>", function() toggle_telescope(harpoon:list()) end,
{ desc = "Open harpoon window" })
