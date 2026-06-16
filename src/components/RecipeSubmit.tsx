import { useMemo, useState } from 'react'
import { ApiError, createRecipe, publishRecipe } from '../lib/api'
import { SLOT_LABEL } from '../lib/format'
import { useStore } from '../store'
import type { CostCurrency, CurrencyCategory, RecipeSlot, RecipeStep } from '../types'
import { btn, btnDanger, btnPrimary, card, input, label as labelStyle, tag } from './ui'

const SLOTS: RecipeSlot[] = [
  'bow',
  'crossbow',
  'wand',
  'staff',
  'sceptre',
  'spear',
  'mace',
  'weapon_1h',
  'weapon_2h',
  'quiver',
  'shield',
  'focus',
  'helmet',
  'body_armour',
  'gloves',
  'boots',
  'belt',
  'amulet',
  'ring',
  'jewel',
  'other',
]

const CURRENCY_CATEGORIES: CurrencyCategory[] = [
  'essence',
  'omen',
  'bone',
  'echo',
  'well',
  'recombinator',
  'rune',
  'standard',
]

const COST_CURRENCIES: CostCurrency[] = ['chaos', 'divine', 'exalted', 'mirror']

interface DraftStep {
  title: string
  description: string
  stopLoss: string
  currency: { name: string; category: CurrencyCategory; qty?: number; optional?: boolean }[]
}

const emptyStep = (): DraftStep => ({
  title: '',
  description: '',
  stopLoss: '',
  currency: [],
})

interface Props {
  onPublished?: (id: string) => void
}

export function RecipeSubmit({ onPublished }: Props) {
  const token = useStore((s) => s.token)
  const setView = useStore((s) => s.setView)

  const [title, setTitle] = useState('')
  const [slot, setSlot] = useState<RecipeSlot>('bow')
  const [poeVersion, setPoeVersion] = useState<1 | 2>(2)
  const [league, setLeague] = useState('all')
  const [goal, setGoal] = useState('')
  const [difficulty, setDifficulty] = useState(3)
  const [costMin, setCostMin] = useState('')
  const [costMax, setCostMax] = useState('')
  const [costCurrency, setCostCurrency] = useState<CostCurrency>('divine')
  const [baseIlvl, setBaseIlvl] = useState(81)
  const [baseName, setBaseName] = useState('')
  const [baseHint, setBaseHint] = useState('')
  const [baseSockets, setBaseSockets] = useState('')
  const [fractureFriendly, setFractureFriendly] = useState(false)
  const [steps, setSteps] = useState<DraftStep[]>([emptyStep()])
  const [pricingTips, setPricingTips] = useState('')
  const [notes, setNotes] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [publishOnSubmit, setPublishOnSubmit] = useState(true)

  const canSubmit = useMemo(() => {
    if (title.trim().length < 4) return false
    if (goal.trim().length < 4) return false
    if (!baseName.trim()) return false
    if (steps.length === 0) return false
    for (const s of steps) {
      if (s.title.trim().length < 1 || s.description.trim().length < 1) return false
    }
    return true
  }, [title, goal, baseName, steps])

  const addStep = () => setSteps((arr) => [...arr, emptyStep()])
  const removeStep = (i: number) => setSteps((arr) => arr.filter((_, j) => j !== i))
  const updateStep = (i: number, patch: Partial<DraftStep>) =>
    setSteps((arr) => arr.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  const addCurrency = (i: number) =>
    updateStep(i, { currency: [...steps[i].currency, { name: '', category: 'standard' }] })
  const removeCurrency = (stepIdx: number, currencyIdx: number) =>
    updateStep(stepIdx, { currency: steps[stepIdx].currency.filter((_, j) => j !== currencyIdx) })

  const submit = async () => {
    if (!token) return
    setError(null)
    setBusy(true)
    try {
      const built: RecipeStep[] = steps.map((s, idx) => ({
        index: idx,
        title: s.title.trim(),
        description: s.description.trim(),
        stopLoss: s.stopLoss.trim() || undefined,
        currency: s.currency
          .filter((c) => c.name.trim().length > 0)
          .map((c) => ({
            name: c.name.trim(),
            category: c.category,
            qty: c.qty,
            optional: c.optional,
          })),
      }))
      const created = await createRecipe(token, {
        title: title.trim(),
        slot,
        poeVersion,
        league: league.trim() || 'all',
        goal: goal.trim(),
        difficulty,
        estimatedCostMin: costMin ? Number(costMin) : undefined,
        estimatedCostMax: costMax ? Number(costMax) : undefined,
        costCurrency,
        baseRequirements: {
          ilvl: baseIlvl,
          base: baseName.trim(),
          hint: baseHint.trim() || undefined,
          sockets: baseSockets ? Number(baseSockets) : undefined,
          fractureFriendly: fractureFriendly || undefined,
        },
        steps: built,
        pricingTips: pricingTips
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        notes: notes
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      })

      if (publishOnSubmit) {
        await publishRecipe(token, created.id)
      }

      onPublished?.(created.id)
      setView('detail', created.id)
    } catch (e) {
      if (e instanceof ApiError && (e.body as { error?: string })?.error === 'rmt_blocked') {
        setError(`Rejected: blocked term "${(e.body as { match?: string }).match}".`)
      } else {
        setError((e as Error).message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: 12, display: 'grid', gap: 10, maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button type="button" style={btn} onClick={() => setView('browse')}>
          ← Back
        </button>
        <span style={{ fontSize: 12, opacity: 0.65 }}>Submit a new recipe</span>
      </div>

      <div style={card}>
        <div style={labelStyle}>Title</div>
        <input style={input} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Boss-kill helmet — endgame ES recovery" />
      </div>

      <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
        <div>
          <div style={labelStyle}>Slot</div>
          <select style={input as React.CSSProperties} value={slot} onChange={(e) => setSlot(e.target.value as RecipeSlot)}>
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {SLOT_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={labelStyle}>PoE version</div>
          <select
            style={input as React.CSSProperties}
            value={poeVersion}
            onChange={(e) => setPoeVersion(Number(e.target.value) as 1 | 2)}
          >
            <option value={2}>PoE 2</option>
            <option value={1}>PoE 1</option>
          </select>
        </div>
        <div>
          <div style={labelStyle}>League</div>
          <input style={input} value={league} onChange={(e) => setLeague(e.target.value)} placeholder="e.g. Runes of Aldur" />
        </div>
        <div>
          <div style={labelStyle}>Difficulty (1-5)</div>
          <input
            style={input}
            type="number"
            min={1}
            max={5}
            value={difficulty}
            onChange={(e) => setDifficulty(Math.max(1, Math.min(5, Number(e.target.value) || 3)))}
          />
        </div>
      </div>

      <div style={card}>
        <div style={labelStyle}>Goal (what does the recipe deliver?)</div>
        <textarea
          style={{ ...input, minHeight: 70, resize: 'vertical' }}
          maxLength={400}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
      </div>

      <div style={card}>
        <div style={labelStyle}>Base requirements</div>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 80px', gap: 8 }}>
          <div>
            <div style={labelStyle}>ilvl</div>
            <input style={input} type="number" min={1} max={100} value={baseIlvl} onChange={(e) => setBaseIlvl(Number(e.target.value) || 75)} />
          </div>
          <div>
            <div style={labelStyle}>Base name</div>
            <input style={input} value={baseName} onChange={(e) => setBaseName(e.target.value)} placeholder="e.g. Gemini Bow" />
          </div>
          <div>
            <div style={labelStyle}>Sockets</div>
            <input style={input} type="number" min={0} max={6} value={baseSockets} onChange={(e) => setBaseSockets(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={labelStyle}>Hint (acquisition tips)</div>
          <textarea
            style={{ ...input, minHeight: 50, resize: 'vertical' }}
            value={baseHint}
            onChange={(e) => setBaseHint(e.target.value)}
            maxLength={400}
          />
        </div>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, fontSize: 12 }}>
          <input type="checkbox" checked={fractureFriendly} onChange={(e) => setFractureFriendly(e.target.checked)} />
          <span>Fracture-friendly base</span>
        </label>
      </div>

      <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
        <div>
          <div style={labelStyle}>Cost currency</div>
          <select
            style={input as React.CSSProperties}
            value={costCurrency}
            onChange={(e) => setCostCurrency(e.target.value as CostCurrency)}
          >
            {COST_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={labelStyle}>Est. cost min</div>
          <input style={input} type="number" min={0} step={0.1} value={costMin} onChange={(e) => setCostMin(e.target.value)} />
        </div>
        <div>
          <div style={labelStyle}>Est. cost max</div>
          <input style={input} type="number" min={0} step={0.1} value={costMax} onChange={(e) => setCostMax(e.target.value)} />
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={labelStyle}>Steps ({steps.length})</div>
          <button type="button" style={btn} onClick={addStep}>
            + Add step
          </button>
        </div>
        <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
          {steps.map((s, i) => (
            <div key={i} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: 13 }}>Step {i + 1}</strong>
                {steps.length > 1 && (
                  <button type="button" style={btnDanger} onClick={() => removeStep(i)}>
                    Remove
                  </button>
                )}
              </div>
              <div style={{ marginTop: 6 }}>
                <div style={labelStyle}>Title</div>
                <input style={input} maxLength={120} value={s.title} onChange={(e) => updateStep(i, { title: e.target.value })} />
              </div>
              <div style={{ marginTop: 6 }}>
                <div style={labelStyle}>Description</div>
                <textarea
                  style={{ ...input, minHeight: 90, resize: 'vertical' }}
                  maxLength={2000}
                  value={s.description}
                  onChange={(e) => updateStep(i, { description: e.target.value })}
                />
              </div>
              <div style={{ marginTop: 6 }}>
                <div style={labelStyle}>Stop loss (when to abort, optional)</div>
                <input style={input} maxLength={400} value={s.stopLoss} onChange={(e) => updateStep(i, { stopLoss: e.target.value })} />
              </div>
              <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={labelStyle}>Currency used in this step</div>
                  <button type="button" style={btn} onClick={() => addCurrency(i)}>
                    + Add currency
                  </button>
                </div>
                {s.currency.length === 0 && (
                  <div style={{ fontSize: 11, opacity: 0.55 }}>None — add at least one currency if applicable.</div>
                )}
                <div style={{ display: 'grid', gap: 4, marginTop: 4 }}>
                  {s.currency.map((c, ci) => (
                    <div key={ci} style={{ display: 'grid', gridTemplateColumns: '2fr 120px 70px auto', gap: 6 }}>
                      <input
                        style={input}
                        placeholder="e.g. Greater Essence of Seeking"
                        value={c.name}
                        onChange={(e) =>
                          updateStep(i, {
                            currency: s.currency.map((x, j) => (j === ci ? { ...x, name: e.target.value } : x)),
                          })
                        }
                      />
                      <select
                        style={input as React.CSSProperties}
                        value={c.category}
                        onChange={(e) =>
                          updateStep(i, {
                            currency: s.currency.map((x, j) =>
                              j === ci ? { ...x, category: e.target.value as CurrencyCategory } : x,
                            ),
                          })
                        }
                      >
                        {CURRENCY_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <input
                        style={input}
                        type="number"
                        min={0}
                        placeholder="qty"
                        value={c.qty ?? ''}
                        onChange={(e) =>
                          updateStep(i, {
                            currency: s.currency.map((x, j) =>
                              j === ci ? { ...x, qty: e.target.value ? Number(e.target.value) : undefined } : x,
                            ),
                          })
                        }
                      />
                      <button type="button" style={btn} onClick={() => removeCurrency(i, ci)}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={labelStyle}>Pricing tips (one per line, optional)</div>
        <textarea
          style={{ ...input, minHeight: 70, resize: 'vertical' }}
          value={pricingTips}
          onChange={(e) => setPricingTips(e.target.value)}
          placeholder={'e.g. Total DPS — list at actual rolled value\nCrit chance — list a touch below'}
        />
      </div>

      <div style={card}>
        <div style={labelStyle}>Notes (one per line, optional)</div>
        <textarea
          style={{ ...input, minHeight: 70, resize: 'vertical' }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && <div style={{ color: '#f88', fontSize: 12 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={publishOnSubmit} onChange={(e) => setPublishOnSubmit(e.target.checked)} />
          Publish immediately
        </label>
        <div>
          <span style={tag}>{canSubmit ? 'Ready' : 'Missing required fields'}</span>
        </div>
        <button type="button" style={btnPrimary} disabled={!canSubmit || busy} onClick={submit}>
          {busy ? 'Submitting…' : publishOnSubmit ? 'Submit + publish' : 'Save as draft'}
        </button>
      </div>
    </div>
  )
}
