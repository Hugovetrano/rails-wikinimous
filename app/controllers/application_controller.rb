class ApplicationController < ActionController::Base
  allow_browser versions: :modern
  stale_when_importmap_changes

  before_action :require_login

  private

  # Mot de passe partagé entre vous deux. En production il DOIT être défini
  # via la variable d'environnement MAP_PASSWORD, sinon personne ne peut entrer.
  def shared_password
    ENV["MAP_PASSWORD"].presence || (Rails.env.production? ? nil : "voyage")
  end

  def logged_in?
    session[:unlocked] == true
  end

  def require_login
    redirect_to login_path unless logged_in?
  end
end
