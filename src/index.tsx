import type { PluginActivate, ScalpelPluginContext } from '@scalpelpoe/plugin-sdk'
import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { App } from './components/App'
import { TAB_ICON } from './components/icons'
import { getMe, listEvents } from './lib/api'
import { loadFromStorage, persistAuth, persistLastEventTs, persistSettings, useStore } from './store'

let audioCtx: AudioContext | null = null
function beep() {
  try {
    if (!audioCtx) {
      const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
      const Ctor = W.AudioContext ?? W.webkitAudioContext
      if (!Ctor) return
      audioCtx = new Ctor()
    }
    const ctx = audioCtx
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g)
    g.connect(ctx.destination)
    o.type = 'sine'
    o.frequency.value = 780
    g.gain.setValueAtTime(0.1, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3)
    o.start()
    o.stop(ctx.currentTime + 0.3)
  } catch {}
}

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
    const explicits = item.explicits ?? []
    const implicits = item.implicits ?? []
    const fractured = explicits.some((m) => /\(fractured\)/i.test(m)) || implicits.some((m) => /\(fractured\)/i.test(m))
    useStore.getState().setLastCaptured({
      baseType: item.baseType,
      name: item.name ?? '',
      rarity: (item.rarity ?? '').toString().toLowerCase(),
      itemLevel: item.itemLevel ?? 0,
      quality: item.quality ?? 0,
      corrupted: !!item.corrupted,
      identified: item.identified !== false,
      explicits,
      implicits,
      fractured,
      capturedAt: Date.now(),
    })
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
        if (s.settings.beepOnEvent) beep()
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
