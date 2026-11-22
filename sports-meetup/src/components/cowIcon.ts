import { divIcon } from 'leaflet'
import type { DivIcon } from 'leaflet'
import './cowIcon.css'

// Moove cow markers, used for the two kinds of places worth tapping:
//   - venues with upcoming games  → purple badge with the number of games
//   - clubs with free trials      → orange badge with the sport's emoji
// (The 3,000+ plain venues stay small grey dots: 3,000 cow images would
// make the map slow and cluttered.)
//
// The image is a 100px-tall copy of public/moove-cow.png, made for markers
// so the browser doesn't load the full 800 KB picture for every cow.

type CowKind = 'game' | 'club'

function makeCowIcon(kind: CowKind, badge: string): DivIcon {
  return divIcon({
    className: 'cow-marker', // styled in cowIcon.css
    html: `
      <div class="cow-marker-inner cow-marker-${kind}">
        <span class="cow-marker-ground"></span>
        <img src="/moove-cow-marker.png" alt="" draggable="false" />
        <span class="cow-marker-badge">${badge}</span>
      </div>`,
    iconSize: [40, 44],
    iconAnchor: [20, 42], // the cow's feet (bottom-centre) sit on the exact location
    popupAnchor: [0, -40], // open the popup just above the cow's head
  })
}

// Each icon is built once and reused. A Map is a lookup table: key → value.
const gameIcons = new Map<number, DivIcon>()
const clubIcons = new Map<string, DivIcon>()

// gameCowIcon(3) → a cow with a purple "3" badge.
export function gameCowIcon(gameCount: number): DivIcon {
  let icon = gameIcons.get(gameCount)
  if (!icon) {
    icon = makeCowIcon('game', String(gameCount))
    gameIcons.set(gameCount, icon)
  }
  return icon
}

// clubCowIcon('🥊') → a cow with an orange 🥊 badge.
export function clubCowIcon(emoji: string): DivIcon {
  let icon = clubIcons.get(emoji)
  if (!icon) {
    icon = makeCowIcon('club', emoji)
    clubIcons.set(emoji, icon)
  }
  return icon
}
