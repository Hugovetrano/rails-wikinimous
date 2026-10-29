# Notre carte 🌍

Une carte du monde interactive, rien que pour nous deux : on y plante un pin
sur chaque endroit où on est allés, avec la date, une note, un type de lieu
(ville, plage, montagne, resto…). Prochaine étape prévue : des photos sur
chaque pin.

## Stack

- Ruby on Rails 8 + SQLite (zéro service externe à gérer)
- [Leaflet](https://leafletjs.com) (vendorisé dans `vendor/javascript`) avec les
  fonds de carte [CARTO Voyager](https://carto.com/basemaps/)
- Recherche et géocodage inversé via [Nominatim](https://nominatim.org)
  (OpenStreetMap), gratuit, sans clé
- Hotwire / Stimulus, pas de bundler JS

## Lancer en local

```bash
bundle install
bin/rails db:prepare
bin/rails server
```

Puis ouvrir <http://localhost:3000>. En développement le mot de passe est
`voyage` (modifiable avec la variable d'environnement `MAP_PASSWORD`).

## Fonctionnalités

- Clic n'importe où sur la carte → nouveau pin, nom pré‑rempli grâce au
  géocodage inversé, pin déplaçable avant d'enregistrer
- Barre de recherche (ville, adresse, lieu) → la carte vole vers le résultat et
  ouvre le formulaire
- Chaque pin : nom, type (emoji + couleur), date, note, ville, pays
- Liste des lieux triée par date dans le panneau latéral, compteur de lieux et
  de pays
- Modification et suppression depuis la popup d'un pin
- Responsive : panneau latéral escamotable et formulaire en bottom‑sheet sur
  mobile

## Déployer

L'app est protégée par un seul mot de passe partagé. En production il faut
impérativement définir :

| Variable            | Rôle                                            |
| ------------------- | ----------------------------------------------- |
| `MAP_PASSWORD`      | le mot de passe que vous tapez pour entrer      |
| `SECRET_KEY_BASE`   | clé de session Rails (`bin/rails secret`)       |

La base SQLite vit dans `storage/production.sqlite3` : monter un disque
persistant sur `storage/` (volume Fly.io, disk Render, etc.) pour ne pas
perdre les pins à chaque déploiement.

Un `Dockerfile` prêt à l'emploi est fourni ; il fonctionne tel quel sur
Fly.io, Render, Railway ou un petit VPS.

## Idées pour la suite

- Photos sur chaque pin (Active Storage, déjà compatible avec `image_processing`)
- Filtre par année ou par type de lieu
- Trait reliant les étapes d'un même voyage
