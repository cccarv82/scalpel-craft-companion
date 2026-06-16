import { useEffect, useMemo, useState } from 'react'
import { listRecipes } from '../lib/api'
import { formatCost, SLOT_LABEL } from '../lib/format'
import { useStore } from '../store'
import type { CostCurrency, RecipeListItem } from '../types'
import { btn, card, input, label as labelStyle } from './ui'

// Rough exchange rates (Divine-anchored). Adjust as league economy moves.
const RATES: Record<CostCurrency, number> = {
  chaos: 0.005, // 1c ≈ 0.005 div
  exalted: 0.005, // 1ex ≈ 0.005 div (PoE2 — same as chaos roughly)
  divine: 1,
  mirror: 1000,
}

function toDivine(amount: number, currency: CostCurrency): number {
  return amount * (RATES[currency] ?? 1)
}

export function CurrencyBudget() {
  const token = useStore((s) => s.token)
  const setView = useStore((s) => s.setView)
  const startSession = useStore((s) => s.startSession)

  const [chaos, setChaos] = useState(0)
  const [exalted, setExalted] = useState(0)
  const [divine, setDivine] = useState(0)
  const [recipes, setRecipes] = useState<RecipeListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const budgetInDivine = useMemo(
    () => toDivine(chaos, 'chaos') + toDivine(exalted, 'exalted') + toDivine(divine, 'divine'),
    [chaos, exalted, divine],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    listRecipes(token, { poeVersion: 2, pageSize: 50, sort: 'top' })
      .then((r) => {
        if (!cancelled) setRecipes(r.recipes)
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const within: RecipeListItem[] = []
  const stretch: RecipeListItem[] = []
  const tooExpensive: RecipeListItem[] = []
  for (const r of recipes) {
    const minD = r.estimatedCostMin ? toDivine(Number(r.estimatedCostMin), r.costCurrency) : 0
    const maxD = r.estimatedCostMax ? toDivine(Number(r.estimatedCostMax), r.costCurrency) : minD
    const mid = (minD + maxD) / 2
    if (maxD <= budgetInDivine) within.push(r)
    else if (mid <= budgetInDivine) stretch.push(r)
    else tooExpensive.push(r)
  }

  const SectionCard = ({
    label,
    list,
    accent,
  }: { label: string; list: RecipeListItem[]; accent: string }) => (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong style={{ color: accent }}>{label}</strong>
        <span style={{ opacity: 0.55, fontSize: 12 }}>{list.length}</span>
      </div>
      {list.length === 0 && <div style={{ opacity: 0.55, fontSize: 12, marginTop: 4 }}>—</div>}
      {list.map((r) => (
        <div
          key={r.id}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', gap: 8 }}
        >
          <div>
            <div style={{ fontSize: 13 }}>{r.title}</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>{SLOT_LABEL[r.slot]} · {formatCost(r.estimatedCostMin, r.estimatedCostMax, r.costCurrency)}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" style={btn} onClick={() => setView('detail', r.id)}>
              View
            </button>
            <button type="button" style={btn} onClick={() => { startSession(r.id); setView('active') }}>
              Start
            </button>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ padding: 12, display: 'grid', gap: 10 }}>
      <div style={card}>
        <div style={labelStyle}>Your currency (PoE2)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
          <div>
            <div style={labelStyle}>Chaos</div>
            <input style={input} type="number" min={0} value={chaos} onChange={(e) => setChaos(Number(e.target.value) || 0)} />
          </div>
          <div>
            <div style={labelStyle}>Exalted</div>
            <input style={input} type="number" min={0} value={exalted} onChange={(e) => setExalted(Number(e.target.value) || 0)} />
          </div>
          <div>
            <div style={labelStyle}>Divine</div>
            <input style={input} type="number" min={0} value={divine} onChange={(e) => setDivine(Number(e.target.value) || 0)} />
          </div>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
          Equivalent: <strong>{budgetInDivine.toFixed(2)} div</strong>{' '}
          <span style={{ opacity: 0.5 }}>(rates are approximate — update them as the league economy moves)</span>
        </div>
      </div>

      {error && <div style={{ color: '#f88', fontSize: 12 }}>{error}</div>}
      {loading && <div style={{ opacity: 0.55, fontSize: 12 }}>Loading recipes…</div>}

      <SectionCard label="Within budget" list={within} accent="#8c8" />
      <SectionCard label="Stretch (mid-cost ≤ budget)" list={stretch} accent="#fc0" />
      <SectionCard label="Out of budget" list={tooExpensive} accent="#f88" />
    </div>
  )
}
