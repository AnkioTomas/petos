/**
 * 物品系统（CORE 背包 + 照料小铺）
 * economy.md §4 照料货架 SKU
 */

import type { CurrencyId } from './wallet'

export type ItemCategory = 'food' | 'clean' | 'med' | 'toy'

export type NeedEffect = {
  hunger?: number
  cleanliness?: number
  mood?: number
  energy?: number
}

export type ItemDef = {
  sku: string
  name: string
  category: ItemCategory
  price: { currency: CurrencyId; amount: number }
  effects: NeedEffect
  xp: number
  description?: string
}

export type InventoryItem = {
  sku: string
  quantity: number
}

export type Inventory = InventoryItem[]

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  food: '食物',
  clean: '清洁',
  med: '药品',
  toy: '玩具',
}

/**
 * 照料小铺起步 SKU（CORE）
 * economy.md §4
 */
export const STARTER_ITEMS: ItemDef[] = [
  // 食物 ≥6
  {
    sku: 'food_fish_snack',
    name: '小鱼干',
    category: 'food',
    price: { currency: 'gold', amount: 12 },
    effects: { hunger: 20 },
    xp: 3,
  },
  {
    sku: 'food_cat_food',
    name: '猫粮',
    category: 'food',
    price: { currency: 'gold', amount: 20 },
    effects: { hunger: 30 },
    xp: 4,
  },
  {
    sku: 'food_milk',
    name: '鲜牛奶',
    category: 'food',
    price: { currency: 'gold', amount: 16 },
    effects: { hunger: 14, mood: 8 },
    xp: 3,
  },
  {
    sku: 'food_seafood_can',
    name: '海鲜罐头',
    category: 'food',
    price: { currency: 'gold', amount: 32 },
    effects: { hunger: 38, mood: 8 },
    xp: 5,
  },
  {
    sku: 'food_rice_ball',
    name: '饭团',
    category: 'food',
    price: { currency: 'gold', amount: 14 },
    effects: { hunger: 18 },
    xp: 3,
  },
  {
    sku: 'food_cookie',
    name: '小饼干',
    category: 'food',
    price: { currency: 'gold', amount: 10 },
    effects: { hunger: 12, mood: 4 },
    xp: 2,
  },
  // 清洁 ≥3
  {
    sku: 'clean_wipes',
    name: '湿巾',
    category: 'clean',
    price: { currency: 'gold', amount: 14 },
    effects: { cleanliness: 24 },
    xp: 2,
  },
  {
    sku: 'clean_brush',
    name: '软毛梳',
    category: 'clean',
    price: { currency: 'gold', amount: 22 },
    effects: { cleanliness: 40 },
    xp: 3,
  },
  {
    sku: 'clean_shampoo',
    name: '泡沫浴露',
    category: 'clean',
    price: { currency: 'gold', amount: 36 },
    effects: { cleanliness: 55 },
    xp: 4,
  },
  // 药品 ≥2
  {
    sku: 'med_vitamin',
    name: '小维生素',
    category: 'med',
    price: { currency: 'gold', amount: 28 },
    effects: { energy: 16 },
    xp: 2,
  },
  {
    sku: 'med_nutrition',
    name: '营养膏',
    category: 'med',
    price: { currency: 'gold', amount: 42 },
    effects: { hunger: 8, cleanliness: 4, mood: 6, energy: 10 },
    xp: 3,
  },
  // 玩具 ≥3
  {
    sku: 'toy_stick',
    name: '逗猫棒',
    category: 'toy',
    price: { currency: 'gold', amount: 24 },
    effects: { mood: 20 },
    xp: 4,
  },
  {
    sku: 'toy_ball',
    name: '毛线球',
    category: 'toy',
    price: { currency: 'gold', amount: 18 },
    effects: { mood: 15 },
    xp: 3,
  },
  {
    sku: 'toy_laser',
    name: '激光笔',
    category: 'toy',
    price: { currency: 'gold', amount: 38 },
    effects: { mood: 26 },
    xp: 5,
  },
]

export function getItemBySku(sku: string): ItemDef | undefined {
  return STARTER_ITEMS.find((item) => item.sku === sku)
}

export function getItemsByCategory(category: ItemCategory): ItemDef[] {
  return STARTER_ITEMS.filter((item) => item.category === category)
}

export function addToInventory(inventory: Inventory, sku: string, quantity: number): Inventory {
  const existing = inventory.find((item) => item.sku === sku)
  if (existing) {
    return inventory.map((item) =>
      item.sku === sku ? { ...item, quantity: item.quantity + quantity } : item
    )
  }
  return [...inventory, { sku, quantity }]
}

export function removeFromInventory(inventory: Inventory, sku: string, quantity: number): Inventory | null {
  const existing = inventory.find((item) => item.sku === sku)
  if (!existing || existing.quantity < quantity) {
    return null
  }
  if (existing.quantity === quantity) {
    return inventory.filter((item) => item.sku !== sku)
  }
  return inventory.map((item) =>
    item.sku === sku ? { ...item, quantity: item.quantity - quantity } : item
  )
}

export function getInventoryQuantity(inventory: Inventory, sku: string): number {
  return inventory.find((item) => item.sku === sku)?.quantity ?? 0
}

export const DEFAULT_INVENTORY: Inventory = [
  { sku: 'food_fish_snack', quantity: 3 },
  { sku: 'food_cat_food', quantity: 1 },
  { sku: 'clean_wipes', quantity: 1 },
]
