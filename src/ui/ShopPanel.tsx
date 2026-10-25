/**
 * 照料小铺面板（CORE 起步货架）
 * redesign.md §4.3 核心独立面板：照料小铺（起步 SKU）
 */

import type { Wallet } from '../engine/wallet'
import { CURRENCY_LABELS, canAfford } from '../engine/wallet'
import type { ItemCategory, ItemDef } from '../engine/items'
import { STARTER_ITEMS, CATEGORY_LABELS } from '../engine/items'

type Props = {
  wallet: Wallet
  onBuyItem: (item: ItemDef) => void
  onClose: () => void
}

const CATEGORIES: ItemCategory[] = ['food', 'clean', 'med', 'toy']

export function ShopPanel({ wallet, onBuyItem, onClose }: Props) {
  return (
    <div className="shop-panel">
      <div className="shop-panel-header">
        <h3>照料小铺</h3>
        <div className="wallet-display">
          <span className="wallet-item gold">
            {CURRENCY_LABELS.gold} {wallet.gold}
          </span>
          <span className="wallet-item diamond">
            {CURRENCY_LABELS.diamond} {wallet.diamond}
          </span>
          <span className="wallet-item tide">
            {CURRENCY_LABELS.tide} {wallet.tide}
          </span>
        </div>
        <button type="button" className="panel-close" onClick={onClose}>
          关闭
        </button>
      </div>
      
      {CATEGORIES.map((cat) => {
        const items = STARTER_ITEMS.filter((item) => item.category === cat)
        return (
          <div key={cat} className="shop-category">
            <h4>{CATEGORY_LABELS[cat]}</h4>
            <div className="shop-grid">
              {items.map((item) => {
                const affordable = canAfford(wallet, item.price.currency, item.price.amount)
                return (
                  <button
                    key={item.sku}
                    type="button"
                    className={`shop-item ${!affordable ? 'expensive' : ''}`}
                    disabled={!affordable}
                    onClick={() => onBuyItem(item)}
                    title={item.description}
                  >
                    <div className="shop-item-name">{item.name}</div>
                    <div className="shop-item-effects">
                      {item.effects.hunger && <span>肚子+{item.effects.hunger}</span>}
                      {item.effects.cleanliness && <span>毛顺+{item.effects.cleanliness}</span>}
                      {item.effects.mood && <span>想玩+{item.effects.mood}</span>}
                      {item.effects.energy && <span>安康+{item.effects.energy}</span>}
                    </div>
                    <div className="shop-item-price">
                      {CURRENCY_LABELS[item.price.currency]} {item.price.amount}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
