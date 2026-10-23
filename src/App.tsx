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

export default function App() {
  const [needs, setNeeds] = useState<Needs>(DEFAULT_NEEDS)
  const [pack, setPack] = useState<LoadedPack | null>(null)
  const [pose, setPose] = useState<VisualPose>('idle')
  const [sleeping, setSleeping] = useState(false)
  const [bubble, setBubble] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const poseTimer = useRef<number | null>(null)
  const needsRef = useRef(needs)
  const sleepingRef = useRef(sleeping)
  needsRef.current = needs
  sleepingRef.current = sleeping

  // boot: load persist + pack
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const persist = await window.pet.getPersist()
        if (cancelled) return
        setNeeds(persist.needs)
        const { pack: raw, error } = await window.pet.loadActivePack()
        if (cancelled) return
        if (raw) {
          const loaded = await hydratePack(raw.dir, raw.manifest, raw.name)
          if (loaded) setPack(loaded)
          else if (error) setBubble(error)
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

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
        // soft cue: auto suggest sleep, do not force-death
        setBubble((b) => b ?? softCue(next))
      }
    }, 1000)
    return () => clearInterval(id)
  }, [ready])

  // soft cue when low
  useEffect(() => {
    if (!ready) return
    const cue = softCue(needs)
    if (cue && pose === 'idle' && !sleeping) {
      setBubble((prev) => prev ?? cue)
    }
  }, [needs.hunger, needs.mood, needs.energy, ready]) // eslint-disable-line react-hooks/exhaustive-deps

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
      const line = pickVoice(pack?.manifest ?? null, voiceKey, result.bubble ?? '')
      setBubble(line || result.bubble || null)

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
        const poseDef = pack?.manifest.poses?.[visual]
        let ms = 900
        if (poseDef && 'ms' in poseDef && typeof poseDef.ms === 'number') ms = poseDef.ms
        else if (poseDef?.type === 'frames') {
          const fps = poseDef.fps ?? 12
          ms = Math.round(((poseDef.frames?.length ?? 8) / fps) * 1000)
        }
        flashPose(visual, ms)
      }
    },
    [flashPose, pack],
  )

  return (
    <div className="app">
      <header className="titlebar">
        <div className="titlebar-drag">
          <strong>PetOS</strong>
          <span className="sub">我的宠物</span>
        </div>
        <div className="titlebar-btns">
          <button type="button" aria-label="最小化" onClick={() => window.pet.minimize()}>
            –
          </button>
          <button type="button" aria-label="关闭" onClick={() => window.pet.close()}>
            ×
          </button>
        </div>
      </header>

      <main className="main">
        {bubble && (
          <div className="bubble" onClick={() => setBubble(null)}>
            {bubble}
          </div>
        )}

        <PetView pack={pack} pose={sleeping ? 'sleep' : pose} onPet={() => onAction('pet')} />

        <Controls needs={needs} sleeping={sleeping} onAction={onAction} />

        <ImportPanel pack={pack} onPackChange={setPack} />
      </main>
    </div>
  )
}
