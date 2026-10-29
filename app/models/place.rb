class Place < ApplicationRecord
  KINDS = {
    "city"     => { emoji: "🏙️", label: "Ville" },
    "beach"    => { emoji: "🏖️", label: "Plage" },
    "mountain" => { emoji: "⛰️", label: "Montagne" },
    "nature"   => { emoji: "🌿", label: "Nature" },
    "food"     => { emoji: "🍜", label: "Resto / food" },
    "culture"  => { emoji: "🏛️", label: "Culture" },
    "party"    => { emoji: "🎉", label: "Fête" },
    "home"     => { emoji: "🏡", label: "Chez nous" },
    "love"     => { emoji: "❤️", label: "Coup de cœur" },
    "other"    => { emoji: "📍", label: "Autre" }
  }.freeze

  validates :name, presence: true
  validates :latitude, presence: true, numericality: { greater_than_or_equal_to: -90, less_than_or_equal_to: 90 }
  validates :longitude, presence: true, numericality: { greater_than_or_equal_to: -180, less_than_or_equal_to: 180 }
  validates :kind, inclusion: { in: KINDS.keys }

  before_validation { self.kind = "other" if kind.blank? }

  scope :chronological, -> { order(Arel.sql("visited_on IS NULL, visited_on DESC, created_at DESC")) }

  def emoji
    KINDS.fetch(kind, KINDS["other"])[:emoji]
  end

  def kind_label
    KINDS.fetch(kind, KINDS["other"])[:label]
  end

  def as_json(_options = nil)
    {
      id: id,
      name: name,
      lat: latitude.to_f,
      lng: longitude.to_f,
      visited_on: visited_on,
      visited_label: visited_on && I18n.l(visited_on, format: :long),
      note: note,
      kind: kind,
      emoji: emoji,
      kind_label: kind_label,
      country: country,
      city: city
    }
  end
end
