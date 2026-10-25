/**
 * 四维需求：0–100。危急时虚弱回窝，永无死亡。
 * 命名对齐 economy.md v2.3：肚子/毛顺/想玩/安康
 */

export type Needs = {
  hunger: number    // 肚子
  cleanliness: number // 毛顺
  mood: number      // 想玩
  energy: number    // 安康
}

export type NeedKey = keyof Needs

export const NEED_LABELS: Record<NeedKey, string> = {
  hunger: '肚子',
  cleanliness: '毛顺',
  mood: '想玩',
  energy: '安康',
}

/**
 * 每秒衰减量（economy.md §3）
 * hunger: 0.05/s = 3.0/min
 * mood: 0.04/s = 2.4/min
 * energy: 0.035/s = 2.1/min
 * cleanliness: 0.025/s = 1.5/min
 */
export const IDLE_DECAY_PER_SEC: Needs = {
  hunger: 0.05,
  mood: 0.04,
  energy: 0.035,
  cleanliness: 0.025,
}

export const CRITICAL_THRESHOLD = 15
export const LOW_THRESHOLD = 35

export function clampNeed(n: number): number {
  return Math.max(0, Math.min(100, n))
}

export function clampNeeds(n: Needs): Needs {
  return {
    hunger: clampNeed(n.hunger),
    cleanliness: clampNeed(n.cleanliness),
    mood: clampNeed(n.mood),
    energy: clampNeed(n.energy),
  }
}

/**
 * 衰减需求（economy.md §3）
 * 睡眠倍率：hunger×0.3, mood×0.2, clean×0.2
 * 睡眠 energy 回复：0.25/s
 */
export function decayNeeds(n: Needs, dtSec: number, sleeping: boolean): Needs {
  if (sleeping) {
    return clampNeeds({
      hunger: n.hunger - IDLE_DECAY_PER_SEC.hunger * 0.3 * dtSec,
      cleanliness: n.cleanliness - IDLE_DECAY_PER_SEC.cleanliness * 0.2 * dtSec,
      mood: n.mood - IDLE_DECAY_PER_SEC.mood * 0.2 * dtSec,
      energy: n.energy + 0.25 * dtSec,
    })
  }
  return clampNeeds({
    hunger: n.hunger - IDLE_DECAY_PER_SEC.hunger * dtSec,
    cleanliness: n.cleanliness - IDLE_DECAY_PER_SEC.cleanliness * dtSec,
    mood: n.mood - IDLE_DECAY_PER_SEC.mood * dtSec,
    energy: n.energy - IDLE_DECAY_PER_SEC.energy * dtSec,
  })
}

/** 危急：任一核心需求过低 → 软提示 / 强制想睡，不死亡 */
export function isCritical(n: Needs): boolean {
  return n.hunger <= CRITICAL_THRESHOLD || n.mood <= CRITICAL_THRESHOLD || n.energy <= CRITICAL_THRESHOLD
}

export function softCue(n: Needs): string | null {
  if (n.energy <= CRITICAL_THRESHOLD) return '好困……让我睡一会儿吧'
  if (n.hunger <= CRITICAL_THRESHOLD) return '肚子好空……想吃点东西'
  if (n.mood <= CRITICAL_THRESHOLD) return '有点孤单……摸摸我？'
  if (n.hunger <= LOW_THRESHOLD) return '好像有点饿了'
  if (n.mood <= LOW_THRESHOLD) return '想被摸摸'
  if (n.energy <= LOW_THRESHOLD) return '有点累了'
  if (n.cleanliness <= LOW_THRESHOLD) return '毛有点乱'
  return null
}

export const DEFAULT_NEEDS: Needs = {
  hunger: 80,
  cleanliness: 80,
  mood: 80,
  energy: 80,
}
