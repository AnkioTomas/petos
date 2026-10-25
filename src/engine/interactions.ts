import type { Needs } from './needs'
import { clampNeeds, CRITICAL_THRESHOLD } from './needs'
import type { ItemDef, NeedEffect } from './items'

export type ActionId = 'pet' | 'sleep' | 'use_item'

export type ActionResult = {
  needs: Needs
  pose: 'pet' | 'eat' | 'sleep' | 'idle' | 'play' | 'clean'
  bubble?: string
  sleeping?: boolean
  xpGained?: number
}

export function applyAction(needs: Needs, action: ActionId, currentlySleeping: boolean): ActionResult {
  switch (action) {
    case 'pet': {
      const next = clampNeeds({
        ...needs,
        mood: needs.mood + 12,
        energy: needs.energy - 1,
      })
      return { needs: next, pose: 'pet', bubble: '呼噜～', sleeping: false, xpGained: 2 }
    }
    case 'sleep': {
      if (currentlySleeping) {
        return {
          needs: clampNeeds({ ...needs, energy: needs.energy + 8 }),
          pose: 'idle',
          bubble: '醒啦',
          sleeping: false,
          xpGained: 2,
        }
      }
      return {
        needs,
        pose: 'sleep',
        bubble: 'Zzz……',
        sleeping: true,
      }
    }
    case 'use_item':
      return { needs, pose: 'idle' }
  }
}

export function applyItemUse(needs: Needs, item: ItemDef): ActionResult {
  const effects: NeedEffect = item.effects
  const next = clampNeeds({
    hunger: needs.hunger + (effects.hunger ?? 0),
    cleanliness: needs.cleanliness + (effects.cleanliness ?? 0),
    mood: needs.mood + (effects.mood ?? 0),
    energy: needs.energy + (effects.energy ?? 0),
  })
  
  const categoryPose: Record<string, ActionResult['pose']> = {
    food: 'eat',
    clean: 'clean',
    med: 'eat',
    toy: 'play',
  }
  
  const categoryBubble: Record<string, string> = {
    food: '好好吃！',
    clean: '好舒服～',
    med: '精神多了！',
    toy: '好好玩！',
  }
  
  return {
    needs: next,
    pose: categoryPose[item.category] ?? 'idle',
    bubble: categoryBubble[item.category] ?? '嗯～',
    sleeping: false,
    xpGained: item.xp,
  }
}

export function isWeak(needs: Needs): boolean {
  return needs.energy <= CRITICAL_THRESHOLD
}

export function shouldForceNest(needs: Needs): boolean {
  return needs.energy <= CRITICAL_THRESHOLD
}
