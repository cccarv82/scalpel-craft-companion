import type { ItemMatcher, ModRequirement } from '../types'

// Item shape the Scalpel plugin SDK delivers via onCurrentItem.
// We narrow to just the fields we care about for the matcher.
export interface MatchableItem {
  rarity: string
  itemLevel: number
  baseType: string
  name: string
  corrupted?: boolean
  identified?: boolean
  explicits?: string[]
  implicits?: string[]
  // Scalpel doesn't surface `fractured` on the item itself today — we infer
  // from the mod list when it carries the "(fractured)" tag in text.
}

export interface MatcherEvaluation {
  ok: boolean
  hits: string[]
  misses: string[]
  partial?: boolean
}

const TIER_TOLERANCE = 0 // exact tier or better required by default

export function evaluateMatcher(item: MatchableItem, matcher: ItemMatcher): MatcherEvaluation {
  const hits: string[] = []
  const misses: string[] = []

  if (matcher.rarity?.length && !matcher.rarity.includes((item.rarity ?? '').toLowerCase() as never)) {
    misses.push(`rarity is ${item.rarity}, expected ${matcher.rarity.join(' or ')}`)
  } else if (matcher.rarity?.length) {
    hits.push(`rarity ${item.rarity}`)
  }

  if (matcher.ilvlMin && item.itemLevel < matcher.ilvlMin) {
    misses.push(`ilvl ${item.itemLevel} < ${matcher.ilvlMin}`)
  } else if (matcher.ilvlMin) {
    hits.push(`ilvl ${item.itemLevel} ≥ ${matcher.ilvlMin}`)
  }

  if (matcher.baseTypeIncludes?.length) {
    const bt = item.baseType.toLowerCase()
    const found = matcher.baseTypeIncludes.find((b) => bt.includes(b.toLowerCase()))
    if (!found) misses.push(`base "${item.baseType}" not in [${matcher.baseTypeIncludes.join(', ')}]`)
    else hits.push(`base matches "${found}"`)
  }

  const mods = collectMods(item)
  if (matcher.affixCount) {
    const c = mods.length
    if (matcher.affixCount.min != null && c < matcher.affixCount.min) {
      misses.push(`affix count ${c} < min ${matcher.affixCount.min}`)
    }
    if (matcher.affixCount.max != null && c > matcher.affixCount.max) {
      misses.push(`affix count ${c} > max ${matcher.affixCount.max}`)
    }
  }

  if (matcher.requiredMods?.length) {
    let needFracture = false
    void needFracture
    for (const req of matcher.requiredMods) {
      const matched = mods.find((m) => matchesModRequirement(m, req))
      if (matched) hits.push(`mod: ${req.description || req.pattern}`)
      else misses.push(`missing mod: ${req.description || req.pattern}`)
    }
  }

  if (matcher.forbiddenMods?.length) {
    for (const bad of matcher.forbiddenMods) {
      const re = makeRegex(bad)
      const m = mods.find((x) => re.test(x))
      if (m) misses.push(`forbidden mod present: ${m}`)
    }
  }

  if (matcher.fractured === true && !hasFractured(mods)) {
    misses.push('item is not fractured')
  } else if (matcher.fractured === false && hasFractured(mods)) {
    misses.push('item is fractured (should not be)')
  }

  return {
    ok: misses.length === 0,
    hits,
    misses,
    partial: misses.length > 0 && hits.length > 0,
  }
}

function collectMods(item: MatchableItem): string[] {
  return [...(item.explicits ?? []), ...(item.implicits ?? [])]
}

function hasFractured(mods: string[]): boolean {
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
  // minTier requires a separate API roundtrip — handled outside this evaluator
  // by an enrich step that calls /api/mods/lookup.
  // We don't fail here on minTier alone; UI annotates expected vs actual.
  void TIER_TOLERANCE
}

function makeRegex(pattern: string): RegExp {
  try {
    return new RegExp(pattern, 'i')
  } catch {
    // pattern is treated as literal substring if invalid regex
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
