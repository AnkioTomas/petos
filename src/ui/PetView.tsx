import { useRef, useCallback, type PointerEvent as ReactPointerEvent } from 'react'
import type { LoadedPack } from '../pack/schema'
import { resolvePoseFallback, type VisualPose } from '../pack/fallbacks'
import { STAGE_SCALE, type StageId } from '../engine/growth'
import { PlaceholderPet } from './PlaceholderPet'
import { PoseRenderer } from '../render/PoseRenderer'
import type { DeskBehavior } from '../engine/desk'

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
}

const DRAG_THRESHOLD = 4

export function PetView({ 
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
}: Props) {
  const effectivePose = isDragging ? 'lift' : pose
  const { def, visual, usedFallback } = resolvePoseFallback(pack?.manifest ?? null, effectivePose)
  const dragRef = useRef<{
    active: boolean
    moved: boolean
    offsetX: number
    offsetY: number
  } | null>(null)

  const animClass = [
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

  const showPlaceholder = !pack || !def
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
            pack={pack}
            poseKey={String(visual.poseKey)}
            def={def}
            visual={visual}
            usedFallback={usedFallback}
            alt={pack.name}
            className="pet-art"
            mousePosition={mousePosition}
          />
        )}
      </div>
    </div>
  )
}
