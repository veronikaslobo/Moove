import { CircleMarker, Popup } from 'react-leaflet'
import type { Club } from '../data/clubs.ts'

// Orange, so clubs never look like the grey venues or purple games.
const CLUB_STYLE = { color: '#c2410c', fillColor: '#f97316', fillOpacity: 0.9, weight: 2 }

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
        <CircleMarker
          key={club.id} // lets React tell the markers apart when the list changes
          center={[club.lat, club.lng]}
          radius={8}
          pathOptions={CLUB_STYLE}
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
        </CircleMarker>
      ))}
    </>
  )
}

export default ClubMarkers
