import { useEffect, useState } from 'react'
import { sportFromFacilityName } from './sports.ts'

// The shared venue shape every feature uses.
export type Venue = {
  id: string // "mtl:" + the city's ID, e.g. "mtl:049-0030". Stored in games.venue_id.
  name: string
  borough: string
  lat: number
  lng: number
  sports: string[] // sport slugs from sports.ts
}

// City of Montréal sports facilities (CC-BY 4.0), served from /public.
const DATA_URL = '/terrain_sport_ext.json'

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

// The file is 1.2 MB, so it is downloaded once and shared by every
// component that asks for venues (map, create form, game cards).
let venuesRequest: Promise<Venue[]> | null = null

export function loadVenues(): Promise<Venue[]> {
  if (!venuesRequest) {
    venuesRequest = fetch(DATA_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Venues failed (${response.status})`)
        return response.json()
      })
      .then((geojson) => toVenues(geojson.features))
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
