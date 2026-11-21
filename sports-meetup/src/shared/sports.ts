// The ONE sports list used by all features (picker, map, clubs, games).
// slug     = what is stored and compared (games.sport, venue.sports)
// label    = what the user reads
// keywords = words that identify this sport in a City of Montréal facility
//            name (NOM column). The order matters: the first sport whose
//            keyword matches wins. Keyword list comes from the map feature.
// osmTags  = values of the OpenStreetMap "sport" tag that mean this sport
//            (used for the indoor facilities file). Several OSM values can
//            point to one slug, e.g. ice_skating and figure_skating → skating.
//
// The sports after "hockey" only come from OpenStreetMap, so their keywords
// are empty: that way the city facilities are matched exactly as before.
export const SPORTS = [
  { slug: 'basketball', label: 'Basketball', keywords: ['basket'], osmTags: ['basketball'] },
  { slug: 'soccer', label: 'Soccer', keywords: ['soccer'], osmTags: ['soccer', 'futsal'] },
  { slug: 'tennis', label: 'Tennis', keywords: ['tennis'], osmTags: ['tennis', 'padel'] },
  { slug: 'pickleball', label: 'Pickleball', keywords: ['pickleball'], osmTags: ['pickleball'] },
  {
    slug: 'volleyball',
    label: 'Volleyball',
    keywords: ['volley'],
    osmTags: ['volleyball', 'beachvolleyball'],
  },
  {
    slug: 'baseball',
    label: 'Baseball',
    keywords: ['baseball', 'balle'],
    osmTags: ['baseball', 'softball'],
  },
  {
    slug: 'football',
    label: 'Football',
    keywords: ['football'],
    osmTags: ['american_football', 'canadian_football'],
  },
  { slug: 'skatepark', label: 'Skatepark', keywords: ['planche', 'skate'], osmTags: ['skateboard'] },
  {
    slug: 'skating',
    label: 'Skating rink',
    keywords: ['patinoire'],
    osmTags: ['skating', 'ice_skating', 'figure_skating', 'recreational_skating'],
  },
  {
    slug: 'swimming',
    label: 'Pool',
    keywords: ['piscine'],
    osmTags: ['swimming', 'diving', 'water_polo', 'waterpolo'],
  },
  {
    slug: 'outdoor-gym',
    label: 'Outdoor gym',
    keywords: ['entraînement', 'exercice'],
    osmTags: [],
  },
  { slug: 'petanque', label: 'Pétanque', keywords: ['pétanque'], osmTags: ['boules'] },
  { slug: 'badminton', label: 'Badminton', keywords: ['badminton'], osmTags: ['badminton'] },
  {
    slug: 'hockey',
    label: 'Hockey',
    keywords: ['hockey'],
    osmTags: ['hockey', 'ice_hockey', 'ringuette'],
  },

  // From here on: indoor sports from OpenStreetMap only.
  {
    slug: 'climbing',
    label: 'Climbing',
    keywords: [],
    osmTags: ['climbing', 'bouldering', 'route_climbing', 'ice_climbing'],
  },
  {
    slug: 'gym',
    label: 'Gym / fitness',
    keywords: [],
    osmTags: ['fitness', 'gym', 'crossfit', 'weightlifting', 'exercise', 'trx', 'tabata'],
  },
  {
    slug: 'yoga',
    label: 'Yoga / pilates',
    keywords: [],
    osmTags: ['yoga', 'pilates', 'essentrics'],
  },
  {
    slug: 'martial-arts',
    label: 'Martial arts',
    keywords: [],
    osmTags: [
      'martial_arts', 'karate', 'judo', 'jiu-jitsu', 'taekwondo', 'kendo', 'kung_fu',
      'krav_maga', 'capoeira', 'mma', 'grappling', 'wrestling', 'muay_thai', 'chan_wu',
    ],
  },
  { slug: 'boxing', label: 'Boxing', keywords: [], osmTags: ['boxing', 'kickboxing'] },
  { slug: 'gymnastics', label: 'Gymnastics', keywords: [], osmTags: ['gymnastics', 'trampoline'] },
  { slug: 'dance', label: 'Dance', keywords: [], osmTags: ['dance', 'danse', 'zumba'] },
  { slug: 'table-tennis', label: 'Table tennis', keywords: [], osmTags: ['table_tennis'] },
  { slug: 'curling', label: 'Curling', keywords: [], osmTags: ['curling'] },
  { slug: 'archery', label: 'Archery', keywords: [], osmTags: ['archery'] },
  // Big centres (CEPSUM, YMCAs…) that host many sports and aren't tagged with one.
  { slug: 'multi-sport', label: 'Sports centre', keywords: [], osmTags: ['multi'] },
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

// Returns the sport slugs for an OpenStreetMap "sport" tag, which can list
// several sports separated by ";" (e.g. "ice_hockey;ice_skating").
// Unknown values (e.g. "multi", "golf") are dropped, and duplicates removed:
// "ice_hockey;hockey" gives just ["hockey"].
export function sportsFromOsmTag(osmSportTag: string): string[] {
  const slugs = new Set<string>()
  for (const tag of osmSportTag.split(';')) {
    const sport = SPORTS.find((candidate) => candidate.osmTags.includes(tag.trim()))
    if (sport) slugs.add(sport.slug)
  }
  return [...slugs]
}
