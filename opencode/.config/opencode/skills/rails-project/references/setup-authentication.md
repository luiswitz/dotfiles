# Setup authentication

This uses the built in authentication generator for Rails.

1. Run the authentication generator
```bash
bin/rails generate authentication
```

2. Present the human the users table columns present in the migration and ask if are there any columns they would like to add/remove.

3. After confirmation, run:
```bash
./bin/rails db:migrate
```

4. User sign in system spec.
`spec/system/user_sign_in_spec.rb`
```ruby
require 'rails_helper'

RSpec.describe 'User sign in', type: :system do
  before do
    driven_by(:playwright)
  end

  it 'sign in an existant user' do
    create(:user, email_address: 'test@email.com.br', password: 'password')

    visit new_session_path

    fill_in 'email_address', with: 'test@email.com.br'
    fill_in 'password', with: 'password'

    find('[data-test-sign-in-button]').click

    expect(page).to have_current_path(root_path)
  end
end
```

5. User sign up system spec.
`spec/system/user_sign_up_spec.rb`
```ruby
require 'rails_helper'

RSpec.describe 'User sign up', type: :system do
  before do
    driven_by(:playwright)
  end

  it 'signs up a new user' do
    visit new_signup_path

    fill_in 'first_name', with: 'John'
    fill_in 'last_name', with: 'Doe'
    fill_in 'email_address', with: 'john@example.com'
    fill_in 'password', with: 'password'

    find('[data-test-signup-button]').click

    expect(page).to have_current_path(root_path)
  end
end
```

6. User sign out system spec.
`spec/system/user_sign_out_spec.rb`
```ruby
require 'rails_helper'

RSpec.describe 'User sign out', type: :system do
  it 'signs out a user' do
    user = create(:user)

    sign_in(user)

    find('[data-test-sign-out-button]').click

    expect(page).to have_current_path(new_session_path)
  end
end
```

7. Sign in helper
`spec/spec_helpers/session_spec_helper.rb`
```ruby
module SessionSpecHelper
  def sign_in(user)
    session = user.sessions.create!(user_agent: "test", ip_address: "127.0.0.1")
    visit set_test_session_path(id: session.id)
  end
end
```

8. New session view
`app/views/sessions/new.html.erb`
```erb
<h2><%= t('.title') %></h2>

<%= form_with url: session_url do |form| %>
  <div>
    <%= form.label t('.email') %>
    <%= form.email_field :email_address,
      autofocus: true,
      autocomplete: t('.email'),
      placeholder: t('.email_placeholder'),
      value: params[:email_address]
    %>
  </div>

  <div>
    <%= form.label t('.password') %>
    <%= link_to t('.forgot_password'), new_password_path %>
    <%= form.password_field :password,
      autocomplete: "current-password",
      placeholder: t('.password_placeholder'),
      maxlength: 72
    %>
  </div>

  <div>
    <%= form.submit t('.sign_in'), data: { test_sign_in_button: true } %>
  </div>
<% end %>

<p>
  <%= t('.not_a_member') %>
  <%= link_to t(".create_account"),
    new_signup_path,
    data: { test_sign_up_button: true }
  %>
</p>
```

9. New signup view
`app/views/signups/new.html.erb`
```erb
<h2><%= t('.title') %></h2>

<%= render 'form' %>

<p>
  <%= t('.already_a_member') %>
  <%= link_to t(".sign_in"), new_session_path %>
</p>
```

10. Signup form
`app/views/signups/_form.html.erb`
```erb
<%= form_with url: signups_url do |form| %>
  <div>
    <%= form.label t('.first_name') %>
    <%= form.text_field :first_name,
      autofocus: true,
      value: @user.first_name
    %>
  </div>

  <div>
    <%= form.label t('.last_name') %>
    <%= form.text_field :last_name,
      value: @user.last_name
    %>
  </div>

  <div>
    <%= form.label t('.email') %>
    <%= form.email_field :email_address,
      value: @user.email_address
    %>
  </div>

  <div>
    <%= form.label t('.password') %>
    <%= form.password_field :password %>
  </div>

  <div>
    <%= form.submit t('.create_account'), data: { test_signup_button: true } %>
  </div>
<% end %>
```

11. Out layout
`app/views/layouts/out.html.erb`
```erb
<!DOCTYPE html>
<html>
  <head>
    <title><%= content_for(:title) || "Replace with App's name" %></title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <%= csrf_meta_tags %>
    <%= csp_meta_tag %>

    <%= yield :head %>

    <%= stylesheet_link_tag :app, "data-turbo-track": "reload" %>
    <%= javascript_importmap_tags %>
  </head>

  <body>
    <%= yield %>
  </body>
</html>
```

12. Sessions controller
`app/controllers/sessions_controller.rb`
```ruby
class SessionsController < ApplicationController
  layout "out"

  allow_unauthenticated_access only: %i[ new create ]
  rate_limit to: 10, within: 3.minutes, only: :create, with: -> { redirect_to new_session_url, alert: { title: t(".try_again_later") } }

  def new
  end

  def create
    if user = User.authenticate_by(params.permit(:email_address, :password))
      start_new_session_for user
      redirect_to after_authentication_url
    else
      redirect_to new_session_path, alert: { title: t(".alert") }
    end
  end

  def destroy
    terminate_session
    redirect_to new_session_path
  end
end
```

13. Add set_test_session action to SessionsController (for test environment only):
```ruby
if Rails.env.test?
  allow_unauthenticated_access only: %i[ set_test_session ]

  def set_test_session
    session = Session.find(params[:id])
    Current.session = session
    cookies.signed.permanent[:session_id] = { value: session.id, httponly: true, same_site: :lax }
    redirect_to root_path
  end
end
```

14. Add route for set_test_session in config/routes.rb:
```ruby
if Rails.env.test?
  get "set_test_session/:id", to: "sessions#set_test_session", as: :set_test_session
end
```

15. Add root route in config/routes.rb:
```ruby
root "home#index"
```

16. Create HomeController at app/controllers/home_controller.rb:
```ruby
class HomeController < ApplicationController
  def index
  end
end
```

17. Create home view at app/views/home/index.html.erb:
```erb
<h1>Welcome to App</h1>

<% if authenticated? %>
  <p>You are signed in.</p>
  <%= button_to "Sign out", session_path, method: :delete, data: { test_sign_out_button: true } %>
<% else %>
  <p>You are not signed in.</p>
  <%= link_to "Sign in", new_session_path %>
<% end %>
```

13. Signups controller
`app/controllers/signups_controller.rb`
```ruby
class SignupsController < ApplicationController
  layout "out"

  skip_before_action :require_authentication, only: [ :new, :create ]

  def new
    @user = User.new
  end

  def create
    @user = User.new(create_params)

    if @user.save
      start_new_session_for @user
      redirect_to root_path, notice: { notice: t(".welcome_message") }
    else
      redirect_to new_signup_path, alert: { title: t(".missing_info"), alerts: @user.errors }
    end
  end

  private

  def create_params
    params.permit(:first_name, :last_name, :email_address, :password)
  end
end
```

14. Sessions Locales
`config/locales/views/sessions/en.yml`
```yml
en:
  sessions:
    try_again_later: 'Try again later'

    new:
      sign_in: "Sign in"
      email: "Email"
      email_placeholder: "Enter your email address"
      password: "Password"
      password_placeholder: "Enter your password"
      title: "Access your account"
      forgot_password: "Forgot password?"
      not_a_member: "Not a member?"
      create_account: "Create your account"

    create:
      alert: 'Try another email address or password.'
```

`config/locales/views/sessions/pt.yml`
```yml
pt:
  sessions:
    try_again_later: 'Tente novamente mais tarde'

    new:
      sign_in: "Login"
      email: "Email"
      email_placeholder: "E-mail"
      password: "Senha"
      password_placeholder: "Senha"
      title: "Acesse sua conta"
      forgot_password: "Esqueceu a senha?"
      not_a_member: 'Ainda não é membro?'
      create_account: "Crie sua conta"

    create:
      alert: 'Tente outro email ou senha'
```

15. Signups Locales
`config/locales/views/signups/en.yml`
```yml
en:
  signups:
    new:
      already_a_member: "Already a member?"
      sign_in: "Sign in"
      title: "Create your account"

    form:
      create_account: "Create your account"
      email: "Email"
      first_name: "First name"
      last_name: "Last name"
      password: "Password"

    create:
      welcome_message: 'Welcome to the app!'
      missing_info: 'Missing information'
```

`config/locales/views/signups/pt.yml`
```yml
pt:
  signups:
    new:
      already_a_member: "Já tem uma conta?"
      sign_in: "Login"
      title: "Crie sua conta"

    form:
      create_account: "Criar conta"
      email: "Email"
      first_name: "Nome"
      last_name: "Sobrenome"
      password: "Senha"

    create:
      welcome_message: 'Bem vindo!'
      missing_info: 'Informações faltando'
```
