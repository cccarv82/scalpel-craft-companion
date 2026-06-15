import type { CSSProperties } from 'react'

export const btn: CSSProperties = {
  background: 'var(--bg-card, rgba(255,255,255,0.06))',
  color: 'var(--text, white)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 4,
  padding: '5px 12px',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

export const btnPrimary: CSSProperties = {
  ...btn,
  background: '#f0a020',
  color: '#000',
  border: '1px solid #f0a020',
  fontWeight: 600,
}

export const btnDanger: CSSProperties = {
  ...btn,
  borderColor: 'rgba(255,100,100,0.5)',
  color: '#ff8888',
}

export const input: CSSProperties = {
  padding: '5px 8px',
  background: 'var(--bg, rgba(0,0,0,0.3))',
  color: 'var(--text, white)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 4,
  fontSize: 13,
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
}

export const card: CSSProperties = {
  background: 'var(--bg-card, rgba(255,255,255,0.04))',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 6,
  padding: 12,
}

export const label: CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  opacity: 0.6,
  color: 'var(--text-muted, rgba(255,255,255,0.55))',
  marginBottom: 4,
}

export const tag: CSSProperties = {
  display: 'inline-block',
  padding: '2px 6px',
  borderRadius: 3,
  fontSize: 10,
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--text, white)',
}
