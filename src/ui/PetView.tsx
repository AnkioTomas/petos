import type { LoadedPack } from '../pack/schema'
import { resolvePoseFallback, type VisualPose } from '../pack/fallbacks'
import { PlaceholderPet } from './PlaceholderPet'
import { PoseRenderer } from '../render/PoseRenderer'

type Props = {
  pack: LoadedPack | null
  pose: VisualPose
  onPet: () => void
}

export function PetView({ pack, pose, onPet }: Props) {
  const { def, visual, usedFallback } = resolvePoseFallback(pack?.manifest ?? null, pose)

  const animClass = [
    visual.bounce ? 'pet-bounce' : '',
    visual.dim ? 'pet-dim' : '',
    pose === 'sleep' ? 'pet-sleep' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const showPlaceholder = !pack || !def

  return (
    <div className={`pet-stage ${animClass}`} onClick={onPet} title="点击摸摸">
      {showPlaceholder ? (
        <PlaceholderPet pose={pose} dim={visual.dim} bounce={visual.bounce} onPet={onPet} />
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
