import type { Needs, NeedKey } from '../engine/needs'
import { NEED_LABELS, CRITICAL_THRESHOLD, LOW_THRESHOLD } from '../engine/needs'
import {
  STAGE_LABELS,
  xpProgressInStage,
  type GrowthState,
} from '../engine/growth'

type Props = {
  needs: Needs
  growth: GrowthState
  pinned?: boolean
}

function barColor(v: number): string {
  if (v <= CRITICAL_THRESHOLD) return '#e85d5d'
  if (v <= LOW_THRESHOLD) return '#e8a85d'
  return '#7bc96f'
}

export function StatusHud({ needs, growth, pinned }: Props) {
  const keys = Object.keys(NEED_LABELS) as NeedKey[]
  const prog = xpProgressInStage(growth)
  return (
    <div className={`status-hud ${pinned ? 'pinned' : ''}`}>
      <div className="hud-stage" title={`Lv.${growth.level} · 经验 ${growth.xp}`}>
        <span className="hud-stage-label">{STAGE_LABELS[growth.stage]}</span>
        <div className="hud-track hud-xp">
          <div className="hud-fill" style={{ width: `${prog.ratio * 100}%`, background: '#7eb6e8' }} />
        </div>
      </div>
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
