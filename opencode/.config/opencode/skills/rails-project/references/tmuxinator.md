# Tmuxinator Skill
---

Creates a dedicated tmuxinator file to get the devopment environment up and running.

The example below is how the file should be created and where.
- Replace `current-user-name` with the current user name
- Replace `project-name` with the project name
- Make sure the defined ruby and node version are installed with mise

```yml
# /home/current-user-name/.config/tmuxinator/project-name.yml

name: project-name
root: absolute-project-path

windows:
  - Neovim:
    - mise user ruby@{latest-ruby-version}
    - mise use node@{latest-node-version}
    - nvim
  - Rails Server:
    - mise user ruby@{latest-ruby-version}
    - mise use node@{latest-node-version}
    - docker-compose up -d postgres
    - ./bin/dev
```

## Running the project's tmux session

```bash
tmuxinator {{project-name}}
```
