// Every request to the backend should go through api(), so that:
//  - the login cookie is sent along (credentials: 'include'), and
//  - errors always look the same (an ApiError with a short code like 'invalid_credentials').
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

// body    = something to send as JSON.
// rawBody = a file to send as-is (used for picture uploads).
type Options = { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown; rawBody?: Blob }

export async function api<T = unknown>(
  path: string,
  { method = 'GET', body, rawBody }: Options = {},
): Promise<T> {
  let headers: Record<string, string> | undefined
  let payload: BodyInit | undefined
  if (rawBody) {
    headers = { 'Content-Type': rawBody.type || 'application/octet-stream' }
    payload = rawBody
  } else if (body !== undefined) {
    headers = { 'Content-Type': 'application/json' }
    payload = JSON.stringify(body)
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: payload,
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
