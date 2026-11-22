import { useEffect, useState } from 'react'
import { CLUB_SPORTS, clubs } from '../../data/clubs.ts'
import { sportLabel } from '../../shared/sports.ts'
import { useVenues, venueDisplayName } from '../../shared/venues.ts'
import type { SkillLevel } from '../games/api.ts'
import { getFavourites } from './api.ts'
import type { Favourites } from './api.ts'
import FavouriteButton from './FavouriteButton.tsx'
import './favourites.css'

const SKILL_LABELS: Record<SkillLevel, string> = {
  all: 'All levels',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

function formatWhen(startsAt: string): string {
  // The backend sends UTC; the browser shows it in the user's own time zone.
  return new Date(startsAt).toLocaleString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDay(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Everything the user saved, in three separate lists: games, free trials, posts.
// Un-hearting something here leaves it on screen (with an empty heart) so a slip
// can be undone; it is gone the next time this page opens.
function FavouritesView() {
  const [favourites, setFavourites] = useState<Favourites | null>(null)
  const [hasFailed, setHasFailed] = useState(false)
  const { venuesById } = useVenues()

  useEffect(() => {
    let cancelled = false
    getFavourites()
      .then((loaded) => !cancelled && setFavourites(loaded))
      .catch(() => !cancelled && setHasFailed(true))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="page-content favourites">
      <h1>Favourites</h1>

      {hasFailed && (
        <p className="favourites-problem">Could not load your favourites. Is the backend running?</p>
      )}
      {!favourites && !hasFailed && <p>Loading…</p>}

      {favourites && (
        <>
          <h2>
            Games <span className="favourites-count">{favourites.games.length}</span>
          </h2>
          {favourites.games.length === 0 ? (
            <p className="favourites-empty">
              No saved games. Tap the heart on a game to keep it here.
            </p>
          ) : (
            <ul className="favourites-list">
              {favourites.games.map((game) => (
                <li key={game.id} className={game.past ? 'favourite-card is-past' : 'favourite-card'}>
                  <div className="favourite-card-main">
                    <div className="favourite-card-title">
                      <h3>{sportLabel(game.sport)}</h3>
                      {game.past && <span className="favourite-tag">Ended</span>}
                    </div>
                    <p>{formatWhen(game.starts_at)}</p>
                    <p>{venuesById.size > 0 ? venueDisplayName(venuesById.get(game.venue_id)) : ''}</p>
                    <p className="favourite-card-meta">
                      {SKILL_LABELS[game.skill_level]}
                      {!game.past && ` · ${game.spots_left} of ${game.total_spots} spots left`}
                    </p>
                    {game.notes && <p className="favourite-card-notes">{game.notes}</p>}
                  </div>
                  <FavouriteButton kind="game" id={game.id} label="this game" />
                </li>
              ))}
            </ul>
          )}

          <h2>
            Free trials <span className="favourites-count">{favourites.trials.length}</span>
          </h2>
          {favourites.trials.length === 0 ? (
            <p className="favourites-empty">
              No saved free trials. Open the Free trials view on the map and tap a heart.
            </p>
          ) : (
            <ul className="favourites-list">
              {favourites.trials.map((trialId) => {
                const club = clubs.find((candidate) => candidate.id === Number(trialId))
                return (
                  <li key={trialId} className="favourite-card">
                    <div className="favourite-card-main">
                      {club ? (
                        <>
                          <div className="favourite-card-title">
                            <h3>{club.name}</h3>
                            <span className="favourite-tag">
                              {CLUB_SPORTS.find((sport) => sport.slug === club.sport)?.label ?? club.sport}
                            </span>
                          </div>
                          <p>{club.trial}</p>
                          <p className="favourite-card-meta">
                            {club.neighborhood} · {club.address}
                          </p>
                          <a href={club.website} target="_blank" rel="noreferrer">
                            Website
                          </a>
                        </>
                      ) : (
                        <p className="favourite-card-meta">This free trial is no longer listed.</p>
                      )}
                    </div>
                    <FavouriteButton kind="trial" id={Number(trialId)} label="this free trial" />
                  </li>
                )
              })}
            </ul>
          )}

          <h2>
            Posts <span className="favourites-count">{favourites.posts.length}</span>
          </h2>
          {favourites.posts.length === 0 ? (
            <p className="favourites-empty">
              No saved posts. Tap the heart on a post in the Cowmunity tab.
            </p>
          ) : (
            <ul className="favourites-list">
              {favourites.posts.map((post) => (
                <li key={post.id} className="favourite-card">
                  <div className="favourite-card-main">
                    <div className="favourite-card-title">
                      <h3>{post.author_name ?? 'A Moove member'}</h3>
                      <time className="favourite-tag" dateTime={post.created_at}>
                        {formatDay(post.created_at)}
                      </time>
                    </div>
                    <p className="favourite-card-body">{post.body}</p>
                  </div>
                  <FavouriteButton kind="post" id={post.id} label="this post" />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

export default FavouritesView
