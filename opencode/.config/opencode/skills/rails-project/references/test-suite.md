# Test suite

Example on how to configure tests for the Rails app.

1. Add test related gems to the Gemfile
```ruby
group :test do
  gem "rspec-rails", "~> latest-version"
  gem "shoulda-matchers", "~> latest-version"
  gem "capybara"
  gem "capybara-playwright-driver"
  gem "factory_bot_rails"
end
```
2. Install Rspec:
```bash
bundle install && rails generate rspec:install
```
3. Install Playwright for system tests:
```bash
npx playwright install chromium
```
4. Add to spec/rails_helper.rb:
```ruby
require 'capybara/rspec'

Dir[Rails.root.join("spec/support/**/*.rb")].sort.each { |f| require f }
Dir[Rails.root.join("spec/spec_helpers/**/*.rb")].sort.each { |f| require f }

Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :rspec
    with.library :rails
  end
end

RSpec.configure do |config|
  config.fixture_paths = [
    Rails.root.join('spec/fixtures')
  ]

  config.use_transactional_fixtures = true

  config.filter_rails_from_backtrace!
  config.include FactoryBot::Syntax::Methods
  config.include SessionSpecHelper, type: :system

  # Playwright as default driver for system tests
  config.before(:each, type: :system) do
    driven_by(:playwright)
  end
end
```
5. Create capybara playwright driver at spec/support/capybara_playwright_driver.rb
```ruby
require "capybara/playwright"

Capybara.register_driver :playwright do |app|
  Capybara::Playwright::Driver.new(app, browser_type: :chromium)
end

Capybara.default_driver = :playwright
Capybara.javascript_driver = :playwright
Capybara.default_max_wait_time = 5
```

6. Create user factory at spec/factories/users.rb:
```ruby
FactoryBot.define do
  factory :user do
    email_address { "user@example.com" }
    password { "password" }
    first_name { "John" }
    last_name { "Doe" }
  end
end
```
