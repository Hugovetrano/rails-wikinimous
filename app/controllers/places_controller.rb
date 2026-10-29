class PlacesController < ApplicationController
  before_action :set_place, only: %i[update destroy]

  def index
    @places = Place.chronological
    @countries = @places.map(&:country).compact_blank.uniq.sort
  end

  def create
    place = Place.new(place_params)
    if place.save
      render json: place, status: :created
    else
      render json: { errors: place.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @place.update(place_params)
      render json: @place
    else
      render json: { errors: @place.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @place.destroy
    head :no_content
  end

  private

  def set_place
    @place = Place.find(params[:id])
  end

  def place_params
    params.require(:place).permit(:name, :latitude, :longitude, :visited_on, :note, :kind, :country, :city)
  end
end
