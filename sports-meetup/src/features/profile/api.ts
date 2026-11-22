// All calls to the backend's /profile endpoints live here.
import { api, API_URL } from '../../api/client.ts'

export type Gender = 'woman' | 'man' | 'non_binary' | 'other' | 'prefer_not_to_say'

export type Profile = {
  email: string // comes from the account; cannot be edited here
  display_name: string | null
  birth_year: number | null
  age: number | null
  gender: Gender | null
  picture_url: string | null // relative, e.g. "/profile/picture/abc?v=..."; see pictureSrc()
}

export type ProfileInput = {
  display_name: string | null
  birth_year: number | null
  gender: Gender | null
}

export const getProfile = () => api<Profile>('/profile')

export const saveProfile = (input: ProfileInput) =>
  api<Profile>('/profile', { method: 'PUT', body: input })

export const uploadPicture = (file: File) =>
  api<{ picture_url: string }>('/profile/picture', { method: 'PUT', rawBody: file })

export const deletePicture = () => api<null>('/profile/picture', { method: 'DELETE' })

// The picture lives on the backend, so the <img> needs the full address.
export const pictureSrc = (url: string | null) => (url ? API_URL + url : null)
