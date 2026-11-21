import { useEffect, useState } from 'react'
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
}

// Both files are served from /public.
// City of Montréal outdoor sports facilities (CC-BY 4.0).
const CITY_DATA_URL = '/terrain_sport_ext.json'
// Indoor facilities exported from OpenStreetMap with overpass-turbo (ODbL).
const INDOOR_DATA_URL = '/indoor_facilities.json'

type CityFacility = {
  properties: { ID: string; NOM: string | null; ARROND: string | null }
  geometry: { coordinates: [number, number] } // GeoJSON order: [lng, lat]
}

function toVenues(facilities: CityFacility[]): Venue[] {
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
    })
  }
  return venues
}

type OsmFacility = {
  id: string // e.g. "node/123456" or "way/123456"
  properties: { name?: string; sport?: string; leisure?: string }
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

function osmToVenues(facilities: OsmFacility[]): Venue[] {
  const venues: Venue[] = []
  for (const facility of facilities) {
    const { name, sport, leisure } = facility.properties
    // Without a name the popup would just say "Baseball" with no borough to
    // tell it apart, so unnamed places (mostly single climbing routes and
    // ball fields already in the city file) are left out.
    if (!name) continue

    const sports = osmSports(name, sport, leisure)
    if (sports.length === 0) continue // no sport the app knows (e.g. golf, karting)

    // A line (e.g. a climbing route) is placed at its first point.
    const [lng, lat] =
      facility.geometry.type === 'Point'
        ? facility.geometry.coordinates
        : facility.geometry.coordinates[0]

    venues.push({ id: `osm:${facility.id}`, name, borough: '', lat, lng, sports })
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
    venuesRequest = Promise.all([fetchFeatures(CITY_DATA_URL), fetchFeatures(INDOOR_DATA_URL)])
      .then(([cityFeatures, indoorFeatures]) => [
        ...toVenues(cityFeatures as CityFacility[]),
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

  const venuesById = new Map(venues.map((venue) => [venue.id, venue]))
  return { venues, venuesById, hasFailed }
}

// City names are often generic ("Tennis"), so the borough tells them apart.
export function venueDisplayName(venue: Venue | undefined): string {
  if (!venue) return 'Unknown venue'
  return venue.borough ? `${venue.name}, ${venue.borough}` : venue.name
}
