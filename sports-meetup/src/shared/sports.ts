// The ONE sports list used by all four features (picker, map, clubs, games).
// slug = what is stored and compared; label = what the user reads.
// Starter set: the team should adjust it, but only ever in this file.
export const SPORTS = [
  { slug: 'basketball', label: 'Basketball' },
  { slug: 'soccer', label: 'Soccer' },
  { slug: 'volleyball', label: 'Volleyball' },
  { slug: 'tennis', label: 'Tennis' },
  { slug: 'badminton', label: 'Badminton' },
  { slug: 'hockey', label: 'Hockey' },
  { slug: 'baseball', label: 'Baseball' },
  { slug: 'pickleball', label: 'Pickleball' },
]

export function sportLabel(slug: string): string {
  const sport = SPORTS.find((candidate) => candidate.slug === slug)
  return sport ? sport.label : slug
}
