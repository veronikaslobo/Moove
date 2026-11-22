import { divIcon } from 'leaflet'
import type { DivIcon } from 'leaflet'
import { Marker, Popup } from 'react-leaflet'
import type { Club } from '../data/clubs.ts'
import FavouriteButton from '../features/favourites/FavouriteButton.tsx'
import './ClubMarkers.css'

// A free-trial club = a plain purple circle (no cow: the cows are for
// venues with games). Plain HTML + CSS, see ClubMarkers.css.
const CIRCLE_SIZE = 14 // px on screen

// Every club uses the same icon, so it's built once.
const CLUB_ICON: DivIcon = divIcon({
  className: 'club-marker', // the box Leaflet moves; styled in ClubMarkers.css
  html: '<div class="club-marker-circle"></div>',
  iconSize: [CIRCLE_SIZE, CIRCLE_SIZE],
  // The CENTRE of the circle sits on the exact location, like a dot.
  iconAnchor: [CIRCLE_SIZE / 2, CIRCLE_SIZE / 2],
  popupAnchor: [0, -CIRCLE_SIZE / 2], // open the popup just above the circle
})

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
          icon={CLUB_ICON} // plain purple circle
        >
          <Popup>
            <div className="fav-title-row">
              <p className="venue-popup-title">{club.name}</p>
              <FavouriteButton kind="trial" id={club.id} label="this free trial" />
            </div>
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
