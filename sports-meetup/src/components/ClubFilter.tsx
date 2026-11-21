import { CLUB_SPORTS } from '../data/clubs.ts'

// This component does NOT own the selected sport. The parent (VenueMap) does,
// because the parent also needs it to filter the clubs. So the parent passes:
//   value    = the sport currently selected
//   onChange = a function to call when the user picks another one
// This pattern is called "lifting state up".
type ClubFilterProps = {
  value: string
  onChange: (sport: string) => void
}

function ClubFilter({ value, onChange }: ClubFilterProps) {
  return (
    <select
      aria-label="Filter free trials by sport"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="all">All sports</option>
      {CLUB_SPORTS.map((sport) => (
        <option key={sport.slug} value={sport.slug}>
          {sport.label}
        </option>
      ))}
    </select>
  )
}

export default ClubFilter
