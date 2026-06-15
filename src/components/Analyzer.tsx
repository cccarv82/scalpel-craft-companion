import { useEffect, useState } from 'react'
import { lookupMod, type ApiError } from '../lib/api'
import { useStore } from '../store'
import type { ModMatch } from '../types'
import { btn, card, label as labelStyle } from './ui'

interface Row {
  modText: string
  matches: ModMatch[]
  loading: boolean
  error?: string
}

export function Analyzer() {
  const last = useStore((s) => s.lastCapturedMods)
  const [rows, setRows] = useState<Row[]>([])
  const [auto, setAuto] = useState(true)

  useEffect(() => {
    if (!auto || !last) return
    const base = last.baseType
    let cancelled = false
    setRows(last.mods.map((modText) => ({ modText, matches: [], loading: true })))
    Promise.all(
      last.mods.map(async (modText) => {
        try {
          const r = await lookupMod(base, modText)
          return { modText, matches: r.matches, loading: false }
        } catch (e) {
          return { modText, matches: [], loading: false, error: ((e as ApiError).message || 'error') as string }
        }
      }),
    ).then((rs) => {
      if (!cancelled) setRows(rs)
    })
    return () => {
      cancelled = true
    }
  }, [last, auto])

  if (!last) {
    return (
      <div style={{ padding: 24, opacity: 0.6, textAlign: 'center' }}>
        Ctrl+D an item in PoE2 — its mod tiers will appear here.
      </div>
    )
  }

  return (
    <div style={{ padding: 12, display: 'grid', gap: 10 }}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={labelStyle}>Last item captured</div>
            <strong>{last.baseType}</strong>
            <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 12 }}>{last.mods.length} mods</span>
          </div>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            auto-lookup on new captures
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        {rows.map((r, i) => (
          <div key={i} style={card}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{r.modText}</div>
            {r.loading && <div style={{ fontSize: 12, opacity: 0.55 }}>Looking up…</div>}
            {r.error && <div style={{ fontSize: 12, color: '#f88' }}>{r.error}</div>}
            {!r.loading && r.matches.length === 0 && !r.error && (
              <div style={{ fontSize: 12, opacity: 0.55 }}>No tier match found (item base may not be in dataset).</div>
            )}
            {r.matches.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'grid', gap: 2 }}>
                {r.matches.slice(0, 5).map((m, idx) => (
                  <li key={`${m.modName}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span>
                      <strong style={{ color: '#f0a020' }}>T{m.tier}</strong>{' '}
                      <span style={{ opacity: 0.85 }}>{m.modName || '(prefix)'}</span>{' '}
                      <span style={{ opacity: 0.5 }}>· {m.group}</span>
                    </span>
                    <span style={{ opacity: 0.7 }}>
                      lvl {m.level} ·{' '}
                      {m.rollRange.map((rr, k) => (
                        <span key={k}>
                          {rr[0]}–{rr[1]}
                          {k < m.rollRange.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <div>
        <button type="button" style={btn} onClick={() => setRows([])}>
          Clear
        </button>
      </div>
    </div>
  )
}
