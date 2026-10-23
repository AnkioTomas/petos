import type { Needs, NeedKey } from '../engine/needs'
import { NEED_LABELS, CRITICAL_THRESHOLD, LOW_THRESHOLD } from '../engine/needs'

type Props = {
  needs: Needs
  sleeping: boolean
  onAction: (a: 'pet' | 'feed' | 'sleep' | 'play') => void
}

function barColor(v: number): string {
  if (v <= CRITICAL_THRESHOLD) return '#e85d5d'
  if (v <= LOW_THRESHOLD) return '#e8a85d'
  return '#7bc96f'
}

export function Controls({ needs, sleeping, onAction }: Props) {
  const keys = Object.keys(NEED_LABELS) as NeedKey[]
  return (
    <div className="controls">
      <div className="need-bars">
        {keys.map((k) => (
          <div key={k} className="need-row">
            <span className="need-label">{NEED_LABELS[k]}</span>
            <div className="need-track">
              <div
                className="need-fill"
                style={{ width: `${needs[k]}%`, background: barColor(needs[k]) }}
              />
            </div>
            <span className="need-val">{Math.round(needs[k])}</span>
          </div>
        ))}
      </div>
      <div className="action-row">
        <button type="button" onClick={() => onAction('pet')} disabled={sleeping}>
          摸
        </button>
        <button type="button" onClick={() => onAction('feed')} disabled={sleeping}>
          喂
        </button>
        <button type="button" onClick={() => onAction('sleep')}>
          {sleeping ? '叫醒' : '睡'}
        </button>
        <button type="button" className="stub" onClick={() => onAction('play')} disabled={sleeping} title="M1 占位">
          玩
        </button>
      </div>
    </div>
  )
}
