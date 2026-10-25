import { useRef, useCallback, forwardRef, useImperativeHandle, type PointerEvent as ReactPointerEvent } from 'react'
import type { LoadedPack } from '../pack/schema'
import { isLive2DPack } from '../pack/schema'
import { resolvePoseFallback, type VisualPose } from '../pack/fallbacks'
import { STAGE_SCALE, type StageId } from '../engine/growth'
import { PlaceholderPet } from './PlaceholderPet'
import { PoseRenderer, type PoseRendererHandle } from '../render/PoseRenderer'
import type { DeskBehavior } from '../engine/desk'
import type { Live2DPoseRendererHandle, MotionGroup } from '../render/Live2DPoseRenderer'

export interface PetViewHandle {
  live2d: Live2DPoseRendererHandle | null
  isLive2D: boolean
}

type Props = {
  pack: LoadedPack | null
  pose: VisualPose
  stage?: StageId
  deskBehavior?: DeskBehavior
  isDragging?: boolean
  onPet: () => void
  onDragStart?: () => void
  onDragEnd?: () => void
  onContextMenu?: () => void
  mousePosition?: { x: number; y: number } | null
  initialMotion?: MotionGroup
  onLive2DReady?: () => void
}

const DRAG_THRESHOLD = 4

type AnimClassParams = {
  visual: { bounce?: boolean; dim?: boolean }
  effectivePose: VisualPose
  isDragging: boolean
  deskBehavior: DeskBehavior
  isLive2D: boolean
}

function buildAnimClass({ visual, effectivePose, isDragging, deskBehavior, isLive2D }: AnimClassParams): string {
  if (isLive2D) {
    return [
      visual.dim ? 'pet-dim' : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  return [
    visual.bounce ? 'pet-bounce' : '',
    visual.dim ? 'pet-dim' : '',
    effectivePose === 'sleep' ? 'pet-sleep' : '',
    effectivePose === 'weak' ? 'pet-weak' : '',
    isDragging ? 'pet-lift' : '',
    deskBehavior === 'walk_left' ? 'pet-walk-left' : '',
    deskBehavior === 'walk_right' ? 'pet-walk-right' : '',
    deskBehavior === 'jump' ? 'pet-jumping' : '',
    deskBehavior === 'edge_hide_left' ? 'pet-hide-left' : '',
    deskBehavior === 'edge_hide_right' ? 'pet-hide-right' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export const PetView = forwardRef<PetViewHandle, Props>(function PetView(
  { 
    pack, 
    pose, 
    stage = 'adult', 
    deskBehavior = 'idle',
    isDragging = false,
    onPet, 
    onDragStart,
    onDragEnd,
    onContextMenu,
    mousePosition,
    initialMotion,
    onLive2DReady,
  },
  ref
) {
  const effectivePose = isDragging ? 'lift' : pose
  const { def, visual, usedFallback } = resolvePoseFallback(pack?.manifest ?? null, effectivePose)
  const poseRendererRef = useRef<PoseRendererHandle>(null)
  const dragRef = useRef<{
    active: boolean
    moved: boolean
    offsetX: number
    offsetY: number
  } | null>(null)

  const isLive2D = pack ? isLive2DPack(pack.manifest) : false

  useImperativeHandle(ref, () => ({
    get live2d() {
      return poseRendererRef.current?.live2d ?? null
    },
    isLive2D,
  }), [isLive2D])

  const animClass = buildAnimClass({
    visual,
    effectivePose,
    isDragging,
    deskBehavior,
    isLive2D,
  })

  const showPlaceholder = !pack || (!def && !isLive2D)
  const scale = STAGE_SCALE[stage] ?? 1

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    dragRef.current = {
      active: true,
      moved: false,
      offsetX: e.clientX,
      offsetY: e.clientY,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d?.active) return
    const dx = e.clientX - d.offsetX
    const dy = e.clientY - d.offsetY
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    if (!d.moved) {
      d.moved = true
      onDragStart?.()
    }
    window.pet.moveWindowOffset(d.offsetX, d.offsetY)
  }, [onDragStart])

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    dragRef.current = null
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    if (!d) return
    if (d.moved) {
      onDragEnd?.()
    } else {
      onPet()
    }
  }, [onPet, onDragEnd])

  return (
    <div
      className={`pet-stage ${animClass}`}
      title="左键摸摸 · 拖动移动 · 右键菜单"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragRef.current = null
        onDragEnd?.()
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu?.()
      }}
    >
      <div className="pet-scale" style={{ transform: `scale(${scale})` }}>
        {showPlaceholder ? (
          <PlaceholderPet 
            pose={effectivePose} 
            dim={visual.dim} 
            bounce={visual.bounce} 
            deskBehavior={deskBehavior}
          />
        ) : (
          <PoseRenderer
            ref={poseRendererRef}
            pack={pack}
            poseKey={String(visual.poseKey)}
            def={def}
            visual={visual}
            usedFallback={usedFallback}
            alt={pack.name}
            className="pet-art"
            mousePosition={mousePosition}
            initialMotion={initialMotion}
            onLive2DReady={onLive2DReady}
          />
        )}
      </div>
    </div>
  )
})
