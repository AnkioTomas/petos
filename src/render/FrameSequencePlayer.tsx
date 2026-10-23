import { useEffect, useState } from 'react'

type Props = {
  frames: string[]
  fps?: number
  loop?: boolean
  className?: string
  alt?: string
  onError?: () => void
}

/** M1 主力：PNG/WebP 帧序列播放器 */
export function FrameSequencePlayer({
  frames,
  fps = 12,
  loop = true,
  className,
  alt,
  onError,
}: Props) {
  const [index, setIndex] = useState(0)
  const safe = frames.filter(Boolean)

  useEffect(() => {
    setIndex(0)
  }, [frames.join('|')])

  useEffect(() => {
    if (safe.length <= 1) return
    const ms = Math.max(16, Math.round(1000 / Math.max(1, fps)))
    const id = window.setInterval(() => {
      setIndex((i) => {
        const next = i + 1
        if (next >= safe.length) return loop ? 0 : i
        return next
      })
    }, ms)
    return () => clearInterval(id)
  }, [safe.length, fps, loop, safe.join('|')])

  if (safe.length === 0) return null

  return (
    <img
      src={safe[Math.min(index, safe.length - 1)]}
      alt={alt ?? ''}
      className={className}
      draggable={false}
      onError={onError}
    />
  )
}
