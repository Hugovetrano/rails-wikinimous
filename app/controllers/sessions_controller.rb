class SessionsController < ApplicationController
  skip_before_action :require_login

  def new
    redirect_to root_path if logged_in?
  end

  def create
    if shared_password.nil?
      flash.now[:alert] = "MAP_PASSWORD n'est pas configuré sur le serveur."
      render :new, status: :unprocessable_entity
    elsif ActiveSupport::SecurityUtils.secure_compare(params[:password].to_s, shared_password)
      session[:unlocked] = true
      redirect_to root_path
    else
      flash.now[:alert] = "Mauvais mot de passe 🙈"
      render :new, status: :unprocessable_entity
    end
  end

  def destroy
    reset_session
    redirect_to login_path
  end
end
