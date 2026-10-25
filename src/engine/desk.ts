/**
 * Desk 行为状态机（CORE）
 * redesign.md §5.3 Desk 状态机
 * 
 * idle/stand → walk → look/stop → idle
 *            → jump → idle
 *            → edge_hide (L/R) → idle
 *            → lift (dragging) → idle
 *            → sleep / weak_nest
 */

export type DeskBehavior = 
  | 'idle'
  | 'walk_left'
  | 'walk_right'
  | 'jump'
  | 'edge_hide_left'
  | 'edge_hide_right'
  | 'lift'
  | 'sleep'
  | 'weak'

export type DeskState = {
  behavior: DeskBehavior
  startedAt: number
  duration: number
  idleVariant: number
}

export const BEHAVIOR_DURATIONS: Partial<Record<DeskBehavior, [number, number]>> = {
  walk_left: [2000, 4000],
  walk_right: [2000, 4000],
  jump: [600, 1000],
  edge_hide_left: [3000, 8000],
  edge_hide_right: [3000, 8000],
}

export const IDLE_TRIGGER_RANGE: [number, number] = [20000, 60000]

export const DEFAULT_DESK_STATE: DeskState = {
  behavior: 'idle',
  startedAt: Date.now(),
  duration: 0,
  idleVariant: 0,
}

const IDLE_VARIANTS = 4

export function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function pickRandomBehavior(canWalk: boolean, nearEdge: 'left' | 'right' | null): DeskBehavior {
  const pool: DeskBehavior[] = ['jump']
  
  if (canWalk) {
    pool.push('walk_left', 'walk_right')
  }
  
  if (nearEdge === 'left') {
    pool.push('edge_hide_left')
  } else if (nearEdge === 'right') {
    pool.push('edge_hide_right')
  }
  
  return pool[Math.floor(Math.random() * pool.length)]
}

export function createIdleState(): DeskState {
  return {
    behavior: 'idle',
    startedAt: Date.now(),
    duration: randomInRange(...IDLE_TRIGGER_RANGE),
    idleVariant: Math.floor(Math.random() * IDLE_VARIANTS),
  }
}

export function createBehaviorState(behavior: DeskBehavior): DeskState {
  const range = BEHAVIOR_DURATIONS[behavior]
  return {
    behavior,
    startedAt: Date.now(),
    duration: range ? randomInRange(...range) : 1000,
    idleVariant: 0,
  }
}

export function shouldTriggerBehavior(state: DeskState): boolean {
  if (state.behavior !== 'idle') return false
  return Date.now() - state.startedAt >= state.duration
}

export function isBehaviorComplete(state: DeskState): boolean {
  if (state.behavior === 'idle') return false
  if (state.behavior === 'sleep' || state.behavior === 'weak') return false
  if (state.behavior === 'lift') return false
  return Date.now() - state.startedAt >= state.duration
}

export function getBehaviorProgress(state: DeskState): number {
  if (state.duration === 0) return 1
  return Math.min(1, (Date.now() - state.startedAt) / state.duration)
}

export function mapBehaviorToPose(behavior: DeskBehavior): string {
  switch (behavior) {
    case 'idle':
      return 'idle'
    case 'walk_left':
    case 'walk_right':
      return 'walk'
    case 'jump':
      return 'jump'
    case 'edge_hide_left':
    case 'edge_hide_right':
      return 'hide'
    case 'lift':
      return 'lift'
    case 'sleep':
      return 'sleep'
    case 'weak':
      return 'weak'
    default:
      return 'idle'
  }
}

export function canPerformBehavior(isWeak: boolean, isSleeping: boolean, isOccupied: boolean): boolean {
  if (isWeak || isSleeping || isOccupied) return false
  return true
}
