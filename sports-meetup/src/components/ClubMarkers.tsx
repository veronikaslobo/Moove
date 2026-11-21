import { divIcon } from 'leaflet'
import { Marker, Popup } from 'react-leaflet'
import type { Club, ClubSport } from '../data/clubs.ts'
import './ClubMarkers.css'

// One emoji per sport. Record<ClubSport, string> means "an object with
// exactly one entry for every ClubSport". If someone adds a new sport to
// ClubSport and forgets it here, TypeScript shows an error.
const SPORT_EMOJI: Record<ClubSport, string> = {
  tennis: '🎾',
  mma: '🥋',
  dance: '💃',
  fencing: '🤺',
  boxing: '🥊',
}

// A divIcon is a marker made of plain HTML + CSS instead of an image file.
// (Leaflet's default pin is an image that often fails to load with Vite.)
function makeIcon(sport: ClubSport) {
  return divIcon({
    className: 'club-pin', // styled in ClubMarkers.css
    html: `<span>${SPORT_EMOJI[sport]}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34], // which pixel sits on the exact location: bottom-centre = the pin's tip
    popupAnchor: [0, -32], // open the popup just above the pin
  })
}

// Build the 5 icons ONCE, when the file loads, instead of 24 new icons on
// every re-render. Same result, less work.
const ICONS: Record<ClubSport, ReturnType<typeof makeIcon>> = {
  tennis: makeIcon('tennis'),
  mma: makeIcon('mma'),
  dance: makeIcon('dance'),
  fencing: makeIcon('fencing'),
  boxing: makeIcon('boxing'),
}

// Props = the inputs a component receives from its parent.
// This component gets ONE input: the list of clubs to draw.
type ClubMarkersProps = {
  clubs: Club[]
}

function ClubMarkers({ clubs }: ClubMarkersProps) {
  return (
    // <> </> is a "fragment": it groups many elements without adding
    // an extra box to the page. Needed because a component returns ONE thing.
    <>
      {clubs.map((club) => (
        <Marker
          key={club.id} // lets React tell the markers apart when the list changes
          position={[club.lat, club.lng]}
          icon={ICONS[club.sport]}
        >
          <Popup>
            <p className="venue-popup-title">{club.name}</p>
            {/* Only show the styles line if this club has one. */}
            {club.styles && <p>{club.styles}</p>}
            <p className="venue-popup-borough">
              {club.neighborhood} · {club.address}
            </p>
            <p>{club.trial}</p>
            {/* target="_blank" opens a new tab, so the map stays open.
                rel="noreferrer" is the safe default for links to other sites. */}
            <a href={club.website} target="_blank" rel="noreferrer">
              Website
            </a>
          </Popup>
        </Marker>
      ))}
    </>
  )
}

export default ClubMarkers
