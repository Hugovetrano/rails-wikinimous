class CreatePlaces < ActiveRecord::Migration[8.1]
  def change
    create_table :places do |t|
      t.string :name
      t.decimal :latitude, precision: 10, scale: 6
      t.decimal :longitude, precision: 10, scale: 6
      t.date :visited_on
      t.text :note
      t.string :kind
      t.string :country
      t.string :city

      t.timestamps
    end
  end
end
