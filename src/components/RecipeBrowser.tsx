import { useCallback, useEffect } from 'react'
import { listRecipes } from '../lib/api'
import { SLOT_LABEL } from '../lib/format'
import { useStore } from '../store'
import type { RecipeSlot } from '../types'
import { RecipeCard } from './RecipeCard'
import { btn, input } from './ui'

const PAGE_SIZE = 20

const POPULAR_SLOTS: (RecipeSlot | '')[] = [
  '',
  'bow',
  'crossbow',
  'helmet',
  'body_armour',
  'gloves',
  'boots',
  'amulet',
  'ring',
  'belt',
  'quiver',
  'shield',
  'focus',
  'wand',
  'staff',
]

export function RecipeBrowser() {
  const token = useStore((s) => s.token)
  const recipes = useStore((s) => s.recipes)
  const total = useStore((s) => s.recipeTotal)
  const filters = useStore((s) => s.recipeFilters)
  const setRecipes = useStore((s) => s.setRecipes)
  const setFilter = useStore((s) => s.setFilter)
  const setView = useStore((s) => s.setView)
  const startSession = useStore((s) => s.startSession)

  const fetchList = useCallback(async () => {
    try {
      const res = await listRecipes(token, {
        slot: filters.slot || undefined,
        poeVersion: filters.poeVersion,
        q: filters.q.trim() || undefined,
        sort: filters.sort,
        page: filters.page,
        pageSize: PAGE_SIZE,
      })
      setRecipes(res.recipes, res.total)
    } catch (e) {
      console.error(e)
    }
  }, [token, filters.slot, filters.poeVersion, filters.q, filters.sort, filters.page, setRecipes])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div style={{ padding: 12, display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {POPULAR_SLOTS.map((s) => (
          <button
            key={s || 'all'}
            type="button"
            style={{ ...btn, ...(filters.slot === s ? { background: '#f0a020', color: '#000' } : {}) }}
            onClick={() => setFilter({ slot: s as RecipeSlot | '' })}
          >
            {s ? SLOT_LABEL[s as RecipeSlot] : 'All'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ ...input, flex: '1 1 200px', maxWidth: 320 }}
          placeholder="Search title or goal"
          value={filters.q}
          onChange={(e) => setFilter({ q: e.target.value })}
        />
        <select
          style={input as React.CSSProperties}
          value={filters.poeVersion}
          onChange={(e) => setFilter({ poeVersion: Number(e.target.value) as 1 | 2 })}
        >
          <option value={2}>PoE 2</option>
          <option value={1}>PoE 1</option>
        </select>
        <select
          style={input as React.CSSProperties}
          value={filters.sort}
          onChange={(e) => setFilter({ sort: e.target.value as 'top' | 'recent' | 'trending' })}
        >
          <option value="top">Top</option>
          <option value="trending">Trending</option>
          <option value="recent">Recent</option>
        </select>
        <button type="button" style={btn} onClick={fetchList}>
          Refresh
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: 10,
        }}
      >
        {recipes.map((r) => (
          <RecipeCard
            key={r.id}
            recipe={r}
            onOpen={() => setView('detail', r.id)}
            onStartSession={() => {
              startSession(r.id)
              setView('active')
            }}
          />
        ))}
        {recipes.length === 0 && (
          <div style={{ opacity: 0.55, padding: 24, gridColumn: '1 / -1', textAlign: 'center' }}>
            No recipes match these filters.
          </div>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            style={btn}
            disabled={filters.page <= 1}
            onClick={() => setFilter({ page: Math.max(1, filters.page - 1) })}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 12, opacity: 0.65 }}>
            Page {filters.page} / {totalPages} · {total} total
          </span>
          <button
            type="button"
            style={btn}
            disabled={filters.page >= totalPages}
            onClick={() => setFilter({ page: Math.min(totalPages, filters.page + 1) })}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
