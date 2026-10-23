export type StageId = 'baby' | 'teen' | 'youth' | 'adult'

export type GrowthState = {
  xp: number
  stage: StageId
}

export const STAGE_ORDER: StageId[] = ['baby', 'teen', 'youth', 'adult']

export const STAGE_LABELS: Record<StageId, string> = {
  baby: '幼体',
  teen: '少年',
  youth: '青年',
  adult: '成年',
}

/** Visual scale for packs without per-stage art (logo demo uses this). */
export const STAGE_SCALE: Record<StageId, number> = {
  baby: 0.72,
  teen: 0.85,
  youth: 0.95,
  adult: 1,
}

/** Cumulative XP thresholds — never decreases stage. */
const STAGE_MIN_XP: Record<StageId, number> = {
  baby: 0,
  teen: 40,
  youth: 120,
  adult: 280,
}

export const XP_REWARDS: Record<'pet' | 'feed' | 'sleep' | 'play', number> = {
  pet: 2,
  feed: 3,
  sleep: 2,
  play: 4,
}

export const DEFAULT_GROWTH: GrowthState = { xp: 0, stage: 'baby' }

export function stageForXp(xp: number): StageId {
  let stage: StageId = 'baby'
  for (const id of STAGE_ORDER) {
    if (xp >= STAGE_MIN_XP[id]) stage = id
  }
  return stage
}

export function xpProgressInStage(state: GrowthState): { current: number; nextAt: number | null; ratio: number } {
  const idx = STAGE_ORDER.indexOf(state.stage)
  const min = STAGE_MIN_XP[state.stage]
  const nextId = STAGE_ORDER[idx + 1]
  if (!nextId) {
    return { current: state.xp - min, nextAt: null, ratio: 1 }
  }
  const nextAt = STAGE_MIN_XP[nextId]
  const span = Math.max(1, nextAt - min)
  const current = Math.max(0, state.xp - min)
  return { current, nextAt, ratio: Math.min(1, current / span) }
}

export function applyGrowthXp(
  state: GrowthState,
  action: 'pet' | 'feed' | 'sleep' | 'play',
): { state: GrowthState; xpGained: number; leveledUp: boolean; from?: StageId; to?: StageId } {
  const xpGained = XP_REWARDS[action]
  const xp = Math.max(0, state.xp + xpGained)
  const stage = stageForXp(xp)
  const leveledUp = stage !== state.stage
  return {
    state: { xp, stage },
    xpGained,
    leveledUp,
    ...(leveledUp ? { from: state.stage, to: stage } : {}),
  }
}
