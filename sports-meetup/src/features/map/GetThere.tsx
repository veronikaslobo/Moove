import type { LatLng, TravelMode } from '../../shared/geo.ts'
import {
  cyclingMinutes,
  directionsUrl,
  distanceKm,
  formatDistance,
  walkingMinutes,
  WALKABLE_KM,
} from '../../shared/geo.ts'
import type { Venue } from '../../shared/venues.ts'

type GetThereProps = {
  venue: Venue
  myPosition: LatLng | null // null until the user taps "Near me"
}

// Walk and bike first on purpose: the greenest options are the easiest to tap.
const MODES: { mode: TravelMode; label: string }[] = [
  { mode: 'walking', label: 'Walk' },
  { mode: 'bicycling', label: 'Bike' },
  { mode: 'transit', label: 'Transit' },
]

function GetThere({ venue, myPosition }: GetThereProps) {
  const destination: LatLng = [venue.lat, venue.lng]

  // Distance line, only once we know where the user is.
  let distanceLine = null
  if (myPosition) {
    const km = distanceKm(myPosition, destination)
    distanceLine =
      km <= WALKABLE_KM
        ? `${formatDistance(km)} · ~${walkingMinutes(km)} min walk`
        : `${formatDistance(km)} · ~${cyclingMinutes(km)} min by bike`
  }

  return (
    <div className="get-there">
      <p className="get-there-title">
        Get there {distanceLine && <span className="get-there-distance">{distanceLine}</span>}
      </p>
      <div className="get-there-buttons">
        {MODES.map(({ mode, label }) => (
          <a
            key={mode}
            href={directionsUrl(destination, mode)}
            target="_blank"
            rel="noreferrer"
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  )
}

export default GetThere
