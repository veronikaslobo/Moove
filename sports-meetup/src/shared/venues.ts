import { useEffect, useState } from 'react'
import { distanceKm } from './geo.ts'
import { sportFromFacilityName, sportsFromOsmTag } from './sports.ts'

// The shared venue shape every feature uses.
export type Venue = {
  // Stored in games.venue_id. The prefix says which file the venue comes from:
  // "mtl:049-0030" = city file, "osm:node/123456" = OpenStreetMap indoor file.
  id: string
  name: string
  borough: string // empty for OpenStreetMap venues (the file has no borough)
  lat: number
  lng: number
  sports: string[] // sport slugs from sports.ts
  // City venues only: the park the facility is in, e.g. "Parc Jarry".
  parkName?: string
  // City venues only: ids of the duplicates folded into this one (see
  // mergeSameSpot). Games saved with one of those ids show up here.
  mergedIds?: string[]
  // Extra info, only for OpenStreetMap venues (the city file has none).
  // Each field is there only when volunteers entered it in OpenStreetMap.
  details?: VenueDetails
}

export type VenueDetails = {
  address?: string // "5300 Boulevard Robert, Montréal"
  website?: string
  phone?: string
  openingHours?: string // OpenStreetMap format: "Mo-Fr 07:00-22:00; Sa-Su 09:00-17:00"
  wheelchair?: string // "yes", "limited", "designated" or "no"
  fee?: string // "no" = free entry, "yes" = paid
}

// Both files are served from /public.
// City of Montréal outdoor sports facilities (CC-BY 4.0).
const CITY_DATA_URL = '/outdoor_facilities.json'
// Indoor facilities exported from OpenStreetMap with overpass-turbo (ODbL).
const INDOOR_DATA_URL = '/indoor_facilities.json'
// Park code → park name, e.g. "0137-000" → "Parc Maurice-Cullen".
// Made from the city's parks file by scripts/build-park-names.cjs (CC-BY 4.0).
const PARK_NAMES_URL = '/park_names.json'

type CityFacility = {
  properties: { ID: string; NOM: string | null; ARROND: string | null; INDEX_PARC: string | null }
  geometry: { coordinates: [number, number] } // GeoJSON order: [lng, lat]
}

type ParkNames = Record<string, string>

function toVenues(facilities: CityFacility[], parkNames: ParkNames): Venue[] {
  const venues: Venue[] = []
  for (const facility of facilities) {
    const name = facility.properties.NOM ?? ''
    const sport = sportFromFacilityName(name)
    if (!sport) continue // not a sport facility (playground, bench…)

    const [lng, lat] = facility.geometry.coordinates
    venues.push({
      id: `mtl:${facility.properties.ID}`,
      name,
      borough: facility.properties.ARROND ?? '',
      lat,
      lng,
      sports: [sport],
      // About 6% of facilities have no code, or one missing from the parks file.
      parkName: parkNames[facility.properties.INDEX_PARC ?? ''],
    })
  }
  return venues
}

// The city lists each court or field separately, and sometimes a field twice
// (a full soccer field, plus its two halves). That stacks several identical
// dots on one spot: Parc Marcel-Laurin had 8 soccer dots. Facilities in the
// same park, for the same sport, within this distance become one dot.
const SAME_SPOT_KM = 0.15

function mergeSameSpot(venues: Venue[]): Venue[] {
  const kept: Venue[] = []
  for (const venue of venues) {
    const twin = venue.parkName
      ? kept.find(
          (other) =>
            other.parkName === venue.parkName &&
            other.sports[0] === venue.sports[0] &&
            distanceKm([other.lat, other.lng], [venue.lat, venue.lng]) <= SAME_SPOT_KM,
        )
      : undefined // without a park we can't tell if it's the same place

    if (!twin) {
      kept.push({ ...venue }) // a copy, so merging below doesn't change the original
      continue
    }
    twin.mergedIds = [...(twin.mergedIds ?? []), venue.id]
    // "Soccer à 11" + "Soccer sous-terrain à 7" → "Soccer à 11 · Soccer sous-terrain à 7"
    if (!twin.name.split(' · ').includes(venue.name)) {
      twin.name = `${twin.name} · ${venue.name}`
    }
  }
  return kept
}

type OsmFacility = {
  id: string // e.g. "node/123456" or "way/123456"
  // OpenStreetMap tag names contain ":", e.g. "addr:street", so they need quotes.
  properties: {
    name?: string
    sport?: string
    leisure?: string
    'addr:housenumber'?: string
    'addr:street'?: string
    'addr:city'?: string
    website?: string
    'contact:website'?: string
    phone?: string
    'contact:phone'?: string
    opening_hours?: string
    wheelchair?: string
    fee?: string
  }
  geometry:
    | { type: 'Point'; coordinates: [number, number] } // [lng, lat]
    | { type: 'LineString'; coordinates: [number, number][] }
}

// Places with no "sport" tag can still say what they are through "leisure".
const SPORT_FROM_LEISURE: Record<string, string> = {
  fitness_centre: 'gym',
  dance: 'dance',
  ice_rink: 'skating',
  sports_centre: 'multi-sport',
  sports_hall: 'multi-sport',
}

// Works out an OpenStreetMap place's sports, trying the most precise clue first.
function osmSports(name: string, sport = '', leisure = ''): string[] {
  // 1. An arena is for hockey and skating, even when tagged "multi".
  if (/ar[eé]na/i.test(name)) return ['hockey', 'skating']
  // 2. The "sport" tag, e.g. "climbing" or "ice_hockey;ice_skating".
  const fromTag = sportsFromOsmTag(sport).filter((slug) => slug !== 'multi-sport')
  if (fromTag.length > 0) return fromTag
  // 3. The name, with the same keywords as the city file ("Piscine…", "Tennis…").
  const fromName = sportFromFacilityName(name)
  if (fromName) return [fromName]
  // 4. What kind of place it is (gym, dance studio, sports centre…).
  if (SPORT_FROM_LEISURE[leisure]) return [SPORT_FROM_LEISURE[leisure]]
  // 5. Tagged "multi" with nothing more precise.
  return sportsFromOsmTag(sport)
}

// The city file only has outdoor rinks, but the OpenStreetMap file mostly has
// arenas. Its skating places count as indoor, except those named "patinoire"
// (the word used for outdoor rinks, e.g. the one at lac aux Castors).
// Checked by hand on all 35 skating places in the file.
function toIndoorOrOutdoorSkating(name: string, sports: string[]): string[] {
  if (/patinoire/i.test(name)) return sports
  return sports.map((slug) => (slug === 'skating' ? 'indoor-skating' : slug))
}

// Collects the extra info of an OpenStreetMap place. Fields the place
// doesn't have stay undefined, and the popup simply skips them.
function osmDetails(tags: OsmFacility['properties']): VenueDetails {
  // "5300" + "Boulevard Robert" + "Montréal" → "5300 Boulevard Robert, Montréal"
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ')
  const address = street ? [street, tags['addr:city']].filter(Boolean).join(', ') : undefined

  return {
    address,
    // A few places use the "contact:" version of the tag instead.
    website: tags.website ?? tags['contact:website'],
    phone: tags.phone ?? tags['contact:phone'],
    openingHours: tags.opening_hours,
    wheelchair: tags.wheelchair,
    fee: tags.fee,
  }
}

function osmToVenues(facilities: OsmFacility[]): Venue[] {
  const venues: Venue[] = []
  for (const facility of facilities) {
    const { name, sport, leisure } = facility.properties
    // Without a name the popup would just say "Baseball" with no borough to
    // tell it apart, so unnamed places (mostly single climbing routes and
    // ball fields already in the city file) are left out.
    if (!name) continue

    const sports = toIndoorOrOutdoorSkating(name, osmSports(name, sport, leisure))
    if (sports.length === 0) continue // no sport the app knows (e.g. golf, karting)

    // A line (e.g. a climbing route) is placed at its first point.
    const [lng, lat] =
      facility.geometry.type === 'Point'
        ? facility.geometry.coordinates
        : facility.geometry.coordinates[0]

    venues.push({
      id: `osm:${facility.id}`,
      name,
      borough: '',
      lat,
      lng,
      sports,
      details: osmDetails(facility.properties),
    })
  }
  return venues
}

function fetchFeatures(url: string): Promise<unknown[]> {
  return fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Venues failed (${response.status})`)
      return response.json()
    })
    .then((geojson) => geojson.features)
}

// The files are 1.2 MB together, so they are downloaded once and shared by
// every component that asks for venues (map, create form, game cards).
let venuesRequest: Promise<Venue[]> | null = null

export function loadVenues(): Promise<Venue[]> {
  if (!venuesRequest) {
    // Park names are a bonus: if that file fails, venues still load without them.
    const parkNamesRequest: Promise<ParkNames> = fetch(PARK_NAMES_URL)
      .then((response) => (response.ok ? response.json() : {}))
      .catch(() => ({}))

    venuesRequest = Promise.all([
      fetchFeatures(CITY_DATA_URL),
      fetchFeatures(INDOOR_DATA_URL),
      parkNamesRequest,
    ])
      .then(([cityFeatures, indoorFeatures, parkNames]) => [
        ...mergeSameSpot(toVenues(cityFeatures as CityFacility[], parkNames)),
        ...osmToVenues(indoorFeatures as OsmFacility[]),
      ])
      .catch((error) => {
        venuesRequest = null // let the next call try again
        throw error
      })
  }
  return venuesRequest
}

export function useVenues() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [hasFailed, setHasFailed] = useState(false)

  useEffect(() => {
    loadVenues()
      .then(setVenues)
      .catch(() => setHasFailed(true))
  }, [])

  // A merged venue is also found under the ids of the duplicates it replaced,
  // so a game saved at one of those still lands on the right dot.
  const venuesById = new Map<string, Venue>()
  for (const venue of venues) {
    venuesById.set(venue.id, venue)
    for (const mergedId of venue.mergedIds ?? []) venuesById.set(mergedId, venue)
  }
  return { venues, venuesById, hasFailed }
}

// City names are often generic ("Tennis"), so the park (or, failing that,
// the borough) tells them apart: "Tennis, Parc Jarry".
export function venueDisplayName(venue: Venue | undefined): string {
  if (!venue) return 'Unknown venue'
  const where = venue.parkName ?? venue.borough
  return where ? `${venue.name}, ${where}` : venue.name
}
