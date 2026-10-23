import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_NEEDS, decayNeeds, isCritical, softCue, type Needs } from './engine/needs'
import { applyAction, type ActionId } from './engine/interactions'
import type { LoadedPack } from './pack/schema'
import { hydratePack } from './pack/loader'
import { pickVoice } from './pack/fallbacks'
import type { VisualPose } from './pack/fallbacks'
import { PetView } from './ui/PetView'
import { Controls } from './ui/Controls'
import { ImportPanel } from './ui/ImportPanel'
import { StatusHud } from './ui/StatusHud'

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
  const [pack, setPack] = useState<LoadedPack | null>(null)
  const [pose, setPose] = useState<VisualPose>('idle')
  const [sleeping, setSleeping] = useState(false)
  const [bubble, setBubble] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [hudPinned, setHudPinned] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const poseTimer = useRef<number | null>(null)
  const bubbleTimer = useRef<number | null>(null)
  const needsRef = useRef(needs)
  const sleepingRef = useRef(sleeping)
  const packRef = useRef(pack)
  needsRef.current = needs
  sleepingRef.current = sleeping
  packRef.current = pack

  const showBubble = useCallback((text: string | null, ms = 2800) => {
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current)
    setBubble(text)
    if (text) {
      bubbleTimer.current = window.setTimeout(() => setBubble(null), ms)
    }
  }, [])

  // boot: load persist + pack
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const persist = await window.pet.getPersist()
        if (cancelled) return
        setNeeds(persist.needs)
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

  // idle decay loop
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

      if (!sleepingRef.current && isCritical(next) && next.energy <= 15) {
        showBubble(softCue(next))
      }
    }, 1000)
    return () => clearInterval(id)
  }, [ready, showBubble])

  // soft cue when low (don't stomp an existing bubble)
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

  const onAction = useCallback(
    (action: ActionId) => {
      const currentPack = packRef.current
      const result = applyAction(needsRef.current, action, sleepingRef.current)
      setNeeds(result.needs)
      needsRef.current = result.needs
      void window.pet.setNeeds(result.needs)

      if (typeof result.sleeping === 'boolean') {
        setSleeping(result.sleeping)
        sleepingRef.current = result.sleeping
      }

      const voiceKey =
        action === 'pet' ? 'pet' : action === 'feed' ? 'feed' : action === 'sleep' ? 'sleep' : 'play'
      const line = pickVoice(currentPack?.manifest ?? null, voiceKey, result.bubble ?? '')
      showBubble(line || result.bubble || null)

      const visual: VisualPose =
        result.pose === 'eat'
          ? 'eat'
          : result.pose === 'pet'
            ? 'pet'
            : result.pose === 'sleep'
              ? 'sleep'
              : result.pose === 'play'
                ? 'play'
                : 'idle'

      if (result.sleeping) {
        if (poseTimer.current) window.clearTimeout(poseTimer.current)
        setPose('sleep')
      } else if (action === 'sleep') {
        flashPose('idle', 400)
      } else {
        const poseDef = currentPack?.manifest.poses?.[visual]
        let ms = 900
        if (poseDef && 'ms' in poseDef && typeof poseDef.ms === 'number') ms = poseDef.ms
        else if (poseDef?.type === 'frames') {
          const fps = poseDef.fps ?? 12
          ms = Math.round(((poseDef.frames?.length ?? 8) / fps) * 1000)
        }
        flashPose(visual, ms)
      }
    },
    [flashPose, showBubble],
  )

  const togglePanel = useCallback(async () => {
    const next = !panelOpen
    const applied = await window.pet.setPanelOpen(next)
    setPanelOpen(applied)
  }, [panelOpen])

  // native menu / tray actions
  useEffect(() => {
    return window.pet.onMenuAction((action) => {
      void (async () => {
        switch (action) {
          case 'pet':
          case 'feed':
          case 'play':
            onAction(action)
            break
          case 'sleep':
            if (!sleepingRef.current) onAction('sleep')
            break
          case 'wake':
            if (sleepingRef.current) onAction('sleep')
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
          default:
            break
        }
      })()
    })
  }, [onAction, showBubble, togglePanel])

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
          onPet={() => onAction('pet')}
          onContextMenu={() => void window.pet.showContextMenu()}
        />

        {(hovering || hudPinned) && <StatusHud needs={needs} pinned={hudPinned} />}
      </div>

      {panelOpen && (
        <div className="panel-layer">
          <div className="panel-header">
            <strong>PetOS</strong>
            <span className="sub">{pack?.name ?? '我的宠物'}</span>
            <button type="button" className="panel-close" onClick={() => void togglePanel()}>
              收起
            </button>
          </div>
          <Controls needs={needs} sleeping={sleeping} onAction={onAction} />
          <ImportPanel pack={pack} onPackChange={setPack} />
        </div>
      )}
    </div>
  )
}
