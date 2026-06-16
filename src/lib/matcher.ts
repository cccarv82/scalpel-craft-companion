import type { ItemMatcher, ModMatch, ModRequirement } from '../types'

export interface MatchableItem {
  baseType: string
  rarity: string
  itemLevel: number
  explicits?: string[]
  implicits?: string[]
  fractured?: boolean
  corrupted?: boolean
  identified?: boolean
}

export interface MatcherEvaluation {
  ok: boolean
  hits: string[]
  misses: string[]
  partial: boolean
  /** Required mods that still need a tier check via the API to be conclusive. */
  pendingTierChecks: ModRequirement[]
}

export interface TierResolutionEntry {
  requirement: ModRequirement
  matchedModText: string
  actualTier: number | null
  required: number
  satisfied: boolean | null // null when no API result yet
}

export function evaluateMatcher(item: MatchableItem, matcher: ItemMatcher): MatcherEvaluation {
  const hits: string[] = []
  const misses: string[] = []
  const pendingTierChecks: ModRequirement[] = []

  if (matcher.rarity?.length) {
    if (!matcher.rarity.includes((item.rarity ?? '').toLowerCase() as never)) {
      misses.push(`rarity is ${item.rarity || 'unknown'}, expected ${matcher.rarity.join(' or ')}`)
    } else {
      hits.push(`rarity ${item.rarity}`)
    }
  }

  if (matcher.ilvlMin) {
    if (item.itemLevel < matcher.ilvlMin) {
      misses.push(`ilvl ${item.itemLevel} < ${matcher.ilvlMin}`)
    } else {
      hits.push(`ilvl ${item.itemLevel} ≥ ${matcher.ilvlMin}`)
    }
  }

  if (matcher.baseTypeIncludes?.length) {
    const bt = (item.baseType ?? '').toLowerCase()
    const found = matcher.baseTypeIncludes.find((b) => bt.includes(b.toLowerCase()))
    if (!found) misses.push(`base "${item.baseType}" not in [${matcher.baseTypeIncludes.join(', ')}]`)
    else hits.push(`base matches "${found}"`)
  }

  const mods = collectMods(item)

  if (matcher.affixCount) {
    const c = mods.length
    if (matcher.affixCount.min != null && c < matcher.affixCount.min) misses.push(`affix count ${c} < min ${matcher.affixCount.min}`)
    if (matcher.affixCount.max != null && c > matcher.affixCount.max) misses.push(`affix count ${c} > max ${matcher.affixCount.max}`)
  }

  if (matcher.requiredMods?.length) {
    for (const req of matcher.requiredMods) {
      const matched = mods.find((m) => matchesModRequirement(m, req))
      if (!matched) {
        misses.push(`missing mod: ${req.description || req.pattern}`)
        continue
      }
      hits.push(`mod: ${req.description || req.pattern}`)
      if (req.minTier != null) pendingTierChecks.push(req)
    }
  }

  if (matcher.forbiddenMods?.length) {
    for (const bad of matcher.forbiddenMods) {
      const re = makeRegex(bad)
      const m = mods.find((x) => re.test(x))
      if (m) misses.push(`forbidden mod present: ${m}`)
    }
  }

  if (matcher.fractured === true && !item.fractured && !hasFracturedTag(mods)) {
    misses.push('item is not fractured')
  } else if (matcher.fractured === false && (item.fractured || hasFracturedTag(mods))) {
    misses.push('item is fractured (should not be)')
  }

  return {
    ok: misses.length === 0 && pendingTierChecks.length === 0,
    hits,
    misses,
    partial: misses.length > 0 && hits.length > 0,
    pendingTierChecks,
  }
}

export interface ResolvedMatcherEvaluation extends MatcherEvaluation {
  tierResolutions: TierResolutionEntry[]
}

/**
 * Cross a base matcher evaluation with API tier lookups. Each pending tier
 * check turns into a resolved entry with `satisfied: true|false`. Hits/misses
 * are updated to reflect the resolved state.
 */
export async function resolveTierChecks(
  item: MatchableItem,
  evalResult: MatcherEvaluation,
  lookup: (baseType: string, modText: string) => Promise<{ matches: ModMatch[] }>,
): Promise<ResolvedMatcherEvaluation> {
  const mods = collectMods(item)
  const resolutions: TierResolutionEntry[] = []
  const newHits = [...evalResult.hits]
  const newMisses = [...evalResult.misses]

  for (const req of evalResult.pendingTierChecks) {
    const reText = mods.find((m) => matchesModRequirement(m, req))
    if (!reText) {
      resolutions.push({ requirement: req, matchedModText: '', actualTier: null, required: req.minTier ?? 0, satisfied: false })
      newMisses.push(`tier check: no mod text matched for ${req.description || req.pattern}`)
      continue
    }
    try {
      const r = await lookup(item.baseType, reText)
      const best = r.matches[0] // tier 1 is best
      const actual = best ? best.tier : null
      const required = req.minTier ?? 0
      const satisfied = actual != null && actual <= required
      resolutions.push({ requirement: req, matchedModText: reText, actualTier: actual, required, satisfied })
      const label = req.description || req.pattern
      if (satisfied) newHits.push(`tier check: ${label} → T${actual} ≤ T${required}`)
      else if (actual != null) newMisses.push(`tier check: ${label} → T${actual} > T${required} required`)
      else newMisses.push(`tier check: ${label} → no tier match in dataset`)
    } catch {
      resolutions.push({ requirement: req, matchedModText: reText, actualTier: null, required: req.minTier ?? 0, satisfied: null })
      newMisses.push(`tier check failed (network): ${req.description || req.pattern}`)
    }
  }

  return {
    ok: newMisses.length === 0,
    hits: newHits,
    misses: newMisses,
    partial: newMisses.length > 0 && newHits.length > 0,
    pendingTierChecks: [],
    tierResolutions: resolutions,
  }
}

function collectMods(item: MatchableItem): string[] {
  return [...(item.explicits ?? []), ...(item.implicits ?? [])]
}

function hasFracturedTag(mods: string[]): boolean {
  return mods.some((m) => /\(fractured\)/i.test(m))
}

function matchesModRequirement(modText: string, req: ModRequirement): boolean {
  const re = makeRegex(req.pattern)
  if (!re.test(modText)) return false
  if (req.minRoll != null) {
    const n = extractFirstNumber(modText)
    if (n == null || n < req.minRoll) return false
  }
  return true
}

function makeRegex(pattern: string): RegExp {
  try {
    return new RegExp(pattern, 'i')
  } catch {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(escaped, 'i')
  }
}

function extractFirstNumber(text: string): number | null {
  const m = text.match(/[-+]?\d+(?:\.\d+)?/)
  if (!m) return null
  const n = Number(m[0])
  return Number.isFinite(n) ? n : null
}
