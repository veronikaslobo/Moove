import { sportLabel } from '../../shared/sports.ts'
import type { Venue } from '../../shared/venues.ts'

// OpenStreetMap writes days as two letters ("Mo-Fr 07:00-22:00").
const DAY_NAMES: Record<string, string> = {
  Mo: 'Mon',
  Tu: 'Tue',
  We: 'Wed',
  Th: 'Thu',
  Fr: 'Fri',
  Sa: 'Sat',
  Su: 'Sun',
}

// "Mo-Fr 07:00-22:00; Sa-Su 09:00-17:00; PH off"
// → ["Mon-Fri 07:00-22:00", "Sat-Sun 09:00-17:00", "closed on holidays"]
function readableHours(openingHours: string): string[] {
  return openingHours.split(';').map((part) =>
    part
      .trim()
      .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, (day) => DAY_NAMES[day])
      .replace(/^PH off$/, 'closed on holidays'),
  )
}

const WHEELCHAIR_TEXT: Record<string, string> = {
  yes: 'Wheelchair accessible',
  designated: 'Wheelchair accessible',
  limited: 'Partly wheelchair accessible',
  no: 'Not wheelchair accessible',
}

// The top of a venue popup. City facility names are generic ("Balle",
// "Tennis"), so when we know the park, the park is the title:
//   Parc Jarry
//   Balle · Villeray-Saint-Michel-Parc-Extension
export function VenueHeading({ venue }: { venue: Venue }) {
  const subtitle = venue.parkName
    ? [venue.name, venue.borough].filter(Boolean).join(' · ')
    : venue.borough

  return (
    <>
      <p className="venue-popup-title">{venue.parkName ?? venue.name}</p>
      {subtitle && <p className="venue-popup-borough">{subtitle}</p>}
    </>
  )
}

// The info block under a venue's name in its map popup: what you can play
// there, then whatever extra info the data has (indoor places only).
function VenueDetails({ venue }: { venue: Venue }) {
  const details = venue.details ?? {}

  // Short tags shown side by side, only the ones we know.
  // Good news (free, accessible) is green; the rest is grey.
  const badges: { text: string; isGood: boolean }[] = []
  if (details.fee === 'no') badges.push({ text: 'Free entry', isGood: true })
  if (details.fee === 'yes') badges.push({ text: 'Paid entry', isGood: false })
  const wheelchairText = details.wheelchair && WHEELCHAIR_TEXT[details.wheelchair]
  if (wheelchairText) {
    badges.push({ text: wheelchairText, isGood: details.wheelchair !== 'no' })
  }

  return (
    <div className="venue-details">
      <p className="venue-details-sports">{venue.sports.map(sportLabel).join(' · ')}</p>

      {details.address && <p>{details.address}</p>}

      {details.openingHours && (
        <div className="venue-details-hours">
          {readableHours(details.openingHours).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}

      {badges.length > 0 && (
        <p className="venue-details-badges">
          {badges.map((badge) => (
            <span key={badge.text} className={badge.isGood ? 'good' : ''}>
              {badge.text}
            </span>
          ))}
        </p>
      )}

      {(details.website || details.phone) && (
        <p className="venue-details-links">
          {/* New tab, so the map stays open. */}
          {details.website && (
            <a href={details.website} target="_blank" rel="noreferrer">
              Website
            </a>
          )}
          {/* tel: opens the phone app on a phone. Spaces and dashes are removed. */}
          {details.phone && (
            <a href={`tel:${details.phone.replace(/[\s-]/g, '')}`}>{details.phone}</a>
          )}
        </p>
      )}
    </div>
  )
}

export default VenueDetails
