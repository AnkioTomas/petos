/**
 * 物品使用面板（CORE）
 * redesign.md §4.3 核心独立面板：物品使用（四类）
 */

import type { ItemCategory, Inventory, ItemDef } from '../engine/items'
import { STARTER_ITEMS, CATEGORY_LABELS, getInventoryQuantity } from '../engine/items'

type Props = {
  category: ItemCategory
  inventory: Inventory
  onUseItem: (item: ItemDef) => void
  onClose: () => void
  disabled?: boolean
}

export function ItemPanel({ category, inventory, onUseItem, onClose, disabled }: Props) {
  const items = STARTER_ITEMS.filter((item) => item.category === category)
  
  return (
    <div className="item-panel">
      <div className="item-panel-header">
        <h3>{CATEGORY_LABELS[category]}</h3>
        <button type="button" className="panel-close" onClick={onClose}>
          关闭
        </button>
      </div>
      <div className="item-grid">
        {items.map((item) => {
          const qty = getInventoryQuantity(inventory, item.sku)
          const hasItem = qty > 0
          return (
            <button
              key={item.sku}
              type="button"
              className={`item-card ${!hasItem ? 'empty' : ''}`}
              disabled={disabled || !hasItem}
              onClick={() => onUseItem(item)}
              title={item.description}
            >
              <div className="item-name">{item.name}</div>
              <div className="item-effects">
                {item.effects.hunger && <span>肚子+{item.effects.hunger}</span>}
                {item.effects.cleanliness && <span>毛顺+{item.effects.cleanliness}</span>}
                {item.effects.mood && <span>想玩+{item.effects.mood}</span>}
                {item.effects.energy && <span>安康+{item.effects.energy}</span>}
              </div>
              <div className="item-qty">
                {hasItem ? `×${qty}` : '无'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
