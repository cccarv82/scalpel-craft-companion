import type { PluginStorage } from '@scalpelpoe/plugin-sdk'
import { create } from 'zustand'
import type { AuthedUser, EventItem, RecipeDetail, RecipeListItem, RecipeSlot } from './types'

const KEYS = {
  token: 'token',
  user: 'user',
  lastEventTs: 'lastEventTs',
  activeRecipe: 'activeRecipe',
  settings: 'settings',
} as const

export interface PluginSettings {
  beepOnEvent: boolean
  pollIntervalMs: number
  preferredPoeVersion: 1 | 2
}

export const DEFAULT_SETTINGS: PluginSettings = {
  beepOnEvent: true,
  pollIntervalMs: 8_000,
  preferredPoeVersion: 2,
}

export interface ActiveSession {
  recipeId: string
  currentStep: number
  startedAt: number
  costSpent: number
  attempts: number
  history: { step: number; at: number; note?: string }[]
}

export interface CapturedItem {
  baseType: string
  name: string
  rarity: string
  itemLevel: number
  quality: number
  corrupted: boolean
  identified: boolean
  explicits: string[]
  implicits: string[]
  fractured: boolean
  capturedAt: number
}

type View =
  | 'login'
  | 'browse'
  | 'detail'
  | 'active'
  | 'analyzer'
  | 'budget'
  | 'submit'
  | 'profile'
  | 'settings'

interface Store {
  ready: boolean
  token: string | null
  user: AuthedUser | null
  view: View
  activeRecipeId: string | null

  // Cache
  recipes: RecipeListItem[]
  recipeDetail: RecipeDetail | null
  recipeTotal: number
  recipeFilters: {
    slot: RecipeSlot | ''
    poeVersion: 1 | 2
    q: string
    sort: 'top' | 'recent' | 'trending'
    page: number
  }

  // Session
  activeSession: ActiveSession | null
  lastCaptured: CapturedItem | null

  // Events
  events: EventItem[]
  lastEventTs: number

  // Settings
  settings: PluginSettings

  hydrate(payload: {
    token: string | null
    user: AuthedUser | null
    lastEventTs: number
    activeSession: ActiveSession | null
    settings: PluginSettings
  }): void
  setAuth(token: string, user: AuthedUser): void
  logout(): void
  setView(view: View, recipeId?: string): void

  setRecipes(rows: RecipeListItem[], total: number): void
  setDetail(detail: RecipeDetail): void
  setFilter(patch: Partial<Store['recipeFilters']>): void

  startSession(recipeId: string): void
  advanceStep(step: number, note?: string): void
  addCost(amount: number): void
  bumpAttempts(): void
  endSession(): void
  setLastCaptured(item: CapturedItem): void

  pushEvents(events: EventItem[], serverTime: number): void
  markEventRead(id: string): void
  setSettings(patch: Partial<PluginSettings>): void
}

export const useStore = create<Store>((set) => ({
  ready: false,
  token: null,
  user: null,
  view: 'login',
  activeRecipeId: null,
  recipes: [],
  recipeDetail: null,
  recipeTotal: 0,
  recipeFilters: { slot: '', poeVersion: 2, q: '', sort: 'top', page: 1 },
  activeSession: null,
  lastCaptured: null,
  events: [],
  lastEventTs: 0,
  settings: DEFAULT_SETTINGS,

  hydrate({ token, user, lastEventTs, activeSession, settings }) {
    set({
      token,
      user,
      lastEventTs,
      activeSession,
      settings: { ...DEFAULT_SETTINGS, ...settings },
      ready: true,
      view: token && user ? 'browse' : 'login',
    })
  },
  setAuth(token, user) {
    set({ token, user, view: 'browse' })
  },
  logout() {
    set({
      token: null,
      user: null,
      view: 'login',
      recipes: [],
      recipeDetail: null,
      activeSession: null,
      events: [],
    })
  },
  setView(view, recipeId) {
    if (view === 'detail' && recipeId) set({ view, activeRecipeId: recipeId })
    else set({ view })
  },

  setRecipes(rows, total) {
    set({ recipes: rows, recipeTotal: total })
  },
  setDetail(detail) {
    set({ recipeDetail: detail })
  },
  setFilter(patch) {
    set((s) => {
      const next = { ...s.recipeFilters, ...patch }
      // reset page on filter change
      const reset = Object.keys(patch).some((k) => k !== 'page')
      if (reset) next.page = 1
      return { recipeFilters: next }
    })
  },

  startSession(recipeId) {
    set({
      activeSession: {
        recipeId,
        currentStep: 0,
        startedAt: Date.now(),
        costSpent: 0,
        attempts: 0,
        history: [],
      },
      view: 'active',
    })
  },
  advanceStep(step, note) {
    set((s) => {
      if (!s.activeSession) return {}
      return {
        activeSession: {
          ...s.activeSession,
          currentStep: step,
          history: [...s.activeSession.history, { step, at: Date.now(), note }],
        },
      }
    })
  },
  addCost(amount) {
    set((s) => (s.activeSession ? { activeSession: { ...s.activeSession, costSpent: s.activeSession.costSpent + amount } } : {}))
  },
  bumpAttempts() {
    set((s) => (s.activeSession ? { activeSession: { ...s.activeSession, attempts: s.activeSession.attempts + 1 } } : {}))
  },
  endSession() {
    set({ activeSession: null })
  },
  setLastCaptured(item) {
    set({ lastCaptured: item })
  },

  pushEvents(events, serverTime) {
    set((s) => {
      const known = new Set(s.events.map((e) => e.id))
      const fresh = events.filter((e) => !known.has(e.id))
      return { events: [...fresh, ...s.events].slice(0, 200), lastEventTs: serverTime }
    })
  },
  markEventRead(id) {
    set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, read: true } : e)) }))
  },
  setSettings(patch) {
    set((s) => ({ settings: { ...s.settings, ...patch } }))
  },
}))

export async function loadFromStorage(storage: PluginStorage): Promise<{
  token: string | null
  user: AuthedUser | null
  lastEventTs: number
  activeSession: ActiveSession | null
  settings: PluginSettings
}> {
  const [token, user, lastEventTs, activeSession, settings] = await Promise.all([
    storage.get<string>(KEYS.token),
    storage.get<AuthedUser>(KEYS.user),
    storage.get<number>(KEYS.lastEventTs),
    storage.get<ActiveSession>(KEYS.activeRecipe),
    storage.get<PluginSettings>(KEYS.settings),
  ])
  return {
    token,
    user,
    lastEventTs: lastEventTs ?? 0,
    activeSession,
    settings: { ...DEFAULT_SETTINGS, ...(settings ?? {}) },
  }
}

export async function persistAuth(
  storage: PluginStorage,
  token: string | null,
  user: AuthedUser | null,
): Promise<void> {
  if (token) await storage.set(KEYS.token, token)
  else await storage.delete(KEYS.token)
  if (user) await storage.set(KEYS.user, user)
  else await storage.delete(KEYS.user)
}

export async function persistActiveSession(storage: PluginStorage, s: ActiveSession | null): Promise<void> {
  if (s) await storage.set(KEYS.activeRecipe, s)
  else await storage.delete(KEYS.activeRecipe)
}

export async function persistLastEventTs(storage: PluginStorage, ts: number): Promise<void> {
  await storage.set(KEYS.lastEventTs, ts)
}

export async function persistSettings(storage: PluginStorage, settings: PluginSettings): Promise<void> {
  await storage.set(KEYS.settings, settings)
}
