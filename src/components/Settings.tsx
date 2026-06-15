import type { ScalpelPluginContext } from '@scalpelpoe/plugin-sdk'
import { persistSettings, useStore } from '../store'
import { card, label as labelStyle } from './ui'

interface Props {
  ctx: ScalpelPluginContext
}

export function Settings({ ctx }: Props) {
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)

  const update = async (patch: Partial<typeof settings>) => {
    setSettings(patch)
    await persistSettings(ctx.storage, { ...settings, ...patch })
  }

  return (
    <div style={{ padding: 12, maxWidth: 520 }}>
      <div style={card}>
        <div style={labelStyle}>Behavior</div>
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 13, padding: '6px 0' }}>
          <span>Beep when a new event arrives</span>
          <input
            type="checkbox"
            checked={settings.beepOnEvent}
            onChange={(e) => update({ beepOnEvent: e.target.checked })}
          />
        </label>
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 13, padding: '6px 0' }}>
          <span>Preferred PoE version</span>
          <select
            value={settings.preferredPoeVersion}
            onChange={(e) => update({ preferredPoeVersion: Number(e.target.value) as 1 | 2 })}
          >
            <option value={2}>PoE 2</option>
            <option value={1}>PoE 1</option>
          </select>
        </label>
        <div style={{ fontSize: 11, opacity: 0.55, marginTop: 6 }}>
          Server polled every {Math.round(settings.pollIntervalMs / 1000)}s for new events.
        </div>
      </div>
    </div>
  )
}
