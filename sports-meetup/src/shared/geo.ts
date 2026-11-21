// Distances and travel estimates for the "Get there" feature.
// Only distances and times: we deliberately show no CO2 numbers,
// because we have no reliable source for them.

export type LatLng = [number, number]

// The "walkable" distance (green dots) is a user setting: see preferences.ts.

// Typical city speeds, used only for rough "~15 min" estimates.
const WALKING_KM_PER_HOUR = 5
const CYCLING_KM_PER_HOUR = 15

// Straight-line distance between two points on Earth (haversine formula).
// Real routes are a bit longer, which is why the times say "~".
export function distanceKm(from: LatLng, to: LatLng): number {
  const EARTH_RADIUS_KM = 6371
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180

  const latDelta = toRadians(to[0] - from[0])
  const lngDelta = toRadians(to[1] - from[1])
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(from[0])) * Math.cos(toRadians(to[0])) * Math.sin(lngDelta / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

// For round setting values: 0.5 → "500 m", 1 → "1 km", 2 → "2 km".
export function formatSettingDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`
}

function minutesAt(km: number, kmPerHour: number): number {
  return Math.max(1, Math.round((km / kmPerHour) * 60))
}

export function walkingMinutes(km: number): number {
  return minutesAt(km, WALKING_KM_PER_HOUR)
}

export function cyclingMinutes(km: number): number {
  return minutesAt(km, CYCLING_KM_PER_HOUR)
}

export type TravelMode = 'walking' | 'bicycling' | 'transit'

// Opens Google Maps directions to the spot. Without an origin, Google Maps
// starts from the user's own location. No API key needed.
export function directionsUrl(destination: LatLng, mode: TravelMode): string {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination[0]},${destination[1]}`,
    travelmode: mode,
  })
  return `https://www.google.com/maps/dir/?${params}`
}
