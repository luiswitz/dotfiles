---
name: rails-project
description: helps setup a brand new Rails app with preferred configs
---

## Rails project

Create and setup a new Rails app with Postgres, Tailwind and RSpec. 

## When to load

- You have been asked to create a new Rails app
- You have been asked to destroy/remove an existing Rails app

## Create Rails project

Before anything else, make sure you have the app's name and where the project should live. Ask the human to confirm the defaults:
- Latest Rails version
- Latest Ruby version
- Latest Postgres version
- Latest Tailwind CSS version

After user confirmation:
1. cd into the parent project folder if necessary
2. run rails new "app_name" -T --skip-test --database=postgresql --css tailwind
3. Check for latest PostgreSQL version and use it in docker-compose.yml
4. Configure test suite
5. Configure and setup database
6. Setup authentication
7. Create tmuxinator project file and start the project

## In this Skill


| File | Purpose |
|---|---|
| [database.md](./references/database.md) | Project's database configuration |
| [docker-compose.md](./references/docker-compose.md) | Docker configuration for database |
| [setup-authentication.md](./references/setup-authentication.md) | Configure users signin/signup |
| [test-suite.md](./references/test-suite.md) | Project's tests configuration |
| [tmuxinator.md](./references/tmuxinator.md) | Dedicated tmuxinator config file for the created project |
| [destroy-project.md](./references/destroy-project.md) | Steps to remove an existing Rails app |
