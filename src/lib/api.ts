const TOKEN_KEY = 'hvac_auth_token'

let currentToken: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null

export function getToken(): string | null {
  return currentToken
}

export function setToken(token: string | null): void {
  currentToken = token
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  if (currentToken) headers.set('Authorization', `Bearer ${currentToken}`)
  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(path, { ...init, headers })
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<{ data: T | null; error: { message: string } | null }> {
  try {
    const res = await apiFetch(path, init)
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      return { data: null, error: { message: (body as { error?: string })?.error ?? res.statusText } }
    }
    return { data: body as T, error: null }
  } catch (err) {
    return { data: null, error: { message: err instanceof Error ? err.message : 'Network error' } }
  }
}
