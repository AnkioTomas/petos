import type { Needs } from './needs'
import { clampNeeds } from './needs'

export type ActionId = 'pet' | 'feed' | 'sleep' | 'play'

export type ActionResult = {
  needs: Needs
  pose: 'pet' | 'eat' | 'sleep' | 'idle' | 'play'
  bubble?: string
  /** sleep toggles resting mode */
  sleeping?: boolean
}

export function applyAction(needs: Needs, action: ActionId, currentlySleeping: boolean): ActionResult {
  switch (action) {
    case 'pet': {
      const next = clampNeeds({
        ...needs,
        mood: needs.mood + 12,
        energy: needs.energy - 1,
      })
      return { needs: next, pose: 'pet', bubble: '呼噜～', sleeping: false }
    }
    case 'feed': {
      const next = clampNeeds({
        ...needs,
        hunger: needs.hunger + 22,
        mood: needs.mood + 4,
        cleanliness: needs.cleanliness - 2,
      })
      return { needs: next, pose: 'eat', bubble: '好好吃！', sleeping: false }
    }
    case 'sleep': {
      if (currentlySleeping) {
        return {
          needs: clampNeeds({ ...needs, energy: needs.energy + 8 }),
          pose: 'idle',
          bubble: '醒啦',
          sleeping: false,
        }
      }
      return {
        needs,
        pose: 'sleep',
        bubble: 'Zzz……',
        sleeping: true,
      }
    }
    case 'play': {
      // M1 stub
      const next = clampNeeds({
        ...needs,
        mood: needs.mood + 10,
        energy: needs.energy - 8,
        hunger: needs.hunger - 4,
      })
      return { needs: next, pose: 'play', bubble: '（玩法槽位 · 敬请期待）', sleeping: false }
    }
  }
}
