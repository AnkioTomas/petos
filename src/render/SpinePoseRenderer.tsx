import { useEffect, useRef, useState } from 'react'

type Props = {
  /** petos:// URL to skeleton .json */
  skeletonUrl: string
  atlasUrl: string
  textureUrl?: string | null
  animation?: string
  loop?: boolean
  skin?: string
  width?: number
  height?: number
  className?: string
  /** 若 Spine 运行时加载失败，回退通知 */
  onFallback?: () => void
}

/**
 * Spine 质量路径脚手架。
 * 使用 @esotericsoftware/spine-player；失败时 onFallback（由上层回退帧/静图）。
 * 完整管线与目录约定见 docs/spine-pack.md
 *
 * TODO(M2): 预乘 alpha、多皮肤热切、与交互时间轴对齐、包内动画名校验 UI。
 */
export function SpinePoseRenderer({
  skeletonUrl,
  atlasUrl,
  animation = 'idle',
  loop = true,
  skin,
  width = 220,
  height = 220,
  className,
  onFallback,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false
    let player: { dispose?: () => void } | null = null

    ;(async () => {
      try {
        const mod = await import('@esotericsoftware/spine-player')
        // CSS side-effect for default player chrome — we hide chrome via config
        await import('@esotericsoftware/spine-player/dist/spine-player.css')
        if (disposed || !hostRef.current) return
        hostRef.current.innerHTML = ''
        const SpinePlayer = mod.SpinePlayer
        player = new SpinePlayer(hostRef.current, {
          preserveDrawingBuffer: false,
          skeleton: skeletonUrl,
          atlas: atlasUrl,
          animation,
          animations: [animation],
          rawDataURIs: undefined,
          premultipliedAlpha: true,
          backgroundColor: '#00000000',
          alpha: true,
          showControls: false,
          showLoading: false,
          success: (p: { setAnimation?: (n: string, l: boolean) => void; skeleton?: { setSkinByName?: (s: string) => void } }) => {
            try {
              if (skin && p.skeleton?.setSkinByName) p.skeleton.setSkinByName(skin)
              p.setAnimation?.(animation, loop)
            } catch {
              /* ignore skin errors */
            }
          },
          error: (_p: unknown, msg: string) => {
            setError(msg || 'Spine 加载失败')
            onFallback?.()
          },
        } as unknown as ConstructorParameters<typeof SpinePlayer>[1])
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        onFallback?.()
      }
    })()

    return () => {
      disposed = true
      try {
        player?.dispose?.()
      } catch {
        /* ignore */
      }
      if (hostRef.current) hostRef.current.innerHTML = ''
    }
  }, [skeletonUrl, atlasUrl, animation, loop, skin, onFallback])

  if (error) {
    return (
      <div className={className} style={{ width, height, display: 'grid', placeItems: 'center', fontSize: 11, opacity: 0.7 }}>
        Spine 暂不可用
      </div>
    )
  }

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ width, height }}
      data-spine-animation={animation}
    />
  )
}
