/** 四维需求：0–100。危急只休眠可唤醒，无死亡。 */

export type Needs = {
  hunger: number // 饱腹
  mood: number // 心情
  energy: number // 精力
  cleanliness: number // 整洁
}

export type NeedKey = keyof Needs

export const NEED_LABELS: Record<NeedKey, string> = {
  hunger: '饱腹',
  mood: '心情',
  energy: '精力',
  cleanliness: '整洁',
}

/** 每秒衰减量（空闲） */
export const IDLE_DECAY_PER_SEC: Needs = {
  hunger: 0.08,
  mood: 0.05,
  energy: 0.04,
  cleanliness: 0.03,
}

export const CRITICAL_THRESHOLD = 15
export const LOW_THRESHOLD = 35

export function clampNeed(n: number): number {
  return Math.max(0, Math.min(100, n))
}

export function clampNeeds(n: Needs): Needs {
  return {
    hunger: clampNeed(n.hunger),
    mood: clampNeed(n.mood),
    energy: clampNeed(n.energy),
    cleanliness: clampNeed(n.cleanliness),
  }
}

export function decayNeeds(n: Needs, dtSec: number, sleeping: boolean): Needs {
  if (sleeping) {
    // 睡觉时精力回升，其他缓慢下降
    return clampNeeds({
      hunger: n.hunger - IDLE_DECAY_PER_SEC.hunger * 0.3 * dtSec,
      mood: n.mood - IDLE_DECAY_PER_SEC.mood * 0.2 * dtSec,
      energy: n.energy + 0.25 * dtSec,
      cleanliness: n.cleanliness - IDLE_DECAY_PER_SEC.cleanliness * 0.2 * dtSec,
    })
  }
  return clampNeeds({
    hunger: n.hunger - IDLE_DECAY_PER_SEC.hunger * dtSec,
    mood: n.mood - IDLE_DECAY_PER_SEC.mood * dtSec,
    energy: n.energy - IDLE_DECAY_PER_SEC.energy * dtSec,
    cleanliness: n.cleanliness - IDLE_DECAY_PER_SEC.cleanliness * dtSec,
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
  mood: 80,
  energy: 80,
  cleanliness: 80,
}
