import { difficultyStars, formatCost, SLOT_LABEL, timeAgo } from '../lib/format'
import type { RecipeListItem } from '../types'
import { btn, btnPrimary, card, tag } from './ui'

interface Props {
  recipe: RecipeListItem
  onOpen: () => void
  onStartSession?: () => void
}

export function RecipeCard({ recipe, onOpen, onStartSession }: Props) {
  return (
    <div
      style={{
        ...card,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        cursor: 'pointer',
      }}
      onClick={onOpen}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ color: '#f0a020', fontSize: 11, fontWeight: 600 }}>{SLOT_LABEL[recipe.slot]}</span>
        <span style={{ opacity: 0.5, fontSize: 10 }}>{timeAgo(recipe.createdAt)}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{recipe.title}</div>
      <div
        style={{
          fontSize: 12,
          opacity: 0.75,
          maxHeight: 48,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {recipe.goal}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={tag}>PoE{recipe.poeVersion}</span>
        {recipe.league && recipe.league !== 'all' && <span style={tag}>{recipe.league}</span>}
        <span style={{ ...tag, color: '#fc0' }}>{difficultyStars(recipe.difficulty)}</span>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          paddingTop: 6,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: 12,
        }}
      >
        <strong>{formatCost(recipe.estimatedCostMin, recipe.estimatedCostMax, recipe.costCurrency)}</strong>
        <span style={{ opacity: 0.65 }}>
          ▲{recipe.upvotes} ▼{recipe.downvotes} · {recipe.successCount}✓ · {recipe.viewCount}👁
        </span>
      </div>
      <div style={{ fontSize: 11, opacity: 0.55 }}>
        {recipe.author ? `by ${recipe.author.displayName}` : 'curated'}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" style={btn} onClick={(e) => { e.stopPropagation(); onOpen() }}>
          View
        </button>
        {onStartSession && (
          <button
            type="button"
            style={btnPrimary}
            onClick={(e) => {
              e.stopPropagation()
              onStartSession()
            }}
          >
            Start craft
          </button>
        )}
      </div>
    </div>
  )
}
