import { divIcon } from 'leaflet'
import type { DivIcon } from 'leaflet'
import './cowIcon.css'

// Moove cow markers for venues with upcoming games, with a purple badge
// showing the number of games. (Free-trial clubs are plain purple circles
// instead, see ClubMarkers.tsx.)
// (The 3,000+ plain venues stay small grey dots: 3,000 cow images would
// make the map slow and cluttered.)
//
// The image is just the HEAD of public/moove-cow.png, cut out and shrunk to
// 79×64 px (7 KB), so the browser doesn't load the full 800 KB picture.
// It's shown at 24×19 px: small like the dots, still clearly the Moove cow.

const HEAD_SIZE: [number, number] = [24, 19] // width, height in px on screen

function makeCowIcon(badge: string): DivIcon {
  return divIcon({
    className: 'cow-marker', // styled in cowIcon.css
    html: `
      <div class="cow-marker-inner cow-marker-game">
        <img src="/moove-cow-head.png" alt="" draggable="false" />
        <span class="cow-marker-badge">${badge}</span>
      </div>`,
    iconSize: HEAD_SIZE,
    // The CENTRE of the head sits on the exact location, like the centre of a dot.
    iconAnchor: [HEAD_SIZE[0] / 2, HEAD_SIZE[1] / 2],
    popupAnchor: [0, -HEAD_SIZE[1] / 2], // open the popup just above the head
  })
}

// Each icon is built once and reused. A Map is a lookup table: key → value.
const gameIcons = new Map<number, DivIcon>()

// gameCowIcon(3) → a cow with a purple "3" badge.
export function gameCowIcon(gameCount: number): DivIcon {
  let icon = gameIcons.get(gameCount)
  if (!icon) {
    icon = makeCowIcon(String(gameCount))
    gameIcons.set(gameCount, icon)
  }
  return icon
}
