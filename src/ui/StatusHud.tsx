import type { Needs, NeedKey } from '../engine/needs'
import { NEED_LABELS, CRITICAL_THRESHOLD, LOW_THRESHOLD } from '../engine/needs'

type Props = {
  needs: Needs
  pinned?: boolean
}

function barColor(v: number): string {
  if (v <= CRITICAL_THRESHOLD) return '#e85d5d'
  if (v <= LOW_THRESHOLD) return '#e8a85d'
  return '#7bc96f'
}

export function StatusHud({ needs, pinned }: Props) {
  const keys = Object.keys(NEED_LABELS) as NeedKey[]
  return (
    <div className={`status-hud ${pinned ? 'pinned' : ''}`}>
      {keys.map((k) => (
        <div key={k} className="hud-row" title={`${NEED_LABELS[k]} ${Math.round(needs[k])}`}>
          <span className="hud-label">{NEED_LABELS[k][0]}</span>
          <div className="hud-track">
            <div
              className="hud-fill"
              style={{ width: `${needs[k]}%`, background: barColor(needs[k]) }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
