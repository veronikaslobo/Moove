import { Marker, Popup } from 'react-leaflet'
import type { Club, ClubSport } from '../data/clubs.ts'
import FavouriteButton from '../features/favourites/FavouriteButton.tsx'
import { clubCowIcon } from './cowIcon.ts'

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
          icon={clubCowIcon(SPORT_EMOJI[club.sport])} // a Moove cow wearing the sport's emoji
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
