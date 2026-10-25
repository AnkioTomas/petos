import type { PackManifestV1, PoseDef } from './schema'

export type VisualPose = 
  | 'idle' 
  | 'pet' 
  | 'eat' 
  | 'sleep' 
  | 'sad' 
  | 'hunger' 
  | 'play' 
  | 'clean'
  | 'walk'
  | 'jump'
  | 'hide'
  | 'lift'
  | 'weak'

export type FallbackVisual = {
  poseKey: keyof PackManifestV1['poses']
  bounce?: boolean
  dim?: boolean
  tint?: string
}

const TABLE: Record<VisualPose, FallbackVisual> = {
  idle: { poseKey: 'idle' },
  pet: { poseKey: 'pet', bounce: true },
  eat: { poseKey: 'eat', bounce: true },
  sleep: { poseKey: 'sleep', dim: true },
  sad: { poseKey: 'sad', dim: true, tint: 'rgba(100,120,180,0.25)' },
  hunger: { poseKey: 'hunger', bounce: true, tint: 'rgba(255,180,80,0.2)' },
  play: { poseKey: 'play', bounce: true },
  clean: { poseKey: 'pet', bounce: true },
  walk: { poseKey: 'walk' },
  jump: { poseKey: 'jump', bounce: true },
  hide: { poseKey: 'hide' },
  lift: { poseKey: 'lift' },
  weak: { poseKey: 'weak', dim: true },
}

export function resolvePoseFallback(
  manifest: PackManifestV1 | null,
  want: VisualPose,
): { def: PoseDef | null; visual: FallbackVisual; usedFallback: boolean } {
  const visual = TABLE[want]
  if (!manifest) {
    return { def: null, visual, usedFallback: true }
  }
  const direct = manifest.poses[visual.poseKey]
  if (direct) {
    return { def: direct, visual: { poseKey: visual.poseKey }, usedFallback: false }
  }
  return {
    def: manifest.poses.idle,
    visual: { ...visual, poseKey: 'idle' },
    usedFallback: true,
  }
}

export function pickVoice(
  manifest: PackManifestV1 | null,
  key: string,
  fallback: string,
): string {
  if (!manifest?.voice) return fallback
  const lines = (manifest.voice as Record<string, string[] | undefined>)[key]
  if (Array.isArray(lines) && lines.length > 0) {
    return lines[Math.floor(Math.random() * lines.length)] ?? fallback
  }
  return fallback
}
