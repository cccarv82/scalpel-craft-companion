import type { ScalpelPluginContext } from '@scalpelpoe/plugin-sdk'
import { useEffect, useRef, useState } from 'react'
import { getMe } from '../lib/api'
import { persistAuth, useStore } from '../store'
import { btn, btnDanger, btnPrimary, card, label as labelStyle } from './ui'

interface Props {
  ctx: ScalpelPluginContext
}

export function Profile({ ctx }: Props) {
  const user = useStore((s) => s.user)
  const token = useStore((s) => s.token)
  const logout = useStore((s) => s.logout)
  const [stats, setStats] = useState<{ recipesAuthored: number; completions: number } | null>(null)
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (logoutTimer.current) clearTimeout(logoutTimer.current)
    },
    [],
  )

  useEffect(() => {
    if (!token) return
    getMe(token)
      .then((m) => setStats(m.stats ?? null))
      .catch(() => {})
  }, [token])

  if (!user || !token) return null

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
    </div>
  )
}
