/**
 * 成长引擎（CORE）
 * economy.md §7 Demo 压缩表：0/30/90/200
 * 形态：juvenile（幼年/少年/青年）→ adult（成年）
 */

export type StageId = 'baby' | 'teen' | 'youth' | 'adult'
export type FormId = 'juvenile' | 'adult'

export type GrowthState = {
  xp: number
  stage: StageId
  level: number
}

export const STAGE_ORDER: StageId[] = ['baby', 'teen', 'youth', 'adult']

export const STAGE_LABELS: Record<StageId, string> = {
  baby: '幼体',
  teen: '少年',
  youth: '青年',
  adult: '成年',
}

export const FORM_LABELS: Record<FormId, string> = {
  juvenile: '幼年形态',
  adult: '成年形态',
}

/** Visual scale for packs without per-stage art. */
export const STAGE_SCALE: Record<StageId, number> = {
  baby: 0.72,
  teen: 0.85,
  youth: 0.95,
  adult: 1,
}

/**
 * Demo 压缩表（economy.md §7.3）
 * baby: 0, teen: 30, youth: 90, adult: 200
 */
const STAGE_MIN_XP: Record<StageId, number> = {
  baby: 0,
  teen: 30,
  youth: 90,
  adult: 200,
}

export const DEFAULT_GROWTH: GrowthState = { xp: 0, stage: 'baby', level: 1 }

export function stageForXp(xp: number): StageId {
  let stage: StageId = 'baby'
  for (const id of STAGE_ORDER) {
    if (xp >= STAGE_MIN_XP[id]) stage = id
  }
  return stage
}

/** 形态：成年 XP ≥200 → adult，否则 juvenile */
export function formForStage(stage: StageId): FormId {
  return stage === 'adult' ? 'adult' : 'juvenile'
}

export function formForXp(xp: number): FormId {
  return formForStage(stageForXp(xp))
}

/** Demo 等级计算：简化为 1 + floor(xp / 20) */
export function levelForXp(xp: number): number {
  return 1 + Math.floor(xp / 20)
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
  xpAmount: number,
): { state: GrowthState; xpGained: number; leveledUp: boolean; stageChanged: boolean; from?: StageId; to?: StageId } {
  const xp = Math.max(0, state.xp + xpAmount)
  const stage = stageForXp(xp)
  const level = levelForXp(xp)
  const stageChanged = stage !== state.stage
  const leveledUp = level > state.level || stageChanged
  return {
    state: { xp, stage, level },
    xpGained: xpAmount,
    leveledUp,
    stageChanged,
    ...(stageChanged ? { from: state.stage, to: stage } : {}),
  }
}
