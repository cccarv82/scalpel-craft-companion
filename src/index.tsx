import type { PluginActivate, ScalpelPluginContext } from '@scalpelpoe/plugin-sdk'
import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { App } from './components/App'
import { TAB_ICON } from './components/icons'
import { getMe, listEvents } from './lib/api'
import { loadFromStorage, persistAuth, persistLastEventTs, persistSettings, useStore } from './store'

const activate: PluginActivate = async (ctx: ScalpelPluginContext) => {
  const stored = await loadFromStorage(ctx.storage)
  useStore.getState().hydrate(stored)
  await persistSettings(ctx.storage, stored.settings)

  // Validate stored token
  if (stored.token) {
    try {
      const me = await getMe(stored.token)
      useStore.getState().setAuth(stored.token, me.user)
      await persistAuth(ctx.storage, stored.token, me.user)
    } catch {
      await persistAuth(ctx.storage, null, null)
      useStore.getState().logout()
    }
  }

  // Subscribe to Ctrl+D'd items — feed the matcher + analyzer
  const offItem = ctx.onCurrentItem((item) => {
    if (!item.baseType) return
    const mods = [...(item.explicits ?? []), ...(item.implicits ?? [])]
    useStore.getState().setLastCaptured(item.baseType, mods)
  })

  // Events polling
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  const pollEvents = async () => {
    const s = useStore.getState()
    if (!s.token) return
    try {
      const res = await listEvents(s.token, s.lastEventTs || undefined)
      if (res.events.length > 0) {
        s.pushEvents(res.events, res.serverTime)
        await persistLastEventTs(ctx.storage, res.serverTime)
      } else if (res.serverTime !== s.lastEventTs) {
        await persistLastEventTs(ctx.storage, res.serverTime)
      }
    } catch {}
  }
  const schedulePoll = () => {
    pollTimer = setTimeout(async () => {
      await pollEvents()
      schedulePoll()
    }, useStore.getState().settings.pollIntervalMs)
  }
  schedulePoll()

  // Register the tab
  let root: Root | null = null
  ctx.registerTab({
    label: 'Craft Companion',
    icon: TAB_ICON,
    render: (container) => {
      root = createRoot(container)
      root.render(
        <StrictMode>
          <App ctx={ctx} />
        </StrictMode>,
      )
      return () => {
        root?.unmount()
        root = null
      }
    },
  })

  return () => {
    offItem()
    if (pollTimer) clearTimeout(pollTimer)
    root?.unmount()
  }
}

export default activate
