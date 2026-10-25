import type { PackManifestV1, PoseDef } from './schema'
import { isLive2DPack } from './schema'

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

export type MotionFidelity = 'official_live2d' | 'placeholder_live2d' | 'spine' | 'frames' | 'static'

export type FallbackResult = {
  def: PoseDef | null
  visual: FallbackVisual
  usedFallback: boolean
  fidelity: MotionFidelity
  isPlaceholderLive2D: boolean
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
  
  if (isLive2DPack(manifest)) {
    return { def: null, visual: { poseKey: visual.poseKey }, usedFallback: false }
  }
  
  const direct = manifest.poses?.[visual.poseKey]
  if (direct) {
    return { def: direct, visual: { poseKey: visual.poseKey }, usedFallback: false }
  }
  return {
    def: manifest.poses?.idle ?? null,
    visual: { ...visual, poseKey: 'idle' },
    usedFallback: true,
  }
}

const REQUIRED_MOTION_GROUPS = ['idle', 'walk', 'jump', 'hide', 'lift', 'sleep'] as const

export function checkLive2DFidelity(
  manifest: PackManifestV1 | null,
  availableMotions: string[],
): { fidelity: MotionFidelity; isPlaceholder: boolean; missingMotions: string[] } {
  if (!manifest || !isLive2DPack(manifest)) {
    const fidelity = manifest?.meta.fidelity ?? 
      (manifest?.meta.renderer === 'spine' ? 'spine' : 
       manifest?.meta.renderer === 'frames' ? 'frames' : 'static')
    return { 
      fidelity: fidelity as MotionFidelity, 
      isPlaceholder: false, 
      missingMotions: [] 
    }
  }

  const motionsLower = availableMotions.map(m => m.toLowerCase())
  const missing: string[] = []
  
  for (const group of REQUIRED_MOTION_GROUPS) {
    const hasGroup = motionsLower.some(m => 
      m === group || 
      m.includes(group) ||
      (manifest.live2d?.motions?.[group as keyof typeof manifest.live2d.motions]?.length ?? 0) > 0
    )
    if (!hasGroup) {
      missing.push(group)
    }
  }

  const isPlaceholder = missing.length > 0
  
  return {
    fidelity: isPlaceholder ? 'placeholder_live2d' : 'official_live2d',
    isPlaceholder,
    missingMotions: missing,
  }
}

export function getPackFidelityLabel(fidelity: MotionFidelity, isPlaceholder: boolean): string {
  if (isPlaceholder) return '占位活体'
  switch (fidelity) {
    case 'official_live2d': return '官方活体'
    case 'spine': return 'Spine 动态'
    case 'frames': return '帧序列'
    case 'static': return '静态图'
    default: return '未知'
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
