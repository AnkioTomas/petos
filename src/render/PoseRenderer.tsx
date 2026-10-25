import { useMemo, useState } from 'react'
import type { LoadedPack } from '../pack/schema'
import { getPoseType, type PoseDef } from '../pack/schema'
import { frameUrlsFor } from '../pack/loader'
import type { FallbackVisual } from '../pack/fallbacks'
import { FrameSequencePlayer } from './FrameSequencePlayer'
import { SpinePoseRenderer } from './SpinePoseRenderer'

type Props = {
  pack: LoadedPack
  poseKey: string
  def: PoseDef
  visual: FallbackVisual
  usedFallback: boolean
  alt: string
  className?: string
  mousePosition?: { x: number; y: number } | null
}

/**
 * 统一姿态渲染：frames → 序列播放；image/webp → <img>（浏览器播动画 WebP）；
 * spine → SpinePoseRenderer；失败层层回退到静图 + CSS 缓动。
 * Live2D 路径预留（需 Cubism SDK）。
 */
export function PoseRenderer({ pack, poseKey, def, visual, usedFallback: _usedFallback, alt, className, mousePosition: _mousePosition }: Props) {
  const [mode, setMode] = useState<'native' | 'image-fallback'>('native')
  const type = getPoseType(def)

  const singleUrl = pack.assetUrls[`${poseKey}::src`] ?? pack.assetUrls['idle::src'] ?? null

  const frames = useMemo(() => {
    if (def.type !== 'frames') return [] as string[]
    return frameUrlsFor(pack, poseKey, def.frames)
  }, [pack, poseKey, def])

  const idleFrames = useMemo(() => {
    const idle = pack.manifest.poses.idle
    if (idle.type === 'frames') return frameUrlsFor(pack, 'idle', idle.frames)
    return [] as string[]
  }, [pack])

  // Spine path
  if (type === 'spine' && def.type === 'spine' && mode === 'native') {
    const sk = pack.assetUrls[`${poseKey}::skeleton`]
    const atlas = pack.assetUrls[`${poseKey}::atlas`]
    if (sk && atlas) {
      return (
        <div className="pet-art-wrap">
          <SpinePoseRenderer
            skeletonUrl={sk}
            atlasUrl={atlas}
            textureUrl={pack.assetUrls[`${poseKey}::texture`]}
            animation={def.animation ?? poseKey}
            loop={def.loop ?? (poseKey === 'idle' || poseKey === 'sleep')}
            skin={def.skin}
            className={className}
            onFallback={() => setMode('image-fallback')}
          />
        </div>
      )
    }
  }

  // Frames path (M1 dynamic minimum)
  if (type === 'frames' && frames.length > 0 && mode === 'native') {
    return (
      <div className="pet-art-wrap">
        <FrameSequencePlayer
          frames={frames}
          fps={def.type === 'frames' ? def.fps ?? 12 : 12}
          loop={def.type === 'frames' ? def.loop ?? true : true}
          className={className}
          alt={alt}
          onError={() => setMode('image-fallback')}
        />
        {visual.tint && <div className="pet-tint" style={{ background: visual.tint }} aria-hidden />}
      </div>
    )
  }

  // Fallback frames from idle if spine/image failed
  if (mode === 'image-fallback' && idleFrames.length > 0) {
    return (
      <div className="pet-art-wrap">
        <FrameSequencePlayer frames={idleFrames} fps={10} loop className={className} alt={alt} />
      </div>
    )
  }

  // Static / animated WebP / PNG
  if (singleUrl) {
    return (
      <div className="pet-art-wrap">
        <img src={singleUrl} alt={alt} className={className} draggable={false} />
        {visual.tint && <div className="pet-tint" style={{ background: visual.tint }} aria-hidden />}
      </div>
    )
  }

  // last resort: try idle single
  const idleSrc = pack.assetUrls['idle::src']
  if (idleSrc) {
    return (
      <div className="pet-art-wrap">
        <img src={idleSrc} alt={alt} className={className} draggable={false} />
      </div>
    )
  }

  return null
}
