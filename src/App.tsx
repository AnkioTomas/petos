/**
 * PetOS CORE 主应用
 * redesign.md v2.3 · 核心陪伴养成 + 插件架构
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_NEEDS, decayNeeds, isCritical, softCue, CRITICAL_THRESHOLD, type Needs } from './engine/needs'
import { applyItemUse, isWeak } from './engine/interactions'
import {
  DEFAULT_GROWTH,
  STAGE_LABELS,
  applyGrowthXp,
  type GrowthState,
} from './engine/growth'
import { DEFAULT_WALLET, debit, type Wallet } from './engine/wallet'
import {
  DEFAULT_INVENTORY,
  addToInventory,
  removeFromInventory,
  type Inventory,
  type ItemDef,
  type ItemCategory,
} from './engine/items'
import type { LoadedPack } from './pack/schema'
import { hydratePack } from './pack/loader'
import { pickVoice } from './pack/fallbacks'
import type { VisualPose } from './pack/fallbacks'
import { PetView } from './ui/PetView'
import { StatusHud } from './ui/StatusHud'
import { Footbar, CORE_FOOTBAR_GROUPS, type FootbarGroup } from './ui/Footbar'
import { ItemPanel } from './ui/ItemPanel'
import { ShopPanel } from './ui/ShopPanel'
import { ProfilePanel } from './ui/ProfilePanel'
import { ImportPanel } from './ui/ImportPanel'

type PanelType = 
  | { type: 'none' }
  | { type: 'item'; category: ItemCategory }
  | { type: 'shop' }
  | { type: 'profile' }
  | { type: 'settings' }
  | { type: 'packs' }

async function applyImportResult(
  result: { ok?: boolean; cancelled?: boolean; error?: string; pack?: { dir: string; manifest: unknown; name: string } },
  onPack: (p: LoadedPack | null) => void,
  onBubble: (s: string | null) => void,
) {
  if (result.cancelled) return
  if (!result.ok || !result.pack) {
    onBubble(result.error || '导入失败')
    return
  }
  const loaded = await hydratePack(result.pack.dir, result.pack.manifest, result.pack.name)
  if (!loaded) {
    onBubble('素材包无效：无法加载 idle')
    return
  }
  onPack(loaded)
  onBubble(`已换上：${loaded.name}`)
}

export default function App() {
  const [needs, setNeeds] = useState<Needs>(DEFAULT_NEEDS)
  const [growth, setGrowth] = useState<GrowthState>(DEFAULT_GROWTH)
  const [wallet, setWallet] = useState<Wallet>(DEFAULT_WALLET)
  const [inventory, setInventory] = useState<Inventory>(DEFAULT_INVENTORY)
  const [pack, setPack] = useState<LoadedPack | null>(null)
  const [pose, setPose] = useState<VisualPose>('idle')
  const [sleeping, setSleeping] = useState(false)
  const [weak, setWeak] = useState(false)
  const [bubble, setBubble] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [hudPinned, setHudPinned] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<PanelType>({ type: 'none' })
  
  const poseTimer = useRef<number | null>(null)
  const bubbleTimer = useRef<number | null>(null)
  const needsRef = useRef(needs)
  const sleepingRef = useRef(sleeping)
  const weakRef = useRef(weak)
  const packRef = useRef(pack)
  const growthRef = useRef(growth)
  const walletRef = useRef(wallet)
  const inventoryRef = useRef(inventory)
  
  needsRef.current = needs
  sleepingRef.current = sleeping
  weakRef.current = weak
  packRef.current = pack
  growthRef.current = growth
  walletRef.current = wallet
  inventoryRef.current = inventory

  const showBubble = useCallback((text: string | null, ms = 2800) => {
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current)
    setBubble(text)
    if (text) {
      bubbleTimer.current = window.setTimeout(() => setBubble(null), ms)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const persist = await window.pet.getPersist()
        if (cancelled) return
        setNeeds(persist.needs)
        if (persist.growth) {
          setGrowth(persist.growth)
          growthRef.current = persist.growth
        }
        if (persist.wallet) {
          setWallet(persist.wallet)
          walletRef.current = persist.wallet
        }
        if (persist.inventory) {
          setInventory(persist.inventory)
          inventoryRef.current = persist.inventory
        }
        const open = await window.pet.getPanelOpen()
        if (!cancelled) setPanelOpen(open)
        const { pack: raw, error } = await window.pet.loadActivePack()
        if (cancelled) return
        if (raw) {
          const loaded = await hydratePack(raw.dir, raw.manifest, raw.name)
          if (loaded) setPack(loaded)
          else if (error) showBubble(error)
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showBubble])

  useEffect(() => {
    if (!ready) return
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      const dt = (now - last) / 1000
      last = now
      const next = decayNeeds(needsRef.current, dt, sleepingRef.current)
      needsRef.current = next
      setNeeds(next)
      void window.pet.setNeeds(next)

      const nowWeak = isWeak(next)
      if (nowWeak !== weakRef.current) {
        setWeak(nowWeak)
        weakRef.current = nowWeak
        if (nowWeak && !sleepingRef.current) {
          showBubble('身体不舒服……需要休息')
          setSleeping(true)
          sleepingRef.current = true
          void window.pet.setSleeping(true)
        }
      }

      if (!sleepingRef.current && isCritical(next) && next.energy <= CRITICAL_THRESHOLD) {
        showBubble(softCue(next))
      }
    }, 1000)
    return () => clearInterval(id)
  }, [ready, showBubble])

  useEffect(() => {
    if (!ready) return
    const cue = softCue(needs)
    if (cue && pose === 'idle' && !sleeping) {
      setBubble((prev) => {
        if (prev) return prev
        if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current)
        bubbleTimer.current = window.setTimeout(() => setBubble(null), 2800)
        return cue
      })
    }
  }, [needs.hunger, needs.mood, needs.energy, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void window.pet.setSleeping(sleeping)
  }, [sleeping])

  const flashPose = useCallback((next: VisualPose, ms = 900) => {
    if (poseTimer.current) window.clearTimeout(poseTimer.current)
    setPose(next)
    if (next !== 'sleep') {
      poseTimer.current = window.setTimeout(() => {
        setPose(sleepingRef.current ? 'sleep' : 'idle')
      }, ms)
    }
  }, [])

  const handlePet = useCallback(() => {
    if (sleepingRef.current) return
    const next = {
      ...needsRef.current,
      mood: Math.min(100, needsRef.current.mood + 12),
      energy: Math.max(0, needsRef.current.energy - 1),
    }
    setNeeds(next)
    needsRef.current = next
    void window.pet.setNeeds(next)

    const g = applyGrowthXp(growthRef.current, 2)
    setGrowth(g.state)
    growthRef.current = g.state
    void window.pet.setGrowth(g.state)
    if (g.stageChanged && g.to) {
      showBubble(`长大啦 · ${STAGE_LABELS[g.to]}`)
    }

    const line = pickVoice(packRef.current?.manifest ?? null, 'pet', '呼噜～')
    showBubble(line)
    flashPose('pet', 900)
  }, [flashPose, showBubble])

  const handleUseItem = useCallback((item: ItemDef) => {
    const inv = removeFromInventory(inventoryRef.current, item.sku, 1)
    if (!inv) {
      showBubble('没有这个物品了')
      return
    }
    setInventory(inv)
    inventoryRef.current = inv
    void window.pet.setInventory(inv)

    const result = applyItemUse(needsRef.current, item)
    setNeeds(result.needs)
    needsRef.current = result.needs
    void window.pet.setNeeds(result.needs)

    if (result.xpGained) {
      const g = applyGrowthXp(growthRef.current, result.xpGained)
      setGrowth(g.state)
      growthRef.current = g.state
      void window.pet.setGrowth(g.state)
      if (g.stageChanged && g.to) {
        showBubble(`长大啦 · ${STAGE_LABELS[g.to]}`)
        return
      }
    }

    const line = pickVoice(packRef.current?.manifest ?? null, item.category, result.bubble ?? '')
    showBubble(line || result.bubble || null)
    flashPose(result.pose, 900)
  }, [flashPose, showBubble])

  const handleBuyItem = useCallback((item: ItemDef) => {
    const result = debit(walletRef.current, item.price.currency, item.price.amount)
    if (!result.ok) {
      showBubble('金币不够啦')
      return
    }
    setWallet(result.wallet)
    walletRef.current = result.wallet
    void window.pet.setWallet(result.wallet)

    const inv = addToInventory(inventoryRef.current, item.sku, 1)
    setInventory(inv)
    inventoryRef.current = inv
    void window.pet.setInventory(inv)

    showBubble(`买到了 ${item.name}！`)
  }, [showBubble])

  const handleSleep = useCallback(() => {
    if (sleepingRef.current) {
      if (needsRef.current.energy < 30) {
        showBubble('还没休息好……')
        return
      }
      setSleeping(false)
      sleepingRef.current = false
      void window.pet.setSleeping(false)
      showBubble('醒啦')
      flashPose('idle', 400)
    } else {
      setSleeping(true)
      sleepingRef.current = true
      void window.pet.setSleeping(true)
      showBubble('Zzz……')
      setPose('sleep')
    }
  }, [flashPose, showBubble])

  const handleFootbarClick = useCallback((groupId: string, itemId: string) => {
    if (groupId === 'daily') {
      const category = itemId as ItemCategory
      setActivePanel({ type: 'item', category })
    } else if (groupId === 'profile' && itemId === 'profile') {
      setActivePanel({ type: 'profile' })
    } else if (groupId === 'settings') {
      if (itemId === 'packs') {
        setActivePanel({ type: 'packs' })
      } else {
        setActivePanel({ type: 'settings' })
      }
    }
  }, [])

  const togglePanel = useCallback(async () => {
    const next = !panelOpen
    const applied = await window.pet.setPanelOpen(next)
    setPanelOpen(applied)
    if (!applied) {
      setActivePanel({ type: 'none' })
    }
  }, [panelOpen])

  useEffect(() => {
    return window.pet.onMenuAction((action) => {
      void (async () => {
        switch (action) {
          case 'pet':
            handlePet()
            break
          case 'sleep':
            handleSleep()
            break
          case 'wake':
            if (sleepingRef.current) handleSleep()
            break
          case 'import-zip': {
            const r = await window.pet.choosePackZip()
            await applyImportResult(r as Parameters<typeof applyImportResult>[0], setPack, showBubble)
            break
          }
          case 'import-folder': {
            const r = await window.pet.choosePackFolder()
            await applyImportResult(r as Parameters<typeof applyImportResult>[0], setPack, showBubble)
            break
          }
          case 'import-blank': {
            const r = await window.pet.importBlankTemplate()
            await applyImportResult(r as Parameters<typeof applyImportResult>[0], setPack, showBubble)
            break
          }
          case 'toggle-panel':
            await togglePanel()
            break
          case 'show-status':
            setHudPinned((v) => !v)
            break
          case 'shop':
            setActivePanel({ type: 'shop' })
            if (!panelOpen) await togglePanel()
            break
          default:
            break
        }
      })()
    })
  }, [handlePet, handleSleep, showBubble, togglePanel, panelOpen])

  const footbarGroups: FootbarGroup[] = [
    ...CORE_FOOTBAR_GROUPS,
    {
      id: 'shop',
      label: '商店',
      items: [{ id: 'shop', label: '照料小铺', icon: '🏪' }],
    },
  ]

  const renderActivePanel = () => {
    switch (activePanel.type) {
      case 'item':
        return (
          <ItemPanel
            category={activePanel.category}
            inventory={inventory}
            onUseItem={handleUseItem}
            onClose={() => setActivePanel({ type: 'none' })}
            disabled={sleeping}
          />
        )
      case 'shop':
        return (
          <ShopPanel
            wallet={wallet}
            onBuyItem={handleBuyItem}
            onClose={() => setActivePanel({ type: 'none' })}
          />
        )
      case 'profile':
        return (
          <ProfilePanel
            needs={needs}
            growth={growth}
            wallet={wallet}
            onClose={() => setActivePanel({ type: 'none' })}
          />
        )
      case 'packs':
        return <ImportPanel pack={pack} onPackChange={setPack} />
      case 'settings':
        return (
          <div className="settings-panel">
            <div className="settings-header">
              <h3>设置</h3>
              <button type="button" className="panel-close" onClick={() => setActivePanel({ type: 'none' })}>
                关闭
              </button>
            </div>
            <p className="settings-info">PetOS v2.3 CORE</p>
            <p className="settings-info">插件管理功能将在后续版本中提供</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div
      className={`desktop-pet ${panelOpen ? 'panel-open' : ''}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="pet-layer">
        {bubble && (
          <div className="bubble" onClick={() => showBubble(null)}>
            {bubble}
          </div>
        )}

        <PetView
          pack={pack}
          pose={sleeping ? 'sleep' : pose}
          stage={growth.stage}
          onPet={handlePet}
          onContextMenu={() => void window.pet.showContextMenu()}
        />

        {(hovering || hudPinned) && (
          <StatusHud needs={needs} growth={growth} pinned={hudPinned} />
        )}
      </div>

      {panelOpen && (
        <div className="panel-layer">
          <div className="panel-header">
            <strong>PetOS</strong>
            <span className="sub">
              {pack?.name ?? '糯糯'} · {STAGE_LABELS[growth.stage]}
              {weak && <span className="weak-badge">虚弱</span>}
            </span>
            <button type="button" className="panel-close" onClick={() => void togglePanel()}>
              收起
            </button>
          </div>
          
          <Footbar
            groups={footbarGroups}
            onItemClick={(gId, iId) => {
              if (gId === 'shop' && iId === 'shop') {
                setActivePanel({ type: 'shop' })
              } else {
                handleFootbarClick(gId, iId)
              }
            }}
          />
          
          <div className="panel-content">
            {renderActivePanel()}
          </div>
          
          <div className="panel-actions">
            <button type="button" onClick={handleSleep}>
              {sleeping ? '叫醒' : '睡觉'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
