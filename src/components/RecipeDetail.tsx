import { useEffect, useState } from 'react'
import { commentOnRecipe, getRecipe, listComments, type RecipeComment, markCompletion, reportRecipe, voteRecipe } from '../lib/api'
import { CATEGORY_COLOR, CATEGORY_LABEL, difficultyStars, formatCost, SLOT_LABEL, timeAgo } from '../lib/format'
import { useStore } from '../store'
import { btn, btnDanger, btnPrimary, card, input, label as labelStyle, tag } from './ui'

export function RecipeDetail() {
  const id = useStore((s) => s.activeRecipeId)
  const token = useStore((s) => s.token)
  const detail = useStore((s) => s.recipeDetail)
  const setDetail = useStore((s) => s.setDetail)
  const setView = useStore((s) => s.setView)
  const startSession = useStore((s) => s.startSession)

  const [myVote, setMyVote] = useState<number | null>(null)
  const [comments, setComments] = useState<RecipeComment[]>([])
  const [commentBody, setCommentBody] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [reporting, setReporting] = useState(false)
  const [reportReason, setReportReason] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    getRecipe(token, id)
      .then((r) => {
        if (cancelled) return
        setDetail(r.recipe)
        setMyVote(r.myVote)
      })
      .catch(() => {})
    listComments(id)
      .then((r) => {
        if (cancelled) return
        setComments(r.comments)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id, token, setDetail])

  if (!detail || detail.id !== id) {
    return (
      <div style={{ padding: 12 }}>
        <button type="button" style={btn} onClick={() => setView('browse')}>
          ← Back
        </button>
        <div style={{ padding: 24, opacity: 0.6, textAlign: 'center' }}>Loading…</div>
      </div>
    )
  }

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1500)
  }

  const onVote = async (v: -1 | 1) => {
    if (!token) return
    const next = myVote === v ? 0 : v
    try {
      const r = await voteRecipe(token, detail.id, next as -1 | 0 | 1)
      setMyVote(r.myVote)
    } catch (e) {
      flash((e as Error).message)
    }
  }

  const onComment = async () => {
    if (!token || !commentBody.trim()) return
    try {
      await commentOnRecipe(token, detail.id, commentBody.trim())
      setCommentBody('')
      const r = await listComments(detail.id)
      setComments(r.comments)
    } catch (e) {
      flash((e as Error).message)
    }
  }

  const onReport = async () => {
    if (!token || !reportReason.trim()) return
    try {
      await reportRecipe(token, detail.id, reportReason.trim())
      setReporting(false)
      setReportReason('')
      flash('Report submitted. Thank you.')
    } catch (e) {
      flash((e as Error).message)
    }
  }

  const onMarkComplete = async (outcome: 'success' | 'failure' | 'partial') => {
    if (!token) return
    try {
      await markCompletion(token, detail.id, { outcome })
      flash(outcome === 'success' ? 'Marked as success ✓' : `Marked as ${outcome}`)
    } catch (e) {
      flash((e as Error).message)
    }
  }

  return (
    <div style={{ padding: 12, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button type="button" style={btn} onClick={() => setView('browse')}>
          ← Back
        </button>
        <button type="button" style={btnPrimary} onClick={() => { startSession(detail.id); setView('active') }}>
          Start active session
        </button>
      </div>

      <div style={card}>
        <div style={{ color: '#f0a020', fontSize: 11, fontWeight: 600 }}>{SLOT_LABEL[detail.slot]}</div>
        <h2 style={{ margin: '4px 0 6px', fontSize: 18 }}>{detail.title}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={tag}>PoE{detail.poeVersion}</span>
          {detail.league && detail.league !== 'all' && <span style={tag}>{detail.league}</span>}
          <span style={{ ...tag, color: '#fc0' }}>{difficultyStars(detail.difficulty)}</span>
          <span style={tag}>
            Est. {formatCost(detail.estimatedCostMin, detail.estimatedCostMax, detail.costCurrency)}
          </span>
        </div>
        <p style={{ marginTop: 8, opacity: 0.9 }}>{detail.goal}</p>
        <div style={{ fontSize: 11, opacity: 0.55 }}>
          {detail.author ? `by ${detail.author.displayName}` : 'curated'} · {timeAgo(detail.createdAt)} · {detail.viewCount} views
        </div>
      </div>

      {detail.baseRequirements && (
        <div style={card}>
          <div style={labelStyle}>Base requirements</div>
          <div style={{ display: 'grid', gap: 4 }}>
            <div>
              <strong>{detail.baseRequirements.base}</strong> · ilvl{detail.baseRequirements.ilvl}
              {detail.baseRequirements.sockets ? ` · ${detail.baseRequirements.sockets} sockets` : ''}
            </div>
            {detail.baseRequirements.hint && (
              <div style={{ fontSize: 12, opacity: 0.8 }}>{detail.baseRequirements.hint}</div>
            )}
          </div>
        </div>
      )}

      <div>
        <div style={labelStyle}>Steps</div>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
          {detail.steps.map((step) => (
            <li key={step.index} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <strong>
                  {step.index + 1}. {step.title}
                </strong>
              </div>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: 13, opacity: 0.9, marginTop: 6 }}>{step.description}</p>
              {step.currency.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {step.currency.map((c, i) => (
                    <span
                      key={`${c.name}-${i}`}
                      style={{
                        ...tag,
                        borderLeft: `3px solid ${CATEGORY_COLOR[c.category]}`,
                        opacity: c.optional ? 0.6 : 1,
                      }}
                      title={`${CATEGORY_LABEL[c.category]}${c.qty ? ` × ${c.qty}` : ''}${c.optional ? ' (optional)' : ''}`}
                    >
                      {c.name}
                      {c.qty ? ` ×${c.qty}` : ''}
                      {c.optional ? ' ?' : ''}
                    </span>
                  ))}
                </div>
              )}
              {step.stopLoss && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#fb8' }}>⚠ {step.stopLoss}</div>
              )}
            </li>
          ))}
        </ol>
      </div>

      {detail.pricingTips.length > 0 && (
        <div style={card}>
          <div style={labelStyle}>Pricing tips</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
            {detail.pricingTips.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {detail.notes.length > 0 && (
        <div style={card}>
          <div style={labelStyle}>Notes</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
            {detail.notes.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={card}>
        <div style={labelStyle}>Vote · Complete · Report</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={!token}
            style={{ ...btn, color: myVote === 1 ? '#8c8' : undefined }}
            onClick={() => onVote(1)}
          >
            ▲ Upvote ({detail.upvotes})
          </button>
          <button
            type="button"
            disabled={!token}
            style={{ ...btn, color: myVote === -1 ? '#f88' : undefined }}
            onClick={() => onVote(-1)}
          >
            ▼ Downvote ({detail.downvotes})
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" disabled={!token} style={btnPrimary} onClick={() => onMarkComplete('success')}>
            ✓ Success
          </button>
          <button type="button" disabled={!token} style={btn} onClick={() => onMarkComplete('partial')}>
            ◐ Partial
          </button>
          <button type="button" disabled={!token} style={btn} onClick={() => onMarkComplete('failure')}>
            ✗ Failure
          </button>
          <button type="button" disabled={!token} style={btnDanger} onClick={() => setReporting((v) => !v)}>
            Report
          </button>
        </div>
        {reporting && (
          <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
            <textarea
              style={{ ...input, minHeight: 60, resize: 'vertical' }}
              maxLength={250}
              placeholder="Reason"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button type="button" style={btn} onClick={() => setReporting(false)}>
                Cancel
              </button>
              <button type="button" style={btnDanger} onClick={onReport}>
                Submit report
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={labelStyle}>Comments ({comments.length})</div>
        {token && (
          <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
            <textarea
              style={{ ...input, minHeight: 60, resize: 'vertical' }}
              maxLength={2000}
              placeholder="Share your experience with this recipe"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" style={btnPrimary} disabled={!commentBody.trim()} onClick={onComment}>
                Post
              </button>
            </div>
          </div>
        )}
        {comments.length === 0 && <div style={{ opacity: 0.55, fontSize: 12 }}>No comments yet.</div>}
        {comments.map((c) => (
          <div key={c.id} style={{ padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, opacity: 0.6 }}>
              {c.author?.displayName ?? 'deleted'} · {timeAgo(c.createdAt)}
            </div>
            <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{c.body}</div>
          </div>
        ))}
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
