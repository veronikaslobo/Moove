import { divIcon } from 'leaflet'
import type { DivIcon } from 'leaflet'
import './cowIcon.css'

// Moove cow markers, used for the two kinds of places worth tapping:
//   - venues with upcoming games  → purple badge with the number of games
//   - clubs with free trials      → orange badge with the sport's emoji
// (The 3,000+ plain venues stay small grey dots: 3,000 cow images would
// make the map slow and cluttered.)
//
// The image is just the HEAD of public/moove-cow.png, cut out and shrunk to
// 79×64 px (7 KB), so the browser doesn't load the full 800 KB picture.
// It's shown at 24×19 px: small like the dots, still clearly the Moove cow.

type CowKind = 'game' | 'club'

const HEAD_SIZE: [number, number] = [24, 19] // width, height in px on screen

function makeCowIcon(kind: CowKind, badge: string): DivIcon {
  return divIcon({
    className: 'cow-marker', // styled in cowIcon.css
    html: `
      <div class="cow-marker-inner cow-marker-${kind}">
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
