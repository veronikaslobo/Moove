// The ONE sports list used by all features (picker, map, clubs, games).
// slug     = what is stored and compared (games.sport, venue.sports)
// label    = what the user reads
// keywords = words that identify this sport in a City of Montréal facility
//            name (NOM column). The order matters: the first sport whose
//            keyword matches wins. Keyword list comes from the map feature.
export const SPORTS = [
  { slug: 'basketball', label: 'Basketball', keywords: ['basket'] },
  { slug: 'soccer', label: 'Soccer', keywords: ['soccer'] },
  { slug: 'tennis', label: 'Tennis', keywords: ['tennis'] },
  { slug: 'pickleball', label: 'Pickleball', keywords: ['pickleball'] },
  { slug: 'volleyball', label: 'Volleyball', keywords: ['volley'] },
  { slug: 'baseball', label: 'Baseball', keywords: ['baseball', 'balle'] },
  { slug: 'football', label: 'Football', keywords: ['football'] },
  { slug: 'skatepark', label: 'Skatepark', keywords: ['planche', 'skate'] },
  { slug: 'skating', label: 'Skating rink', keywords: ['patinoire'] },
  { slug: 'swimming', label: 'Pool', keywords: ['piscine'] },
  { slug: 'outdoor-gym', label: 'Outdoor gym', keywords: ['entraînement', 'exercice'] },
  { slug: 'petanque', label: 'Pétanque', keywords: ['pétanque'] },
  { slug: 'badminton', label: 'Badminton', keywords: ['badminton'] },
  { slug: 'hockey', label: 'Hockey', keywords: ['hockey'] },
]

export function sportLabel(slug: string): string {
  const sport = SPORTS.find((candidate) => candidate.slug === slug)
  return sport ? sport.label : slug
}

// Returns the sport slug for a facility name, or null when the facility
// is not a sport we care about (playgrounds, benches, etc.).
export function sportFromFacilityName(facilityName: string): string | null {
  const name = facilityName.toLowerCase()
  const sport = SPORTS.find((candidate) =>
    candidate.keywords.some((keyword) => name.includes(keyword)),
  )
  return sport ? sport.slug : null
}
