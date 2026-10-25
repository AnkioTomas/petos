/**
 * 脚下条宿主（CORE）
 * redesign.md §4.2 脚下条：核心组 vs 插件组
 * 
 * 核心组：日常、档案、设置
 * 插件组（槽位）：交互、工具、活动、装扮
 * 
 * MUST: 未装插件的槽不渲染空组（藏组，非灰「即将到来」）
 */

import { useState } from 'react'

export type FootbarItem = {
  id: string
  label: string
  icon?: string
  disabled?: boolean
  onClick?: () => void
}

export type FootbarGroup = {
  id: string
  label: string
  items: FootbarItem[]
}

type Props = {
  groups: FootbarGroup[]
  onItemClick: (groupId: string, itemId: string) => void
}

export function Footbar({ groups, onItemClick }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  
  const visibleGroups = groups.filter((g) => g.items.length > 0)
  
  return (
    <div className="footbar">
      {visibleGroups.map((group) => (
        <div key={group.id} className="footbar-group">
          <button
            type="button"
            className={`footbar-group-btn ${expanded === group.id ? 'active' : ''}`}
            onClick={() => setExpanded(expanded === group.id ? null : group.id)}
          >
            {group.label}
          </button>
          {expanded === group.id && (
            <div className="footbar-dropdown">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="footbar-item"
                  disabled={item.disabled}
                  onClick={() => {
                    onItemClick(group.id, item.id)
                    setExpanded(null)
                  }}
                >
                  {item.icon && <span className="footbar-icon">{item.icon}</span>}
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export const CORE_FOOTBAR_GROUPS: FootbarGroup[] = [
  {
    id: 'daily',
    label: '日常',
    items: [
      { id: 'food', label: '食物', icon: '🍖' },
      { id: 'clean', label: '清洁', icon: '🧹' },
      { id: 'med', label: '药品', icon: '💊' },
      { id: 'toy', label: '玩具', icon: '🎾' },
    ],
  },
  {
    id: 'profile',
    label: '档案',
    items: [
      { id: 'profile', label: '糯糯档案', icon: '📋' },
    ],
  },
  {
    id: 'settings',
    label: '设置',
    items: [
      { id: 'settings', label: '设置', icon: '⚙️' },
      { id: 'packs', label: '素材包', icon: '📦' },
    ],
  },
]
