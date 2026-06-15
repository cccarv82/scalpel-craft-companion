import type { ScalpelPluginContext } from '@scalpelpoe/plugin-sdk'
import { useEffect, useRef, useState } from 'react'
import { initAuth, pollAuth } from '../lib/api'
import { persistAuth, useStore } from '../store'
import { btnPrimary, card } from './ui'

interface Props {
  ctx: ScalpelPluginContext
}

type Stage = 'idle' | 'waiting' | 'error'

function randomCode(): string {
  const arr = new Uint8Array(12)
  crypto.getRandomValues(arr)
  let s = ''
  for (const b of arr) s += b.toString(36)
  return s.slice(0, 22)
}

export function Login({ ctx }: Props) {
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)
  const setAuth = useStore((s) => s.setAuth)

  useEffect(() => {
    cancelledRef.current = false
    return () => {
      cancelledRef.current = true
    }
  }, [])

  const start = async () => {
    setError(null)
    setStage('waiting')
    const code = randomCode()

    let authorizeUrl: string
    try {
      const init = await initAuth(code)
      authorizeUrl = init.authorizeUrl
    } catch (e) {
      setError(`Could not reach server: ${(e as Error).message}`)
      setStage('error')
      return
    }
    ctx.openExternal(authorizeUrl)

    const startedAt = Date.now()
    const TIMEOUT_MS = 10 * 60 * 1000

    while (!cancelledRef.current && Date.now() - startedAt < TIMEOUT_MS) {
      try {
        const res = await pollAuth(code)
        if (cancelledRef.current) return
        if (res.status === 'ready' && res.token && res.user) {
          await persistAuth(ctx.storage, res.token, res.user)
          setAuth(res.token, res.user)
          return
        }
        if (res.status === 'expired') {
          setError('Login session expired. Try again.')
          setStage('error')
          return
        }
      } catch (e) {
        setError((e as Error).message)
        setStage('error')
        return
      }
      await sleep(2500)
    }
    if (!cancelledRef.current) {
      setError('Timed out waiting for Discord. Try again.')
      setStage('error')
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100%', padding: 16 }}>
      <div style={{ ...card, maxWidth: 420, textAlign: 'center' }}>
        <h2 style={{ marginTop: 0, marginBottom: 8, color: 'var(--text, white)' }}>Craft Companion</h2>
        <p style={{ opacity: 0.75, fontSize: 13, marginTop: 0 }}>
          Step-by-step PoE2 endgame crafting recipes with mod tier intelligence and Ctrl+D auto-detect. Sign in
          with Discord to vote, comment, mark completions and submit your own recipes.
        </p>
        <p style={{ opacity: 0.55, fontSize: 11, marginTop: 0 }}>
          Currency-only — by signing in you agree to <strong>no real-money trade</strong>. Violators are banned.
        </p>
        {stage === 'idle' && (
          <button type="button" onClick={start} style={btnPrimary}>
            Connect Discord
          </button>
        )}
        {stage === 'waiting' && (
          <div>
            <p style={{ fontSize: 13 }}>Browser opened. Authorize on Discord, then come back.</p>
            <p style={{ fontSize: 11, opacity: 0.6 }}>Waiting…</p>
            <button
              type="button"
              onClick={() => {
                cancelledRef.current = true
                setStage('idle')
              }}
              style={{
                ...btnPrimary,
                background: 'transparent',
                color: 'var(--text)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              Cancel
            </button>
          </div>
        )}
        {stage === 'error' && (
          <div>
            <p style={{ color: '#f88', fontSize: 13 }}>{error}</p>
            <button type="button" onClick={start} style={btnPrimary}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
