import type { ScalpelPluginContext } from '@scalpelpoe/plugin-sdk'
import { useStore } from '../store'
import { ActiveSession } from './ActiveSession'
import { Analyzer } from './Analyzer'
import { Login } from './Login'
import { Profile } from './Profile'
import { RecipeBrowser } from './RecipeBrowser'
import { RecipeDetail } from './RecipeDetail'
import { Settings } from './Settings'
import { btn } from './ui'

interface Props {
  ctx: ScalpelPluginContext
}

export function App({ ctx }: Props) {
  const ready = useStore((s) => s.ready)
  const view = useStore((s) => s.view)
  const user = useStore((s) => s.user)
  const setView = useStore((s) => s.setView)
  const session = useStore((s) => s.activeSession)

  if (!ready) return null
  if (!user) return <Login ctx={ctx} />

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          gap: 4,
          alignItems: 'center',
          padding: '8px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexWrap: 'wrap',
        }}
      >
        <strong style={{ marginRight: 12, color: 'var(--text)', fontSize: 14 }}>Craft Companion</strong>
        <Tab label="Recipes" active={view === 'browse' || view === 'detail'} onClick={() => setView('browse')} />
        <Tab label={`Active${session ? ' ●' : ''}`} active={view === 'active'} onClick={() => setView('active')} />
        <Tab label="Analyzer" active={view === 'analyzer'} onClick={() => setView('analyzer')} />
        <div style={{ flex: 1 }} />
        <Tab label="⚙" active={view === 'settings'} onClick={() => setView('settings')} />
        <Tab label={user.displayName} active={view === 'profile'} onClick={() => setView('profile')} />
      </header>
      <main style={{ flex: 1, overflow: 'auto' }}>
        {view === 'browse' && <RecipeBrowser />}
        {view === 'detail' && <RecipeDetail />}
        {view === 'active' && <ActiveSession ctx={ctx} />}
        {view === 'analyzer' && <Analyzer />}
        {view === 'profile' && <Profile ctx={ctx} />}
        {view === 'settings' && <Settings ctx={ctx} />}
      </main>
    </div>
  )
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...btn,
        background: active ? 'var(--accent, #f0a020)' : 'transparent',
        color: active ? '#000' : 'var(--text)',
        border: '1px solid ' + (active ? 'var(--accent, #f0a020)' : 'rgba(255,255,255,0.1)'),
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  )
}
