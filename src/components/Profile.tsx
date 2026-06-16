import type { ScalpelPluginContext } from '@scalpelpoe/plugin-sdk'
import { useEffect, useRef, useState } from 'react'
import { deleteRecipe, getMe, listRecipes, publishRecipe } from '../lib/api'
import { formatCost, SLOT_LABEL, timeAgo } from '../lib/format'
import { persistAuth, useStore } from '../store'
import type { RecipeListItem } from '../types'
import { btn, btnDanger, btnPrimary, card, label as labelStyle } from './ui'

interface Props {
  ctx: ScalpelPluginContext
}

export function Profile({ ctx }: Props) {
  const user = useStore((s) => s.user)
  const token = useStore((s) => s.token)
  const logout = useStore((s) => s.logout)
  const setView = useStore((s) => s.setView)
  const [stats, setStats] = useState<{ recipesAuthored: number; completions: number } | null>(null)
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [published, setPublished] = useState<RecipeListItem[]>([])
  const [drafts, setDrafts] = useState<RecipeListItem[]>([])
  const [toast, setToast] = useState<string | null>(null)

  useEffect(
    () => () => {
      if (logoutTimer.current) clearTimeout(logoutTimer.current)
    },
    [],
  )

  useEffect(() => {
    if (!token || !user) return
    getMe(token)
      .then((m) => setStats(m.stats ?? null))
      .catch(() => {})
    void refreshMine()
  }, [token, user])

  const refreshMine = async () => {
    if (!token || !user) return
    try {
      const [pub, dr] = await Promise.all([
        listRecipes(token, { authorId: user.id, status: 'published', pageSize: 50, sort: 'recent' }),
        listRecipes(token, { authorId: user.id, status: 'draft', pageSize: 50, sort: 'recent' }),
      ])
      setPublished(pub.recipes)
      setDrafts(dr.recipes)
    } catch {}
  }

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 1500)
  }

  if (!user || !token) return null

  const onPublish = async (id: string) => {
    if (!token) return
    try {
      await publishRecipe(token, id)
      flash('Published.')
      await refreshMine()
    } catch (e) {
      flash((e as Error).message)
    }
  }

  const onDelete = async (id: string) => {
    if (!token) return
    if (!confirm('Delete this recipe? This cannot be undone.')) return
    try {
      await deleteRecipe(token, id)
      flash('Deleted.')
      await refreshMine()
    } catch (e) {
      flash((e as Error).message)
    }
  }

  const doLogout = async () => {
    if (confirmingLogout) {
      if (logoutTimer.current) clearTimeout(logoutTimer.current)
      setConfirmingLogout(false)
      await persistAuth(ctx.storage, null, null)
      logout()
      return
    }
    setConfirmingLogout(true)
    logoutTimer.current = setTimeout(() => setConfirmingLogout(false), 3000)
  }

  return (
    <div style={{ display: 'grid', gap: 12, padding: 12, maxWidth: 520 }}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <strong style={{ fontSize: 15 }}>{user.displayName}</strong>
            <span style={{ marginLeft: 8, opacity: 0.55, fontSize: 12 }}>@{user.discordUsername}</span>
          </div>
        </div>
        {stats && (
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
            <div>Recipes authored: {stats.recipesAuthored}</div>
            <div>Completions logged: {stats.completions}</div>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={labelStyle}>About</div>
        <p style={{ fontSize: 12, opacity: 0.75 }}>
          Display name mirrors your Discord identity. It cannot be edited here — re-syncs from Discord on every
          login.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            style={btn}
            onClick={() => ctx.openExternal('https://github.com/cccarv82/scalpel-craft-companion')}
          >
            Plugin source
          </button>
          <button type="button" style={btnDanger} onClick={doLogout}>
            {confirmingLogout ? 'Click again to confirm' : 'Sign out'}
          </button>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <strong>Drafts ({drafts.length})</strong>
          <button type="button" style={btn} onClick={() => setView('submit')}>
            + New
          </button>
        </div>
        {drafts.length === 0 && <div style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>No drafts.</div>}
        {drafts.map((r) => (
          <RecipeRow
            key={r.id}
            r={r}
            onView={() => setView('detail', r.id)}
            onPublish={() => onPublish(r.id)}
            onDelete={() => onDelete(r.id)}
            isDraft
          />
        ))}
      </div>

      <div style={card}>
        <strong>Published recipes ({published.length})</strong>
        {published.length === 0 && <div style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>No published recipes yet.</div>}
        {published.map((r) => (
          <RecipeRow key={r.id} r={r} onView={() => setView('detail', r.id)} onDelete={() => onDelete(r.id)} />
        ))}
      </div>

      <div style={card}>
        <div style={labelStyle}>Acknowledgments</div>
        <p style={{ fontSize: 12, opacity: 0.7 }}>
          Mod tier data sourced from{' '}
          <button
            type="button"
            style={{ ...btnPrimary, background: 'transparent', color: '#f0a020', border: 'none', padding: 0 }}
            onClick={() => ctx.openExternal('https://repoe-fork.github.io/')}
          >
            RePoE-fork
          </button>{' '}
          (same source used by Scalpel itself).
        </p>
      </div>

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(20,20,25,0.95)',
            color: 'white',
            padding: '8px 14px',
            borderRadius: 4,
            fontSize: 12,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

function RecipeRow({
  r,
  onView,
  onPublish,
  onDelete,
  isDraft,
}: {
  r: RecipeListItem
  onView: () => void
  onPublish?: () => void
  onDelete?: () => void
  isDraft?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        gap: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {r.title}
        </div>
        <div style={{ fontSize: 11, opacity: 0.6 }}>
          {SLOT_LABEL[r.slot]} · {formatCost(r.estimatedCostMin, r.estimatedCostMax, r.costCurrency)} · {timeAgo(r.createdAt)}
          {isDraft ? ' · draft' : ` · ▲${r.upvotes} ▼${r.downvotes} · ${r.successCount}✓`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button type="button" style={btn} onClick={onView}>
          View
        </button>
        {isDraft && onPublish && (
          <button type="button" style={btnPrimary} onClick={onPublish}>
            Publish
          </button>
        )}
        {onDelete && (
          <button type="button" style={btnDanger} onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
