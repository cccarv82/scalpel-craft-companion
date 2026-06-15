import type { CostCurrency, CurrencyCategory, RecipeSlot } from '../types'

export const SLOT_LABEL: Record<RecipeSlot, string> = {
  bow: 'Bow',
  crossbow: 'Crossbow',
  wand: 'Wand',
  staff: 'Staff',
  sceptre: 'Sceptre',
  spear: 'Spear',
  mace: 'Mace',
  weapon_1h: 'Weapon 1H',
  weapon_2h: 'Weapon 2H',
  quiver: 'Quiver',
  shield: 'Shield',
  focus: 'Focus',
  helmet: 'Helmet',
  body_armour: 'Body Armour',
  gloves: 'Gloves',
  boots: 'Boots',
  belt: 'Belt',
  amulet: 'Amulet',
  ring: 'Ring',
  jewel: 'Jewel',
  other: 'Other',
}

export const COST_CURRENCY_LABEL: Record<CostCurrency, string> = {
  chaos: 'c',
  divine: 'div',
  exalted: 'ex',
  mirror: 'mirror',
}

export const CATEGORY_COLOR: Record<CurrencyCategory, string> = {
  essence: '#cf9bff',
  omen: '#ffb86c',
  bone: '#f6c177',
  echo: '#8be9fd',
  well: '#7fffd4',
  recombinator: '#ff79c6',
  rune: '#b8e986',
  standard: '#aaaaaa',
}

export const CATEGORY_LABEL: Record<CurrencyCategory, string> = {
  essence: 'Essence',
  omen: 'Omen',
  bone: 'Bone',
  echo: 'Echo',
  well: 'Well',
  recombinator: 'Recombinator',
  rune: 'Rune',
  standard: 'Standard',
}

export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (sec < 60) return `${sec}s ago`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86_400) return `${Math.floor(sec / 3600)}h ago`
  return `${Math.floor(sec / 86_400)}d ago`
}

export function formatCost(min: string | null, max: string | null, currency: CostCurrency): string {
  const unit = COST_CURRENCY_LABEL[currency]
  const lo = min != null ? trimNum(min) : null
  const hi = max != null ? trimNum(max) : null
  if (lo != null && hi != null) {
    if (lo === hi) return `${lo} ${unit}`
    return `${lo}-${hi} ${unit}`
  }
  if (lo != null) return `${lo}+ ${unit}`
  if (hi != null) return `up to ${hi} ${unit}`
  return '—'
}

function trimNum(s: string): string {
  const n = Number(s)
  if (!Number.isFinite(n)) return s
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(2).replace(/\.?0+$/, '')
}

export function difficultyStars(d: number): string {
  const filled = Math.max(1, Math.min(5, Math.round(d)))
  return '★'.repeat(filled) + '☆'.repeat(5 - filled)
}

export function copyToClipboard(text: string): boolean {
  try {
    void navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
