// TEMPORARY: stand-in venues so the create form and the cards work
// before the real venues.json exists. The ids match backend/seed.py.
// Delete this file and read venues.json once the map feature provides it.
export const PLACEHOLDER_VENUES = [
  { id: 'osm:way/REPLACE_1', name: 'Placeholder court 1' },
  { id: 'osm:way/REPLACE_2', name: 'Placeholder field 2' },
  { id: 'osm:way/REPLACE_3', name: 'Placeholder court 3' },
  { id: 'osm:way/REPLACE_4', name: 'Placeholder court 4' },
]

export function venueName(venueId: string): string {
  const venue = PLACEHOLDER_VENUES.find((candidate) => candidate.id === venueId)
  return venue ? venue.name : venueId
}
