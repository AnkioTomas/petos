/**
 * 今日岛课插件（petos.quests.daily）
 * economy.md §6：4条/日，单条 18-24 金币，06:00 换日
 */

export type DailyQuest = {
  id: string
  title: string
  description: string
  target: number
  progress: number
  reward: { gold: number; xp: number }
  completed: boolean
  claimed: boolean
}

export type QuestTemplate = {
  id: string
  title: string
  description: string
  targetRange: [number, number]
  rewardRange: { gold: [number, number]; xp: [number, number] }
  weight: number
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    id: 'feed_pet',
    title: '喂饱糯糯',
    description: '使用食物喂养糯糯 {target} 次',
    targetRange: [2, 4],
    rewardRange: { gold: [18, 22], xp: [4, 6] },
    weight: 3,
  },
  {
    id: 'clean_pet',
    title: '整洁糯糯',
    description: '使用清洁物品 {target} 次',
    targetRange: [1, 3],
    rewardRange: { gold: [18, 20], xp: [3, 5] },
    weight: 2,
  },
  {
    id: 'play_pet',
    title: '陪糯糯玩',
    description: '使用玩具 {target} 次',
    targetRange: [2, 3],
    rewardRange: { gold: [20, 24], xp: [4, 6] },
    weight: 3,
  },
  {
    id: 'pet_pet',
    title: '摸摸糯糯',
    description: '摸糯糯 {target} 次',
    targetRange: [3, 6],
    rewardRange: { gold: [18, 20], xp: [3, 5] },
    weight: 2,
  },
  {
    id: 'maintain_hunger',
    title: '不让糯糯饿肚子',
    description: '保持肚子不低于35持续 {target} 分钟',
    targetRange: [3, 5],
    rewardRange: { gold: [20, 24], xp: [4, 6] },
    weight: 2,
  },
  {
    id: 'maintain_mood',
    title: '快乐每一天',
    description: '保持心情不低于50持续 {target} 分钟',
    targetRange: [3, 5],
    rewardRange: { gold: [20, 24], xp: [4, 6] },
    weight: 2,
  },
  {
    id: 'buy_items',
    title: '购物小能手',
    description: '在商店购买 {target} 件物品',
    targetRange: [2, 4],
    rewardRange: { gold: [18, 22], xp: [3, 5] },
    weight: 2,
  },
  {
    id: 'login_daily',
    title: '每日签到',
    description: '今天登录一次',
    targetRange: [1, 1],
    rewardRange: { gold: [18, 20], xp: [3, 4] },
    weight: 1,
  },
]

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function weightedPick<T extends { weight: number }>(items: T[], count: number): T[] {
  const pool = [...items]
  const result: T[] = []
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0)
  
  for (let i = 0; i < count && pool.length > 0; i++) {
    let r = Math.random() * totalWeight
    let picked: T | null = null
    let pickedIdx = -1
    
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].weight
      if (r <= 0) {
        picked = pool[j]
        pickedIdx = j
        break
      }
    }
    
    if (picked && pickedIdx >= 0) {
      result.push(picked)
      pool.splice(pickedIdx, 1)
    }
  }
  
  return result
}

export function generateDailyQuests(dayKey: string): DailyQuest[] {
  const seed = dayKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const rng = () => {
    const x = Math.sin(seed + rng.i++) * 10000
    return x - Math.floor(x)
  }
  rng.i = 0
  
  const picked = weightedPick(QUEST_TEMPLATES, 4)
  
  return picked.map((template, idx) => {
    const target = randomInRange(...template.targetRange)
    const gold = randomInRange(...template.rewardRange.gold)
    const xp = randomInRange(...template.rewardRange.xp)
    
    return {
      id: `${dayKey}_${template.id}_${idx}`,
      title: template.title,
      description: template.description.replace('{target}', String(target)),
      target,
      progress: template.id === 'login_daily' ? 1 : 0,
      reward: { gold, xp },
      completed: template.id === 'login_daily',
      claimed: false,
    }
  })
}

export function getDayKey(date: Date = new Date()): string {
  const hour = date.getHours()
  const d = new Date(date)
  if (hour < 6) {
    d.setDate(d.getDate() - 1)
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function updateQuestProgress(
  quests: DailyQuest[],
  questType: string,
  amount: number = 1
): DailyQuest[] {
  return quests.map(q => {
    if (q.claimed || !q.id.includes(questType)) return q
    const newProgress = Math.min(q.target, q.progress + amount)
    return {
      ...q,
      progress: newProgress,
      completed: newProgress >= q.target,
    }
  })
}
