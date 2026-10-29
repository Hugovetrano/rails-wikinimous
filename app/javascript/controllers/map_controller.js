import { Controller } from "@hotwired/stimulus"
import * as L from "leaflet"

const NOMINATIM = "https://nominatim.openstreetmap.org"

export default class extends Controller {
  static targets = [
    "canvas", "panel", "toggleIcon", "stats", "list",
    "search", "searchResults",
    "drawer", "form", "formTitle", "kinds", "coords", "formError", "deleteBtn", "saveBtn"
  ]
  static values = { places: Array, kinds: Object }

  connect() {
    this.places = new Map(this.placesValue.map((p) => [p.id, p]))
    this.markers = new Map()
    this.draftMarker = null
    this.searchTimer = null

    this.buildMap()
    this.buildKindPicker()
    this.places.forEach((place) => this.addMarker(place))
    this.renderList()
    this.fitToPlaces()
  }

  disconnect() {
    this.map?.remove()
  }

  // ---------- Map ----------

  buildMap() {
    this.map = L.map(this.canvasTarget, {
      zoomControl: false,
      worldCopyJump: true,
      minZoom: 2
    }).setView([30, 10], 3)

    L.control.zoom({ position: "bottomright" }).addTo(this.map)

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19
    }).addTo(this.map)

    this.map.on("click", (e) => this.startNewPlace(e.latlng))
  }

  fitToPlaces() {
    if (this.markers.size === 0) return
    const bounds = L.latLngBounds([...this.markers.values()].map((m) => m.getLatLng()))
    this.map.fitBounds(bounds.pad(0.25), { maxZoom: 6 })
  }

  icon(emoji, kind, draft = false) {
    return L.divIcon({
      className: `pin pin--${kind}${draft ? " pin--draft" : ""}`,
      html: `<span class="pin__body"><span class="pin__emoji">${emoji}</span></span><span class="pin__tip"></span>`,
      iconSize: [40, 48],
      iconAnchor: [20, 46],
      popupAnchor: [0, -44]
    })
  }

  addMarker(place) {
    const marker = L.marker([place.lat, place.lng], { icon: this.icon(place.emoji, place.kind), riseOnHover: true })
    marker.bindPopup(() => this.popupHtml(place), { className: "popup", maxWidth: 280, minWidth: 220 })
    marker.on("popupopen", (e) => {
      e.popup.getElement().querySelector("[data-edit]")?.addEventListener("click", () => {
        marker.closePopup()
        this.startEditPlace(place.id)
      })
    })
    marker.addTo(this.map)
    this.markers.set(place.id, marker)
  }

  removeMarker(id) {
    this.markers.get(id)?.remove()
    this.markers.delete(id)
  }

  popupHtml(place) {
    const where = [place.city, place.country].filter(Boolean).join(", ")
    return `
      <div class="popup__inner">
        <div class="popup__emoji">${place.emoji}</div>
        <h3>${esc(place.name)}</h3>
        ${where ? `<p class="popup__where">${esc(where)}</p>` : ""}
        ${place.visited_label ? `<p class="popup__date">${esc(place.visited_label)}</p>` : ""}
        ${place.note ? `<p class="popup__note">${esc(place.note)}</p>` : ""}
        <button type="button" class="btn btn--ghost btn--small" data-edit>Modifier</button>
      </div>`
  }

  // ---------- Panel / list ----------

  togglePanel() {
    const open = this.panelTarget.classList.toggle("panel--open")
    this.toggleIconTarget.textContent = open ? "✕" : "☰"
  }

  renderList() {
    const items = [...this.places.values()].sort(byDateDesc)
    this.listTarget.innerHTML = items.length
      ? items.map((p) => this.listItemHtml(p)).join("")
      : `<li class="places__empty">Aucun lieu pour l'instant.<br>Votre premier voyage vous attend ✈️</li>`

    this.listTarget.querySelectorAll("[data-id]").forEach((el) => {
      el.addEventListener("click", () => this.focusPlace(Number(el.dataset.id)))
    })

    const countries = new Set(items.map((p) => p.country).filter(Boolean))
    this.statsTarget.textContent = `${plural(items.length, "lieu", "lieux")} · ${plural(countries.size, "pays", "pays")}`
  }

  listItemHtml(place) {
    const where = [place.city, place.country].filter(Boolean).join(", ")
    return `
      <li class="place" data-id="${place.id}">
        <span class="place__emoji place__emoji--${place.kind}">${place.emoji}</span>
        <span class="place__text">
          <span class="place__name">${esc(place.name)}</span>
          <span class="place__meta">${esc([where, place.visited_label].filter(Boolean).join(" · "))}</span>
        </span>
      </li>`
  }

  focusPlace(id) {
    const marker = this.markers.get(id)
    if (!marker) return
    if (window.innerWidth < 800) this.closePanelOnMobile()
    this.map.flyTo(marker.getLatLng(), Math.max(this.map.getZoom(), 9), { duration: 1.2 })
    this.map.once("moveend", () => marker.openPopup())
  }

  closePanelOnMobile() {
    this.panelTarget.classList.remove("panel--open")
    this.toggleIconTarget.textContent = "☰"
  }

  // ---------- Search (Nominatim) ----------

  search() {
    clearTimeout(this.searchTimer)
    const q = this.searchTarget.value.trim()
    if (q.length < 3) { this.hideSearchResults(); return }
    this.searchTimer = setTimeout(() => this.runSearch(q), 350)
  }

  searchSubmit(event) {
    event.preventDefault()
    const first = this.searchResultsTarget.querySelector("li")
    if (first) first.click()
  }

  async runSearch(q) {
    try {
      const res = await fetch(`${NOMINATIM}/search?format=jsonv2&limit=5&accept-language=fr&q=${encodeURIComponent(q)}`)
      const results = await res.json()
      this.searchResultsTarget.innerHTML = results.map((r) => `
        <li data-lat="${r.lat}" data-lon="${r.lon}">
          <span class="search__name">${esc(r.name || r.display_name.split(",")[0])}</span>
          <span class="search__detail">${esc(r.display_name)}</span>
        </li>`).join("")
      this.searchResultsTarget.hidden = results.length === 0
      this.searchResultsTarget.querySelectorAll("li").forEach((li) => {
        li.addEventListener("click", () => {
          const latlng = L.latLng(Number(li.dataset.lat), Number(li.dataset.lon))
          this.hideSearchResults()
          this.searchTarget.value = ""
          if (window.innerWidth < 800) this.closePanelOnMobile()
          this.map.flyTo(latlng, 11, { duration: 1.4 })
          this.map.once("moveend", () => this.startNewPlace(latlng))
        })
      })
    } catch (e) {
      console.error(e)
    }
  }

  hideSearchResults() {
    this.searchResultsTarget.hidden = true
    this.searchResultsTarget.innerHTML = ""
  }

  // ---------- Form ----------

  buildKindPicker() {
    this.kindsTarget.innerHTML = Object.entries(this.kindsValue).map(([key, k]) => `
      <button type="button" class="kind" data-kind="${key}" title="${esc(k.label)}">
        <span>${k.emoji}</span><small>${esc(k.label)}</small>
      </button>`).join("")
    this.kindsTarget.querySelectorAll(".kind").forEach((btn) => {
      btn.addEventListener("click", () => this.selectKind(btn.dataset.kind))
    })
  }

  selectKind(kind) {
    this.formTarget.elements.kind.value = kind
    this.kindsTarget.querySelectorAll(".kind").forEach((b) => b.classList.toggle("kind--active", b.dataset.kind === kind))
    if (this.draftMarker) this.draftMarker.setIcon(this.icon(this.kindsValue[kind].emoji, kind, true))
  }

  async startNewPlace(latlng) {
    this.clearDraft()
    this.draftMarker = L.marker(latlng, { icon: this.icon("📍", "other", true), draggable: true, zIndexOffset: 1000 }).addTo(this.map)
    this.draftMarker.on("dragend", () => {
      const ll = this.draftMarker.getLatLng()
      this.setCoords(ll)
      this.reverseGeocode(ll, { overwriteName: false })
    })

    this.resetForm()
    this.formTitleTarget.textContent = "Nouveau lieu"
    this.deleteBtnTarget.hidden = true
    this.selectKind("other")
    this.setCoords(latlng)
    this.openForm()
    this.reverseGeocode(latlng, { overwriteName: true })
  }

  startEditPlace(id) {
    const place = this.places.get(id)
    if (!place) return
    this.clearDraft()
    this.resetForm()
    const f = this.formTarget.elements
    f.id.value = place.id
    f.name.value = place.name
    f.visited_on.value = place.visited_on || ""
    f.note.value = place.note || ""
    f.country.value = place.country || ""
    f.city.value = place.city || ""
    this.selectKind(place.kind)
    this.setCoords(L.latLng(place.lat, place.lng))
    this.formTitleTarget.textContent = "Modifier le lieu"
    this.deleteBtnTarget.hidden = false
    this.openForm()
  }

  setCoords(latlng) {
    const f = this.formTarget.elements
    f.latitude.value = latlng.lat.toFixed(6)
    f.longitude.value = latlng.lng.toFixed(6)
    this.coordsTarget.textContent = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`
  }

  async reverseGeocode(latlng, { overwriteName }) {
    try {
      const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&zoom=14&accept-language=fr&lat=${latlng.lat}&lon=${latlng.lng}`)
      const data = await res.json()
      const a = data.address || {}
      const city = a.city || a.town || a.village || a.municipality || a.county || ""
      const f = this.formTarget.elements
      f.country.value = a.country || ""
      f.city.value = city
      if (overwriteName && !f.name.value) {
        f.name.value = city || data.name || ""
        f.name.select()
      }
    } catch (e) {
      // offline or rate-limited: user types the name themselves
    }
  }

  openForm() {
    this.drawerTarget.hidden = false
    requestAnimationFrame(() => this.drawerTarget.classList.add("drawer--open"))
    this.formTarget.elements.name.focus()
  }

  closeForm() {
    this.drawerTarget.classList.remove("drawer--open")
    this.drawerTarget.hidden = true
    this.clearDraft()
  }

  clearDraft() {
    this.draftMarker?.remove()
    this.draftMarker = null
  }

  resetForm() {
    this.formTarget.reset()
    this.formErrorTarget.hidden = true
    this.formErrorTarget.textContent = ""
  }

  async save(event) {
    event.preventDefault()
    const f = this.formTarget.elements
    const id = f.id.value
    const payload = {
      place: {
        name: f.name.value, kind: f.kind.value, visited_on: f.visited_on.value || null, note: f.note.value,
        latitude: f.latitude.value, longitude: f.longitude.value, country: f.country.value, city: f.city.value
      }
    }
    this.saveBtnTarget.disabled = true
    try {
      const res = await this.request(id ? `/places/${id}` : "/places", id ? "PATCH" : "POST", payload)
      const data = await res.json()
      if (!res.ok) { this.showError(data.errors?.join(", ") || "Impossible d'enregistrer."); return }
      if (id) this.removeMarker(data.id)
      this.places.set(data.id, data)
      this.addMarker(data)
      this.renderList()
      this.closeForm()
      this.markers.get(data.id)?.openPopup()
    } catch (e) {
      this.showError("Erreur réseau, réessaie.")
    } finally {
      this.saveBtnTarget.disabled = false
    }
  }

  async destroy() {
    const id = Number(this.formTarget.elements.id.value)
    const place = this.places.get(id)
    if (!place || !confirm(`Supprimer « ${place.name} » ?`)) return
    const res = await this.request(`/places/${id}`, "DELETE")
    if (!res.ok) { this.showError("Impossible de supprimer."); return }
    this.removeMarker(id)
    this.places.delete(id)
    this.renderList()
    this.closeForm()
  }

  showError(message) {
    this.formErrorTarget.textContent = message
    this.formErrorTarget.hidden = false
  }

  request(url, method, body) {
    return fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.content
      },
      body: body ? JSON.stringify(body) : undefined
    })
  }
}

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))
}

function plural(n, one, many) {
  return `${n} ${n > 1 ? many : one}`
}

function byDateDesc(a, b) {
  if (a.visited_on && b.visited_on) return b.visited_on.localeCompare(a.visited_on)
  if (a.visited_on) return -1
  if (b.visited_on) return 1
  return b.id - a.id
}
