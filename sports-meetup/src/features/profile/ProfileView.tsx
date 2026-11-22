import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ApiError } from '../../api/client.ts'
import { deletePicture, getProfile, pictureSrc, saveProfile, uploadPicture } from './api.ts'
import type { Gender, Profile } from './api.ts'
import './profile.css'

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

const MAX_PHOTO_MB = 5

const MESSAGES: Record<string, string> = {
  unsupported_image: 'That file is not a usable photo. Please use a JPEG, PNG or WebP image.',
  image_too_large: `That photo is too big (maximum ${MAX_PHOTO_MB} MB).`,
  invalid_input: 'Please check your details. A year of birth must be a real year, and you must be at least 18.',
  not_authenticated: 'Your session expired. Please log in again.',
}

function messageFor(err: unknown): string {
  const code = err instanceof ApiError ? err.detail : ''
  return MESSAGES[code] ?? 'Something went wrong. Please try again.'
}

export default function ProfileView() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getProfile()
      .then((p) => {
        if (cancelled) return
        setProfile(p)
        setName(p.display_name ?? '')
        setBirthYear(p.birth_year ? String(p.birth_year) : '')
        setGender(p.gender ?? '')
      })
      .catch(() => !cancelled && setError('Could not load your profile.'))
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)
    const year = birthYear.trim() === '' ? null : Number(birthYear)
    if (year !== null && !Number.isInteger(year)) {
      setError('Year of birth must be a number, for example 1999.')
      return
    }
    setSaving(true)
    try {
      setProfile(
        await saveProfile({
          display_name: name.trim() || null,
          birth_year: year,
          gender: gender === '' ? null : gender,
        }),
      )
      setSaved(true)
    } catch (err) {
      setError(messageFor(err))
    } finally {
      setSaving(false)
    }
  }

  async function onPickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // lets you pick the same file again later
    if (!file) return
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setError(MESSAGES.image_too_large)
      return
    }
    setError('')
    setPhotoBusy(true)
    try {
      const { picture_url } = await uploadPicture(file)
      setProfile((p) => (p ? { ...p, picture_url } : p))
    } catch (err) {
      setError(messageFor(err))
    } finally {
      setPhotoBusy(false)
    }
  }

  async function onRemovePhoto() {
    setError('')
    setPhotoBusy(true)
    try {
      await deletePicture()
      setProfile((p) => (p ? { ...p, picture_url: null } : p))
    } catch (err) {
      setError(messageFor(err))
    } finally {
      setPhotoBusy(false)
    }
  }

  if (!profile) return <div className="page-content"><p>{error || 'Loading…'}</p></div>

  const photo = pictureSrc(profile.picture_url)
  const initial = (name || profile.email).charAt(0).toUpperCase()

  return (
    <section className="page-content">
      <h1>Profile</h1>

      <div className="profile-photo">
        <div className="profile-avatar" aria-hidden={photo === null}>
          {photo ? <img src={photo} alt="Your profile picture" /> : <span>{initial}</span>}
        </div>
        <div className="profile-photo-actions">
          <label className={`profile-button${photoBusy ? ' is-disabled' : ''}`}>
            {photo ? 'Change photo' : 'Add a photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickPhoto}
                   disabled={photoBusy} hidden />
          </label>
          {photo && (
            <button type="button" className="profile-link" onClick={onRemovePhoto} disabled={photoBusy}>
              Remove photo
            </button>
          )}
          <small>JPEG, PNG or WebP, up to {MAX_PHOTO_MB} MB.</small>
        </div>
      </div>

      <form className="profile-form" onSubmit={onSubmit}>
        <label>
          Name
          <input type="text" value={name} maxLength={50} autoComplete="nickname"
                 onChange={(e) => { setName(e.target.value); setSaved(false) }} />
          <small>The name other players will see.</small>
        </label>

        <label>
          Email
          <input type="email" value={profile.email} disabled />
          <small>This is your login email. Changing it isn't supported yet.</small>
        </label>

        <label>
          Year of birth
          <input type="number" inputMode="numeric" value={birthYear} placeholder="e.g. 1999"
                 onChange={(e) => { setBirthYear(e.target.value); setSaved(false) }} />
          <small>
            Optional and private for now.
            {profile.age !== null && ` You are about ${profile.age}.`}
          </small>
        </label>

        <label>
          Gender
          <select value={gender} onChange={(e) => { setGender(e.target.value as Gender | ''); setSaved(false) }}>
            <option value="">Not set</option>
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <small>Optional and private for now.</small>
        </label>

        {error && <p role="alert" className="profile-error">{error}</p>}
        {saved && <p role="status" className="profile-saved">Saved.</p>}

        <button type="submit" className="profile-button" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </section>
  )
}
