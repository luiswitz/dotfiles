# Database.md
---
Example of how to configure database for the Rails app

---

1. Create a database_example.yml in the project's config folder.

```yml
default: &default
  adapter: postgresql
  encoding: unicode
  username: postgres
  password: the-password
  host: host
  port: port
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>

development:
  <<: *default
  database: app_name_development

test:
  <<: *default
  database: app_name_test

production:
  primary: &primary_production
    <<: *default
    database: app_name_production
    username: username
    password: <%= ENV["APP_NAME_DATABASE_PASSWORD"] %>
  cache:
    <<: *primary_production
    database: app_name_production_cache
    migrations_paths: db/cache_migrate
  queue:
    <<: *primary_production
    database: app_name_production_queue
    migrations_paths: db/queue_migrate
  cable:
    <<: *primary_production
    database: app_name_production_cable
    migrations_paths: db/cable_migrate

```

2. properly configure the database with the correct informations at config/database.yml.
**Important:** This file must be git-ignored to not expose the developer credentials.

```yml
default: &default
  adapter: postgresql
  encoding: unicode
  username: postgres
  password: mypassword
  host: 127.0.0.1
  port: 5432
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>

development:
  <<: *default
  database: my_app_development

test:
  <<: *default
  database: my_app_test

production:
  primary: &primary_production
    <<: *default
    database: my_app_production
    username: my_user
    password: <%= ENV["MY_APP_DATABASE_PASSWORD"] %>
  cache:
    <<: *primary_production
    database: my_app_production_cache
    migrations_paths: db/cache_migrate
  queue:
    <<: *primary_production
    database: my_app_production_queue
    migrations_paths: db/queue_migrate
  cable:
    <<: *primary_production
    database: my_app_production_cable
    migrations_paths: db/cable_migrate
```

3. Use `structure.sql` instead of `schema.rb`. Add to `config/application.rb`
```ruby
config.active_record.schema_format = :sql
```

4. Set UUID as default primary key. Add to `config/application.rb`
```ruby
config.generators do |g|
  g.orm :active_record, primary_key_type: :uuid
end
```

5. Enable UUID extension (PostgreSQL)
```bash
rails generate migration enable_uuid_extension
```
and edit the migration
```ruby
class EnableUuidExtension < ActiveRecord::Migration[X.0]
  def change
    enable_extension 'pgcrypto'
  end
end
```

6. Create DB and run migrations
```bash
rails db:create
rails db:migrate
```

7. Add database.yml and docker-compose.yml to .gitignore:
```bash
# Ignore database configuration
/config/database.yml

# Ignore docker-compose.yml
/docker-compose.yml
```
