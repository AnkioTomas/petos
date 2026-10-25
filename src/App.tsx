/**
 * PetOS CORE 主应用
 * redesign.md v2.3 · 核心陪伴养成 + 插件架构
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_NEEDS, decayNeeds, isCritical, softCue, CRITICAL_THRESHOLD, clampNeeds, type Needs } from './engine/needs'
import { applyItemUse, isWeak } from './engine/interactions'
import {
  DEFAULT_GROWTH,
  STAGE_LABELS,
  applyGrowthXp,
  type GrowthState,
} from './engine/growth'
import { DEFAULT_WALLET, debit, credit, type Wallet } from './engine/wallet'
import {
  DEFAULT_INVENTORY,
  addToInventory,
  removeFromInventory,
  type Inventory,
  type ItemDef,
  type ItemCategory,
} from './engine/items'
import {
  DEFAULT_OCCUPATION,
  requestOccupation,
  releaseOccupation,
  RECALL_COEFFICIENT,
  type OccupationState,
} from './engine/occupation'
import {
  createIdleState,
  createBehaviorState,
  shouldTriggerBehavior,
  isBehaviorComplete,
  pickRandomBehavior,
  canPerformBehavior,
  mapBehaviorToPose,
  type DeskState,
} from './engine/desk'
import type { LoadedPack } from './pack/schema'
import { isLive2DPack } from './pack/schema'
import { hydratePack } from './pack/loader'
import { pickVoice, checkLive2DFidelity, getPackFidelityLabel } from './pack/fallbacks'
import type { VisualPose } from './pack/fallbacks'
import { PetView, type PetViewHandle } from './ui/PetView'
import { createDeskDirector, type DeskDirector } from './engine/desk-director'
import { StatusHud } from './ui/StatusHud'
import { Footbar, CORE_FOOTBAR_GROUPS, type FootbarGroup } from './ui/Footbar'
import { ItemPanel } from './ui/ItemPanel'
import { ShopPanel } from './ui/ShopPanel'
import { ProfilePanel } from './ui/ProfilePanel'
import { ImportPanel } from './ui/ImportPanel'
import { OutingsPanel } from './plugins/outings/OutingsPanel'
import { DailyQuestsPanel } from './plugins/quests/DailyQuestsPanel'
import { getJobById } from './plugins/outings/jobs'
import type { JobDef } from './plugins/outings/types'
import { generateDailyQuests, getDayKey, updateQuestProgress, type DailyQuest } from './plugins/quests/daily'

type PanelType = 
  | { type: 'none' }
  | { type: 'item'; category: ItemCategory }
  | { type: 'shop' }
  | { type: 'profile' }
  | { type: 'settings' }
  | { type: 'packs' }
  | { type: 'work' }
  | { type: 'study' }
  | { type: 'trip' }
  | { type: 'daily_quests' }

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
  const [occupation, setOccupation] = useState<OccupationState>(DEFAULT_OCCUPATION)
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
  const [isDragging, setIsDragging] = useState(false)
  const [deskState, setDeskState] = useState<DeskState>(createIdleState())
  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>([])
  const [questDayKey, setQuestDayKey] = useState('')
  const [, setLive2DReady] = useState(false)
  const [packFidelityLabel, setPackFidelityLabel] = useState<string | null>(null)
  
  const poseTimer = useRef<number | null>(null)
  const bubbleTimer = useRef<number | null>(null)
  const deskTimer = useRef<number | null>(null)
  const needsRef = useRef(needs)
  const sleepingRef = useRef(sleeping)
  const weakRef = useRef(weak)
  const packRef = useRef(pack)
  const growthRef = useRef(growth)
  const walletRef = useRef(wallet)
  const inventoryRef = useRef(inventory)
  const occupationRef = useRef(occupation)
  const deskStateRef = useRef(deskState)
  const dailyQuestsRef = useRef(dailyQuests)
  const petViewRef = useRef<PetViewHandle>(null)
  const deskDirectorRef = useRef<DeskDirector | null>(null)
  
  needsRef.current = needs
  sleepingRef.current = sleeping
  weakRef.current = weak
  packRef.current = pack
  growthRef.current = growth
  walletRef.current = wallet
  inventoryRef.current = inventory
  occupationRef.current = occupation
  deskStateRef.current = deskState
  dailyQuestsRef.current = dailyQuests

  const isLive2D = pack ? isLive2DPack(pack.manifest) : false

  const handleLive2DReady = useCallback(() => {
    setLive2DReady(true)
    
    const live2dHandle = petViewRef.current?.live2d
    if (live2dHandle && pack) {
      const availableMotions = live2dHandle.getAvailableMotions()
      const { fidelity, isPlaceholder } = checkLive2DFidelity(pack.manifest, availableMotions)
      setPackFidelityLabel(getPackFidelityLabel(fidelity, isPlaceholder))
      
      if (!deskDirectorRef.current) {
        deskDirectorRef.current = createDeskDirector({
          motionMapping: pack.manifest.live2d?.motions,
        })
      }
      
      deskDirectorRef.current.setRenderer({ current: live2dHandle })
      deskDirectorRef.current.startIdlePool()
    }
  }, [pack])

  useEffect(() => {
    return () => {
      deskDirectorRef.current?.dispose()
    }
  }, [])

  const showBubble = useCallback((text: string | null, ms = 2800) => {
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current)
    setBubble(text)
    if (text) {
      bubbleTimer.current = window.setTimeout(() => setBubble(null), ms)
    }
  }, [])

  // Initialize daily quests
  useEffect(() => {
    const today = getDayKey()
    if (today !== questDayKey) {
      setQuestDayKey(today)
      setDailyQuests(generateDailyQuests(today))
    }
  }, [questDayKey])

  // Boot: load persist + pack
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
        if (persist.occupation) {
          setOccupation(persist.occupation)
          occupationRef.current = persist.occupation
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

  // Idle decay loop
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

  // Desk behavior loop
  useEffect(() => {
    if (!ready) return
    const tick = async () => {
      const state = deskStateRef.current
      const director = deskDirectorRef.current
      const canBehave = canPerformBehavior(weakRef.current, sleepingRef.current, occupationRef.current.kind !== null)
      
      if (!canBehave) {
        if (state.behavior !== 'idle' && state.behavior !== 'sleep' && state.behavior !== 'weak') {
          setDeskState(createIdleState())
          if (weakRef.current && director) {
            await director.lockForWeak()
          } else if (sleepingRef.current && director) {
            await director.lockForSleep()
          } else if (occupationRef.current.kind && director) {
            await director.lockForOccupation()
          }
        }
        return
      }
      
      if (state.behavior !== 'idle' && isBehaviorComplete(state)) {
        setDeskState(createIdleState())
        if (director) {
          await director.playBehavior('idle')
        }
        return
      }
      
      if (shouldTriggerBehavior(state)) {
        const behavior = pickRandomBehavior(true, null)
        setDeskState(createBehaviorState(behavior))
        if (director) {
          await director.playBehavior(behavior)
        }
      }
    }
    
    deskTimer.current = window.setInterval(() => void tick(), 500)
    return () => {
      if (deskTimer.current) clearInterval(deskTimer.current)
    }
  }, [ready])

  // Soft cue when low
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

    // Update quest progress
    const newQuests = updateQuestProgress(dailyQuestsRef.current, 'pet_pet', 1)
    setDailyQuests(newQuests)
    dailyQuestsRef.current = newQuests

    const line = pickVoice(packRef.current?.manifest ?? null, 'pet', '呼噜～')
    showBubble(line)
    
    const director = deskDirectorRef.current
    if (director) {
      void director.playInteraction('pet')
    }
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

    // Update quest progress
    const questType = item.category === 'food' ? 'feed_pet' : 
                      item.category === 'clean' ? 'clean_pet' : 
                      item.category === 'toy' ? 'play_pet' : null
    if (questType) {
      const newQuests = updateQuestProgress(dailyQuestsRef.current, questType, 1)
      setDailyQuests(newQuests)
      dailyQuestsRef.current = newQuests
    }

    const line = pickVoice(packRef.current?.manifest ?? null, item.category, result.bubble ?? '')
    showBubble(line || result.bubble || null)
    
    const director = deskDirectorRef.current
    if (director) {
      const motionType = item.category === 'food' ? 'eat' : 
                         item.category === 'toy' ? 'play' : null
      if (motionType) {
        void director.playInteraction(motionType)
      }
    }
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

    // Update quest progress
    const newQuests = updateQuestProgress(dailyQuestsRef.current, 'buy_items', 1)
    setDailyQuests(newQuests)
    dailyQuestsRef.current = newQuests

    showBubble(`买到了 ${item.name}！`)
  }, [showBubble])

  const handleSleep = useCallback(() => {
    const director = deskDirectorRef.current
    if (sleepingRef.current) {
      if (needsRef.current.energy < 30) {
        showBubble('还没休息好……')
        return
      }
      setSleeping(false)
      sleepingRef.current = false
      void window.pet.setSleeping(false)
      showBubble('醒啦')
      if (director) {
        void director.unlock()
      }
      flashPose('idle', 400)
    } else {
      setSleeping(true)
      sleepingRef.current = true
      void window.pet.setSleeping(true)
      showBubble('Zzz……')
      if (director) {
        void director.lockForSleep()
      }
      setPose('sleep')
    }
  }, [flashPose, showBubble])

  const handleStartOuting = useCallback((job: JobDef) => {
    const result = requestOccupation(
      occupationRef.current,
      job.kind,
      job.id,
      job.duration,
      weakRef.current
    )
    if (!result.ok) {
      showBubble(result.reason === 'weak_state' ? '身体虚弱，无法外出' : '正在忙碌中')
      return
    }
    setOccupation(result.state)
    occupationRef.current = result.state
    void window.pet.setOccupation(result.state)
    showBubble(`出发去${job.name}啦！`)
    setActivePanel({ type: 'none' })
  }, [showBubble])

  const handleRecallOuting = useCallback(() => {
    const occ = occupationRef.current
    if (!occ.kind || !occ.jobId) return
    
    const job = getJobById(occ.jobId)
    if (!job) return
    
    const elapsedTime = occ.startedAt ? Date.now() - occ.startedAt : 0
    const isComplete = elapsedTime >= (occ.duration ?? 0)
    const { state: newOcc, coefficient } = releaseOccupation(occ, !isComplete)
    const multiplier = isComplete ? 1.0 : coefficient
    
    // Apply rewards
    const rewards = job.rewards
    if (rewards.gold) {
      const earned = Math.floor(rewards.gold * multiplier)
      const cr = credit(walletRef.current, 'gold', earned)
      if (cr.ok) {
        setWallet(cr.wallet)
        walletRef.current = cr.wallet
        void window.pet.setWallet(cr.wallet)
      }
    }
    
    if (rewards.xp) {
      const earnedXp = Math.floor(rewards.xp * multiplier)
      const g = applyGrowthXp(growthRef.current, earnedXp)
      setGrowth(g.state)
      growthRef.current = g.state
      void window.pet.setGrowth(g.state)
    }
    
    if (rewards.mood) {
      const earnedMood = Math.floor(rewards.mood * multiplier)
      const newNeeds = clampNeeds({
        ...needsRef.current,
        mood: needsRef.current.mood + earnedMood,
      })
      setNeeds(newNeeds)
      needsRef.current = newNeeds
      void window.pet.setNeeds(newNeeds)
    }
    
    setOccupation(newOcc)
    occupationRef.current = newOcc
    void window.pet.setOccupation(newOcc)
    
    const msg = isComplete 
      ? `${job.name}完成！获得 ${rewards.gold ?? 0} 金币` 
      : `提前召回，获得 ${Math.floor((rewards.gold ?? 0) * RECALL_COEFFICIENT)} 金币`
    showBubble(msg)
  }, [showBubble])

  const handleClaimQuest = useCallback((questId: string) => {
    const quest = dailyQuestsRef.current.find(q => q.id === questId)
    if (!quest || quest.claimed || !quest.completed) return
    
    // Give rewards
    const cr = credit(walletRef.current, 'gold', quest.reward.gold)
    if (cr.ok) {
      setWallet(cr.wallet)
      walletRef.current = cr.wallet
      void window.pet.setWallet(cr.wallet)
    }
    
    const g = applyGrowthXp(growthRef.current, quest.reward.xp)
    setGrowth(g.state)
    growthRef.current = g.state
    void window.pet.setGrowth(g.state)
    
    // Mark claimed
    const newQuests = dailyQuestsRef.current.map(q => 
      q.id === questId ? { ...q, claimed: true } : q
    )
    setDailyQuests(newQuests)
    dailyQuestsRef.current = newQuests
    
    showBubble(`领取奖励：${quest.reward.gold} 金币`)
  }, [showBubble])

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
    } else if (groupId === 'interact') {
      if (itemId === 'work') setActivePanel({ type: 'work' })
      else if (itemId === 'study') setActivePanel({ type: 'study' })
      else if (itemId === 'trip') setActivePanel({ type: 'trip' })
    } else if (groupId === 'tools') {
      if (itemId === 'daily_quests') setActivePanel({ type: 'daily_quests' })
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
    {
      id: 'interact',
      label: '交互',
      items: [
        { id: 'work', label: '兼职码头', icon: '⚓' },
        { id: 'study', label: '邻岛学堂', icon: '📚' },
        { id: 'trip', label: '远岛散步', icon: '🏝️' },
      ],
    },
    {
      id: 'tools',
      label: '工具',
      items: [
        { id: 'daily_quests', label: '今日岛课', icon: '📋' },
      ],
    },
  ]

  const deskPose: VisualPose = mapBehaviorToPose(deskState.behavior) as VisualPose
  const effectivePose: VisualPose = sleeping ? 'sleep' : 
                                    weak ? 'weak' :
                                    occupation.kind ? 'idle' :
                                    isDragging ? 'lift' :
                                    pose !== 'idle' ? pose :
                                    deskPose

  const renderActivePanel = () => {
    switch (activePanel.type) {
      case 'item':
        return (
          <ItemPanel
            category={activePanel.category}
            inventory={inventory}
            onUseItem={handleUseItem}
            onClose={() => setActivePanel({ type: 'none' })}
            disabled={sleeping || occupation.kind !== null}
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
            <p className="settings-info">PetOS v2.3 CORE + Plugins</p>
            <p className="settings-info">已启用插件：外出三分、今日岛课</p>
          </div>
        )
      case 'work':
      case 'study':
      case 'trip':
        return (
          <OutingsPanel
            kind={activePanel.type}
            occupation={occupation}
            stage={growth.stage}
            isWeak={weak}
            onStart={handleStartOuting}
            onRecall={handleRecallOuting}
            onClose={() => setActivePanel({ type: 'none' })}
          />
        )
      case 'daily_quests':
        return (
          <DailyQuestsPanel
            quests={dailyQuests}
            onClaim={handleClaimQuest}
            onClose={() => setActivePanel({ type: 'none' })}
          />
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

        {occupation.kind && (
          <div className="empty-nest-note">
            外出中：{occupation.kind === 'work' ? '兼职码头' : occupation.kind === 'study' ? '邻岛学堂' : '远岛散步'}
          </div>
        )}

        <PetView
          ref={petViewRef}
          pack={pack}
          pose={effectivePose}
          stage={growth.stage}
          deskBehavior={isLive2D ? 'idle' : deskState.behavior}
          isDragging={isDragging}
          onPet={handlePet}
          onDragStart={() => {
            setIsDragging(true)
            void deskDirectorRef.current?.handleDragStart()
          }}
          onDragEnd={() => {
            setIsDragging(false)
            void deskDirectorRef.current?.handleDragEnd()
          }}
          onContextMenu={() => void window.pet.showContextMenu()}
          onLive2DReady={handleLive2DReady}
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
              {packFidelityLabel && <span className="fidelity-badge">{packFidelityLabel}</span>}
              {weak && <span className="weak-badge">虚弱</span>}
              {occupation.kind && <span className="outing-badge">外出中</span>}
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
            <button type="button" onClick={handleSleep} disabled={occupation.kind !== null}>
              {sleeping ? '叫醒' : '睡觉'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
