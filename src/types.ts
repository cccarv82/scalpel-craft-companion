export type RecipeSlot =
  | 'bow'
  | 'crossbow'
  | 'wand'
  | 'staff'
  | 'sceptre'
  | 'spear'
  | 'mace'
  | 'weapon_1h'
  | 'weapon_2h'
  | 'quiver'
  | 'shield'
  | 'focus'
  | 'helmet'
  | 'body_armour'
  | 'gloves'
  | 'boots'
  | 'belt'
  | 'amulet'
  | 'ring'
  | 'jewel'
  | 'other'

export type CostCurrency = 'chaos' | 'divine' | 'exalted' | 'mirror'

export type CurrencyCategory =
  | 'essence'
  | 'omen'
  | 'bone'
  | 'echo'
  | 'well'
  | 'recombinator'
  | 'rune'
  | 'standard'

export interface CurrencyRequirement {
  name: string
  category: CurrencyCategory
  qty?: number
  optional?: boolean
}

export interface ModRequirement {
  pattern: string
  minRoll?: number
  minTier?: number
  prefix?: boolean
  suffix?: boolean
  description?: string
}

export interface ItemMatcher {
  rarity?: ('normal' | 'magic' | 'rare' | 'unique')[]
  affixCount?: { min?: number; max?: number }
  ilvlMin?: number
  baseTypeIncludes?: string[]
  requiredMods?: ModRequirement[]
  forbiddenMods?: string[]
  fractured?: boolean
}

export interface Branch {
  condition: string
  match: ItemMatcher
  nextStep: number
  message?: string
}

export interface RecipeStep {
  index: number
  title: string
  description: string
  currency: CurrencyRequirement[]
  expectedAfter?: ItemMatcher
  branches?: Branch[]
  stopLoss?: string
}

export interface BaseRequirements {
  ilvl: number
  base: string
  hint?: string
  sockets?: number
  fractureFriendly?: boolean
}

export interface AuthedUser {
  id: string
  discordUsername: string
  displayName: string
}

export interface MeResponse {
  user: AuthedUser
  stats?: { recipesAuthored: number; completions: number }
}

export interface RecipeListItem {
  id: string
  title: string
  slot: RecipeSlot
  poeVersion: number
  league: string
  goal: string
  difficulty: number
  estimatedCostMin: string | null
  estimatedCostMax: string | null
  costCurrency: CostCurrency
  baseRequirements: BaseRequirements
  upvotes: number
  downvotes: number
  successCount: number
  viewCount: number
  status: 'draft' | 'published' | 'flagged' | 'deprecated'
  createdAt: string
  author: { id: string; displayName: string } | null
}

export interface RecipeDetail extends RecipeListItem {
  steps: RecipeStep[]
  pricingTips: string[]
  notes: string[]
  authorId: string | null
}

export interface RecipeListResponse {
  recipes: RecipeListItem[]
  page: number
  pageSize: number
  total: number
  sort: 'top' | 'recent' | 'trending'
}

export interface ModMatch {
  tier: number
  modName: string
  group: string
  level: number
  rollRange: [number, number][]
}

export interface ModLookupResponse {
  matches: ModMatch[]
  note?: string
}

export interface EventItem {
  id: string
  userId: string
  kind: string
  payload: Record<string, unknown>
  read: boolean
  createdAt: string
}

export type RecipeCreatePayload = {
  title: string
  slot: RecipeSlot
  poeVersion: 1 | 2
  league?: string
  goal: string
  difficulty?: number
  estimatedCostMin?: number
  estimatedCostMax?: number
  costCurrency?: CostCurrency
  baseRequirements: BaseRequirements
  steps: RecipeStep[]
  pricingTips?: string[]
  notes?: string[]
}
