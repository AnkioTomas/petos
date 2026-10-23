import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { LoadedPack } from '../pack/schema'
import { resolvePoseFallback, type VisualPose } from '../pack/fallbacks'
import { PlaceholderPet } from './PlaceholderPet'
import { PoseRenderer } from '../render/PoseRenderer'

type Props = {
  pack: LoadedPack | null
  pose: VisualPose
  onPet: () => void
  onContextMenu?: () => void
}

const DRAG_THRESHOLD = 4

export function PetView({ pack, pose, onPet, onContextMenu }: Props) {
  const { def, visual, usedFallback } = resolvePoseFallback(pack?.manifest ?? null, pose)
  const dragRef = useRef<{
    active: boolean
    moved: boolean
    offsetX: number
    offsetY: number
  } | null>(null)

  const animClass = [
    visual.bounce ? 'pet-bounce' : '',
    visual.dim ? 'pet-dim' : '',
    pose === 'sleep' ? 'pet-sleep' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const showPlaceholder = !pack || !def

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    dragRef.current = {
      active: true,
      moved: false,
      offsetX: e.clientX,
      offsetY: e.clientY,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d?.active) return
    const dx = e.clientX - d.offsetX
    const dy = e.clientY - d.offsetY
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    d.moved = true
    window.pet.moveWindowOffset(d.offsetX, d.offsetY)
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    dragRef.current = null
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    if (!d) return
    if (!d.moved) onPet()
  }

  return (
    <div
      className={`pet-stage ${animClass}`}
      title="左键摸摸 · 拖动移动 · 右键菜单"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragRef.current = null
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu?.()
      }}
    >
      {showPlaceholder ? (
        <PlaceholderPet pose={pose} dim={visual.dim} bounce={visual.bounce} />
      ) : (
        <PoseRenderer
          pack={pack}
          poseKey={String(visual.poseKey)}
          def={def}
          visual={visual}
          usedFallback={usedFallback}
          alt={pack.name}
          className="pet-art"
        />
      )}
    </div>
  )
}
