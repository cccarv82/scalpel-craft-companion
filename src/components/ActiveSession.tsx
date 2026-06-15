import type { ScalpelPluginContext } from '@scalpelpoe/plugin-sdk'
import { useEffect } from 'react'
import { getRecipe, markCompletion } from '../lib/api'
import { CATEGORY_COLOR, CATEGORY_LABEL } from '../lib/format'
import { evaluateMatcher, type MatchableItem } from '../lib/matcher'
import { persistActiveSession, useStore } from '../store'
import { btn, btnDanger, btnPrimary, card, label as labelStyle, tag } from './ui'

interface Props {
  ctx: ScalpelPluginContext
}

export function ActiveSession({ ctx }: Props) {
  const token = useStore((s) => s.token)
  const session = useStore((s) => s.activeSession)
  const detail = useStore((s) => s.recipeDetail)
  const lastCaptured = useStore((s) => s.lastCapturedMods)
  const setDetail = useStore((s) => s.setDetail)
  const advanceStep = useStore((s) => s.advanceStep)
  const addCost = useStore((s) => s.addCost)
  const bumpAttempts = useStore((s) => s.bumpAttempts)
  const endSession = useStore((s) => s.endSession)
  const setView = useStore((s) => s.setView)

  useEffect(() => {
    if (!session) return
    if (detail && detail.id === session.recipeId) return
    getRecipe(token, session.recipeId)
      .then((r) => setDetail(r.recipe))
      .catch(() => {})
  }, [session, detail, token, setDetail])

  useEffect(() => {
    if (session) void persistActiveSession(ctx.storage, session)
  }, [ctx, session])

  if (!session || !detail || detail.id !== session.recipeId) {
    return (
      <div style={{ padding: 24, textAlign: 'center', opacity: 0.6 }}>
        <p>Loading active session…</p>
        <button type="button" style={btn} onClick={() => setView('browse')}>
          ← Back to browse
        </button>
      </div>
    )
  }

  const step = detail.steps[session.currentStep] ?? detail.steps[0]
  const isLast = session.currentStep >= detail.steps.length - 1

  // Evaluate matcher against last Ctrl+D'd item
  const evaluation =
    step.expectedAfter && lastCaptured && lastCaptured.baseType
      ? evaluateMatcher(buildMatchable(lastCaptured), step.expectedAfter)
      : null

  const onAdvance = () => {
    if (isLast) {
      if (!confirm('Mark recipe as completed (success)?')) return
      finalize('success')
      return
    }
    advanceStep(session.currentStep + 1)
  }

  const finalize = async (outcome: 'success' | 'failure' | 'partial') => {
    if (token) {
      try {
        await markCompletion(token, detail.id, {
          outcome,
          attempts: session.attempts,
          costSpent: session.costSpent,
        })
      } catch {}
    }
    await persistActiveSession(ctx.storage, null)
    endSession()
    setView('browse')
  }

  return (
    <div style={{ padding: 12, display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button type="button" style={btn} onClick={() => setView('detail', detail.id)}>
          ← Back to detail
        </button>
        <button type="button" style={btnDanger} onClick={() => finalize('failure')}>
          Abandon
        </button>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <strong>{detail.title}</strong>
          <span style={{ fontSize: 12, opacity: 0.6 }}>
            Step {session.currentStep + 1} / {detail.steps.length}
          </span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 8 }}>
          <div
            style={{
              width: `${((session.currentStep + 1) / detail.steps.length) * 100}%`,
              height: '100%',
              background: '#f0a020',
              borderRadius: 2,
              transition: 'width 200ms',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, opacity: 0.8 }}>
          <span>Attempts: {session.attempts}</span>
          <span>Spent: {session.costSpent} {detail.costCurrency}</span>
          <span>Elapsed: {Math.round((Date.now() - session.startedAt) / 60000)}m</span>
        </div>
      </div>

      <div style={card}>
        <strong style={{ fontSize: 15 }}>{step.title}</strong>
        <p style={{ whiteSpace: 'pre-wrap', marginTop: 6, fontSize: 13 }}>{step.description}</p>
        {step.currency.length > 0 && (
          <div>
            <div style={labelStyle}>Currency for this step</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {step.currency.map((c, i) => (
                <span
                  key={`${c.name}-${i}`}
                  style={{ ...tag, borderLeft: `3px solid ${CATEGORY_COLOR[c.category]}`, opacity: c.optional ? 0.6 : 1 }}
                  title={`${CATEGORY_LABEL[c.category]}${c.qty ? ` × ${c.qty}` : ''}${c.optional ? ' (optional)' : ''}`}
                >
                  {c.name}
                  {c.qty ? ` ×${c.qty}` : ''}
                  {c.optional ? ' ?' : ''}
                </span>
              ))}
            </div>
          </div>
        )}
        {step.stopLoss && <div style={{ marginTop: 8, fontSize: 12, color: '#fb8' }}>⚠ {step.stopLoss}</div>}
      </div>

      {evaluation && (
        <div style={card}>
          <div style={labelStyle}>Ctrl+D check — last item</div>
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            Base: <strong>{lastCaptured?.baseType}</strong>
          </div>
          {evaluation.ok ? (
            <div style={{ color: '#8c8', fontSize: 13 }}>✓ This item satisfies step {session.currentStep + 1} — you can advance.</div>
          ) : (
            <div style={{ fontSize: 13 }}>
              <div style={{ color: evaluation.partial ? '#fc0' : '#f88' }}>
                {evaluation.partial ? '◐ Partial match' : '✗ Does not meet step requirements yet'}
              </div>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 12 }}>
                {evaluation.hits.map((h, i) => (
                  <li key={`h-${i}`} style={{ color: '#8c8' }}>✓ {h}</li>
                ))}
                {evaluation.misses.map((m, i) => (
                  <li key={`m-${i}`} style={{ color: '#f88' }}>✗ {m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div style={card}>
        <div style={labelStyle}>Session tracker</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" style={btn} onClick={bumpAttempts}>
            + Attempt
          </button>
          {[1, 5, 10].map((n) => (
            <button key={n} type="button" style={btn} onClick={() => addCost(n)}>
              + {n} {detail.costCurrency}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
        <button
          type="button"
          style={btn}
          disabled={session.currentStep <= 0}
          onClick={() => advanceStep(Math.max(0, session.currentStep - 1))}
        >
          ← Previous step
        </button>
        <button type="button" style={btnPrimary} onClick={onAdvance}>
          {isLast ? 'Finish & mark success' : 'Next step →'}
        </button>
      </div>
    </div>
  )
}

function buildMatchable(captured: { baseType: string; mods: string[] }): MatchableItem {
  return {
    rarity: 'rare',
    itemLevel: 81,
    baseType: captured.baseType,
    name: '',
    explicits: captured.mods,
    implicits: [],
  }
}
