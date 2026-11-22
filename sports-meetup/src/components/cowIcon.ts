import { divIcon } from 'leaflet'
import type { DivIcon } from 'leaflet'
import './cowIcon.css'

// Every place on the map is a Moove cow head (no more dots or badges).
// What kind of place it is shows in the SIZE of the head:
//   - plain venue                → small head
//   - venue within walking dist. → small head with a green glow
//   - venue with upcoming games  → big head (drawn on top of the others)
//   - free-trial club            → medium head
//
// The image is just the HEAD of public/moove-cow.png, cut out and shrunk to
// 79×64 px (7 KB), so the browser doesn't load the full 800 KB picture.
// Keep sizes at about 5:4 (width:height) so the head isn't squashed.

type CowKind = 'venue' | 'walkable' | 'game' | 'club'

const SIZES: Record<CowKind, [number, number]> = {
  venue: [16, 13],
  walkable: [19, 15],
  game: [28, 22],
  club: [24, 19],
}

function makeCowIcon(kind: CowKind): DivIcon {
  const [width, height] = SIZES[kind]
  return divIcon({
    className: 'cow-marker', // styled in cowIcon.css
    html: `<div class="cow-marker-inner cow-marker-${kind}"><img src="/moove-cow-head.png" alt="" draggable="false" /></div>`,
    iconSize: [width, height],
    // The CENTRE of the head sits on the exact location, like the centre of a dot.
    iconAnchor: [width / 2, height / 2],
    popupAnchor: [0, -height / 2], // open the popup just above the head
  })
}

// Only 4 icons exist, built once when the file loads, and shared by every
// marker. 3,000 markers using the same icon is much cheaper than 3,000 icons.
const ICONS: Record<CowKind, DivIcon> = {
  venue: makeCowIcon('venue'),
  walkable: makeCowIcon('walkable'),
  game: makeCowIcon('game'),
  club: makeCowIcon('club'),
}

export function venueCowIcon(isWalkable: boolean): DivIcon {
  return isWalkable ? ICONS.walkable : ICONS.venue
}

export function gameCowIcon(): DivIcon {
  return ICONS.game
}

export function clubCowIcon(): DivIcon {
  return ICONS.club
}
