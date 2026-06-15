import type {
  EventItem,
  MeResponse,
  ModLookupResponse,
  RecipeCreatePayload,
  RecipeDetail,
  RecipeListResponse,
  RecipeSlot,
} from '../types'

export const API_BASE = 'https://scalpel-craft-companion-api.vercel.app'

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(status: number, body: unknown, message: string) {
    super(message)
    this.status = status
    this.body = body
  }
}

interface RequestOpts {
  method?: string
  body?: unknown
  token?: string | null
  headers?: Record<string, string>
}

export async function api<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  let json: unknown = null
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) {
    try {
      json = await res.json()
    } catch {}
  }
  if (!res.ok) {
    const msg =
      (json && typeof json === 'object' && 'error' in json && typeof (json as { error: unknown }).error === 'string'
        ? (json as { error: string }).error
        : null) ?? `HTTP ${res.status}`
    throw new ApiError(res.status, json, msg)
  }
  return json as T
}

// --- Auth (device-code flow) ---

export interface PollResponse {
  status: 'pending' | 'ready' | 'expired'
  token?: string
  user?: MeResponse['user']
}

export async function initAuth(deviceCode: string): Promise<{ code: string; authorizeUrl: string }> {
  const res = await fetch(`${API_BASE}/api/auth/start?device=${encodeURIComponent(deviceCode)}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new ApiError(res.status, null, `HTTP ${res.status}`)
  return res.json()
}

export async function pollAuth(deviceCode: string): Promise<PollResponse> {
  try {
    return await api<PollResponse>(`/api/auth/poll?code=${encodeURIComponent(deviceCode)}`)
  } catch (e) {
    if (e instanceof ApiError && e.status === 202) return { status: 'pending' }
    if (e instanceof ApiError && e.status === 404) return { status: 'expired' }
    throw e
  }
}

export async function getMe(token: string): Promise<MeResponse> {
  return api<MeResponse>('/api/me', { token })
}

// --- Recipes ---

export interface ListRecipesQuery {
  slot?: RecipeSlot
  poeVersion?: 1 | 2
  league?: string
  status?: 'draft' | 'published'
  authorId?: string
  q?: string
  sort?: 'top' | 'recent' | 'trending'
  page?: number
  pageSize?: number
}

export async function listRecipes(
  token: string | null,
  query: ListRecipesQuery = {},
): Promise<RecipeListResponse> {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) if (v != null && v !== '') sp.set(k, String(v))
  const qs = sp.toString()
  return api(`/api/recipes${qs ? `?${qs}` : ''}`, { token })
}

export async function getRecipe(
  token: string | null,
  id: string,
): Promise<{ recipe: RecipeDetail; myVote: number | null }> {
  return api(`/api/recipes/${id}`, { token })
}

export async function createRecipe(token: string, payload: RecipeCreatePayload): Promise<{ id: string }> {
  return api('/api/recipes', { method: 'POST', body: payload, token })
}

export async function updateRecipe(token: string, id: string, payload: Partial<RecipeCreatePayload>): Promise<{ ok: true }> {
  return api(`/api/recipes/${id}`, { method: 'PATCH', body: payload, token })
}

export async function deleteRecipe(token: string, id: string): Promise<{ ok: true }> {
  return api(`/api/recipes/${id}`, { method: 'DELETE', token })
}

export async function publishRecipe(token: string, id: string): Promise<{ ok: true; status: string }> {
  return api(`/api/recipes/${id}/publish`, { method: 'POST', token })
}

export async function voteRecipe(
  token: string,
  id: string,
  value: -1 | 0 | 1,
): Promise<{ ok: true; myVote: number }> {
  return api(`/api/recipes/${id}/vote`, { method: 'POST', body: { value }, token })
}

export async function reportRecipe(token: string, id: string, reason: string): Promise<{ ok: true; totalReports: number }> {
  return api(`/api/recipes/${id}/report`, { method: 'POST', body: { reason }, token })
}

export async function commentOnRecipe(token: string, id: string, body: string): Promise<{ id: string }> {
  return api(`/api/recipes/${id}/comments`, { method: 'POST', body: { body }, token })
}

export interface RecipeComment {
  id: string
  body: string
  createdAt: string
  author: { id: string; displayName: string } | null
}

export async function listComments(id: string): Promise<{ comments: RecipeComment[] }> {
  return api(`/api/recipes/${id}/comments`)
}

export async function markCompletion(
  token: string,
  id: string,
  payload: { outcome: 'success' | 'failure' | 'partial'; attempts?: number; costSpent?: number; notes?: string },
): Promise<{ ok: true }> {
  return api(`/api/recipes/${id}/complete`, { method: 'POST', body: payload, token })
}

// --- Mod tier lookup ---

export async function lookupMod(baseType: string, modText: string): Promise<ModLookupResponse> {
  return api('/api/mods/lookup', { method: 'POST', body: { baseType, modText } })
}

// --- Events polling ---

export async function listEvents(token: string, since?: number, unreadOnly = false): Promise<{ events: EventItem[]; serverTime: number }> {
  const sp = new URLSearchParams()
  if (since) sp.set('since', String(since))
  if (unreadOnly) sp.set('unreadOnly', '1')
  const qs = sp.toString()
  return api(`/api/events${qs ? `?${qs}` : ''}`, { token })
}

export async function markEventRead(token: string, id: string): Promise<{ ok: true }> {
  return api(`/api/events/${id}/read`, { method: 'PATCH', token })
}
