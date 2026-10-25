/**
 * 占用互斥服务（CORE Host API）
 * redesign.md §6.3 / plugin-spec.md §7
 * 
 * idle ⇄ (work | study | trip)  ← 仅插件申请
 * idle → weak → idle           ← CORE
 * 
 * 互斥：Host 保证三外出同时唯一
 * 召回系数：0.55
 */

export type OccupationKind = 'work' | 'study' | 'trip'

export type OccupationState = {
  kind: OccupationKind | null
  jobId: string | null
  startedAt: number | null
  duration: number | null
}

export const RECALL_COEFFICIENT = 0.55

export const DEFAULT_OCCUPATION: OccupationState = {
  kind: null,
  jobId: null,
  startedAt: null,
  duration: null,
}

export type OccupationResult = {
  ok: boolean
  state: OccupationState
  reason?: string
}

export function requestOccupation(
  current: OccupationState,
  kind: OccupationKind,
  jobId: string,
  duration: number,
  isWeak: boolean
): OccupationResult {
  if (isWeak) {
    return { ok: false, state: current, reason: 'weak_state' }
  }
  if (current.kind !== null) {
    return { ok: false, state: current, reason: 'already_occupied' }
  }
  return {
    ok: true,
    state: {
      kind,
      jobId,
      startedAt: Date.now(),
      duration,
    },
  }
}

export function releaseOccupation(
  current: OccupationState,
  recalled: boolean
): { state: OccupationState; elapsed: number; coefficient: number } {
  const elapsed = current.startedAt ? Date.now() - current.startedAt : 0
  return {
    state: DEFAULT_OCCUPATION,
    elapsed,
    coefficient: recalled ? RECALL_COEFFICIENT : 1.0,
  }
}

export function getOccupationProgress(state: OccupationState): number {
  if (!state.startedAt || !state.duration) return 0
  const elapsed = Date.now() - state.startedAt
  return Math.min(1, elapsed / state.duration)
}

export function isOccupied(state: OccupationState): boolean {
  return state.kind !== null
}
