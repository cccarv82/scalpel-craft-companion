import type { ScalpelPluginContext } from '@scalpelpoe/plugin-sdk'
import { useEffect, useMemo, useState } from 'react'
import { getRecipe, lookupMod, markCompletion } from '../lib/api'
import { CATEGORY_COLOR, CATEGORY_LABEL } from '../lib/format'
import { evaluateMatcher, resolveTierChecks, type MatchableItem, type ResolvedMatcherEvaluation } from '../lib/matcher'
import { persistActiveSession, useStore } from '../store'
import type { Branch } from '../types'
import { btn, btnDanger, btnPrimary, card, label as labelStyle, tag } from './ui'

interface Props {
  ctx: ScalpelPluginContext
}

export function ActiveSession({ ctx }: Props) {
  const token = useStore((s) => s.token)
  const session = useStore((s) => s.activeSession)
  const detail = useStore((s) => s.recipeDetail)
  const lastCaptured = useStore((s) => s.lastCaptured)
  const setDetail = useStore((s) => s.setDetail)
  const advanceStep = useStore((s) => s.advanceStep)
  const addCost = useStore((s) => s.addCost)
  const bumpAttempts = useStore((s) => s.bumpAttempts)
  const endSession = useStore((s) => s.endSession)
  const setView = useStore((s) => s.setView)

  const [resolved, setResolved] = useState<ResolvedMatcherEvaluation | null>(null)
  const [branchEvals, setBranchEvals] = useState<{ branch: Branch; ok: boolean }[]>([])

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

  const matchableItem: MatchableItem | null = useMemo(() => {
    if (!lastCaptured) return null
    return {
      baseType: lastCaptured.baseType,
      rarity: lastCaptured.rarity,
      itemLevel: lastCaptured.itemLevel,
      explicits: lastCaptured.explicits,
      implicits: lastCaptured.implicits,
      fractured: lastCaptured.fractured,
      corrupted: lastCaptured.corrupted,
      identified: lastCaptured.identified,
    }
  }, [lastCaptured])

  const step = session && detail ? detail.steps[session.currentStep] : null

  // Run matcher synchronously, then enrich with tier lookups.
  useEffect(() => {
    if (!step?.expectedAfter || !matchableItem) {
      setResolved(null)
      return
    }
    let cancelled = false
    const base = evaluateMatcher(matchableItem, step.expectedAfter)
    if (base.pendingTierChecks.length === 0) {
      setResolved({ ...base, tierResolutions: [] })
      return
    }
    // Mark provisional state while waiting
    setResolved({ ...base, tierResolutions: [] })
    resolveTierChecks(matchableItem, base, (b, m) => lookupMod(b, m))
      .then((r) => {
        if (!cancelled) setResolved(r)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [step, matchableItem])

  // Evaluate branches against captured item — sync only (branches matchers
  // generally don't have tier checks). Branches with tier checks will resolve
  // optimistically (ok if base matcher ok).
  useEffect(() => {
    if (!step?.branches || !matchableItem) {
      setBranchEvals([])
      return
    }
    setBranchEvals(
      step.branches.map((b) => {
        const ev = evaluateMatcher(matchableItem, b.match)
        return { branch: b, ok: ev.misses.length === 0 }
      }),
    )
  }, [step, matchableItem])

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

  const isLast = session.currentStep >= detail.steps.length - 1
  const currentStep = detail.steps[session.currentStep] ?? detail.steps[0]

  const onAdvance = (jumpTo?: number) => {
    if (jumpTo != null) {
      advanceStep(jumpTo)
      return
    }
    if (isLast) {
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
        <strong style={{ fontSize: 15 }}>{currentStep.title}</strong>
        <p style={{ whiteSpace: 'pre-wrap', marginTop: 6, fontSize: 13 }}>{currentStep.description}</p>
        {currentStep.currency.length > 0 && (
          <div>
            <div style={labelStyle}>Currency for this step</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {currentStep.currency.map((c, i) => (
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
        {currentStep.stopLoss && <div style={{ marginTop: 8, fontSize: 12, color: '#fb8' }}>⚠ {currentStep.stopLoss}</div>}
      </div>

      {resolved && lastCaptured && (
        <div style={card}>
          <div style={labelStyle}>Ctrl+D check — last item</div>
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            Base: <strong>{lastCaptured.baseType}</strong>
            <span style={{ opacity: 0.6, marginLeft: 6 }}>
              ilvl {lastCaptured.itemLevel} · {lastCaptured.rarity}
              {lastCaptured.fractured ? ' · fractured' : ''}
              {lastCaptured.corrupted ? ' · corrupted' : ''}
            </span>
          </div>
          {resolved.ok ? (
            <div style={{ color: '#8c8', fontSize: 13 }}>
              ✓ This item satisfies step {session.currentStep + 1} — you can advance.
            </div>
          ) : (
            <div style={{ fontSize: 13 }}>
              <div style={{ color: resolved.partial ? '#fc0' : '#f88' }}>
                {resolved.partial ? '◐ Partial match' : '✗ Does not meet step requirements yet'}
              </div>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 12 }}>
                {resolved.hits.map((h, i) => (
                  <li key={`h-${i}`} style={{ color: '#8c8' }}>✓ {h}</li>
                ))}
                {resolved.misses.map((m, i) => (
                  <li key={`m-${i}`} style={{ color: '#f88' }}>✗ {m}</li>
                ))}
              </ul>
            </div>
          )}
          {resolved.tierResolutions.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
              <div style={labelStyle}>Tier resolutions (via dataset lookup)</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {resolved.tierResolutions.map((r, i) => (
                  <li key={i}>
                    {r.requirement.description || r.requirement.pattern} —{' '}
                    {r.actualTier != null ? (
                      <strong style={{ color: r.satisfied ? '#8c8' : '#f88' }}>
                        T{r.actualTier} (required ≤ T{r.required})
                      </strong>
                    ) : (
                      <em>unresolved</em>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {branchEvals.some((b) => b.ok) && (
        <div style={card}>
          <div style={labelStyle}>Branches available</div>
          {branchEvals
            .filter((b) => b.ok)
            .map((b, i) => (
              <div
                key={i}
                style={{
                  marginTop: 6,
                  padding: 8,
                  borderLeft: '3px solid #f0a020',
                  background: 'rgba(240,160,32,0.05)',
                }}
              >
                <div style={{ fontSize: 13 }}>{b.branch.condition}</div>
                {b.branch.message && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{b.branch.message}</div>}
                <div style={{ marginTop: 6 }}>
                  <button type="button" style={btnPrimary} onClick={() => onAdvance(b.branch.nextStep)}>
                    Jump to step {b.branch.nextStep + 1}
                  </button>
                </div>
              </div>
            ))}
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
        <button type="button" style={btnPrimary} onClick={() => onAdvance()}>
          {isLast ? 'Finish & mark success' : 'Next step →'}
        </button>
      </div>
    </div>
  )
}
