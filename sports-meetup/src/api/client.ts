// Every request to the backend should go through api(), so that:
//  - the login cookie is sent along (credentials: 'include'), and
//  - errors always look the same (an ApiError with a short code like 'invalid_credentials').
const BASE: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

type Options = { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown }

export async function api<T = unknown>(
  path: string,
  { method = 'GET', body }: Options = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null as T

  let data: { detail?: unknown } | null = null
  try {
    data = await res.json()
  } catch {
    // empty or non-JSON body
  }
  if (!res.ok) {
    throw new ApiError(res.status, typeof data?.detail === 'string' ? data.detail : 'invalid_input')
  }
  return data as T
}
