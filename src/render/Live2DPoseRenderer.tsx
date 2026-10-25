/**
 * Live2D Cubism 渲染器
 * redesign.md §5.1 官方默认 Live2D Cubism 4 + Core 许可合规
 * 
 * 使用 pixi-live2d-display 驱动真实 motion，不依赖 CSS 动画
 */
import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react'
import * as PIXI from 'pixi.js'
import { Live2DModel, MotionPreloadStrategy } from 'pixi-live2d-display'

declare global {
  interface Window {
    PIXI: typeof PIXI
  }
}

window.PIXI = PIXI

export type MotionGroup = 
  | 'idle' 
  | 'walk' 
  | 'jump' 
  | 'hide_left' 
  | 'hide_right' 
  | 'lift' 
  | 'sleep' 
  | 'weak'
  | 'pet'
  | 'eat'
  | 'play'

export type Live2DMotionMapping = {
  idle?: string[]
  walk?: string[]
  jump?: string[]
  hide?: string[]
  lift?: string[]
  sleep?: string[]
  weak?: string[]
  pet?: string[]
  eat?: string[]
  play?: string[]
}

export interface Live2DPoseRendererHandle {
  playMotion: (group: MotionGroup | string, index?: number) => Promise<boolean>
  playIdleRandom: () => Promise<boolean>
  setEyeFollow: (x: number, y: number) => void
  stopMotion: () => void
  hasMotionGroup: (group: string) => boolean
  getAvailableMotions: () => string[]
}

type Props = {
  modelUrl: string
  motionMapping?: Live2DMotionMapping
  eyeParams?: { x: string; y: string }
  width?: number
  height?: number
  className?: string
  mousePosition?: { x: number; y: number } | null
  onFallback?: () => void
  onModelReady?: () => void
  initialMotion?: MotionGroup
}

const DEFAULT_EYE_PARAMS = { x: 'ParamAngleX', y: 'ParamAngleY' }

const Live2DPoseRendererInner = forwardRef<Live2DPoseRendererHandle, Props>(function Live2DPoseRendererInner(
  {
    modelUrl,
    motionMapping,
    eyeParams = DEFAULT_EYE_PARAMS,
    width = 220,
    height = 220,
    className,
    mousePosition,
    onFallback,
    onModelReady,
    initialMotion = 'idle',
  },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const modelRef = useRef<InstanceType<typeof Live2DModel> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const mountedRef = useRef(true)

  const mapMotionGroup = useCallback((group: MotionGroup | string): string => {
    if (group === 'hide_left' || group === 'hide_right') return 'hide'
    return group
  }, [])

  const hasMotionGroup = useCallback((group: string): boolean => {
    const model = modelRef.current
    if (!model?.internalModel?.motionManager?.definitions) return false
    const defs = model.internalModel.motionManager.definitions as Record<string, unknown[]>
    const mappedGroup = mapMotionGroup(group as MotionGroup)
    const customMapping = motionMapping?.[mappedGroup as keyof Live2DMotionMapping]
    if (customMapping && customMapping.length > 0) {
      return customMapping.some(name => {
        for (const defGroup of Object.values(defs)) {
          if (Array.isArray(defGroup) && defGroup.some((d: unknown) => {
            const def = d as { File?: string } | null
            return def?.File?.includes(name) ?? false
          })) {
            return true
          }
        }
        return false
      })
    }
    return !!(defs[mappedGroup] && defs[mappedGroup].length > 0)
  }, [motionMapping, mapMotionGroup])

  const getAvailableMotions = useCallback((): string[] => {
    const model = modelRef.current
    if (!model?.internalModel?.motionManager?.definitions) return []
    const defs = model.internalModel.motionManager.definitions as Record<string, unknown[]>
    return Object.keys(defs).filter(k => defs[k] && defs[k].length > 0)
  }, [])

  const playMotion = useCallback(async (group: MotionGroup | string, index?: number): Promise<boolean> => {
    const model = modelRef.current
    if (!model) return false

    try {
      const mappedGroup = mapMotionGroup(group as MotionGroup)
      const customMapping = motionMapping?.[mappedGroup as keyof Live2DMotionMapping]
      
      if (customMapping && customMapping.length > 0) {
        const idx = index ?? Math.floor(Math.random() * customMapping.length)
        const motionName = customMapping[idx % customMapping.length]
        const defs = model.internalModel?.motionManager?.definitions as Record<string, unknown[]> | undefined
        if (defs) {
          for (const [defGroup, defList] of Object.entries(defs)) {
            if (!Array.isArray(defList)) continue
            const defIndex = defList.findIndex((d: unknown) => {
              const def = d as { File?: string } | null
              return def?.File?.includes(motionName) ?? false
            })
            if (defIndex >= 0) {
              await model.motion(defGroup, defIndex)
              return true
            }
          }
        }
      }

      const motionIndex = index ?? 0
      await model.motion(mappedGroup, motionIndex)
      return true
    } catch (e) {
      console.warn(`Live2D motion failed: ${group}`, e)
      return false
    }
  }, [motionMapping, mapMotionGroup])

  const playIdleRandom = useCallback(async (): Promise<boolean> => {
    const model = modelRef.current
    if (!model) return false

    try {
      const defs = model.internalModel?.motionManager?.definitions as Record<string, unknown[]> | undefined
      const idleMotions = defs?.['idle'] || defs?.['Idle'] || []
      const customIdle = motionMapping?.idle
      
      if (customIdle && customIdle.length > 0) {
        const randomIdx = Math.floor(Math.random() * customIdle.length)
        return playMotion('idle', randomIdx)
      }
      
      if (idleMotions.length > 0) {
        const randomIdx = Math.floor(Math.random() * idleMotions.length)
        await model.motion('idle', randomIdx)
        return true
      }
      
      return false
    } catch {
      return false
    }
  }, [motionMapping, playMotion])

  const setEyeFollow = useCallback((x: number, y: number) => {
    const model = modelRef.current
    if (!model?.internalModel?.coreModel) return

    try {
      const core = model.internalModel.coreModel as {
        setParameterValueById?: (id: string, value: number) => void
      }
      if (core.setParameterValueById) {
        const angleX = (x - 0.5) * 60
        const angleY = (y - 0.5) * 60
        core.setParameterValueById(eyeParams.x, angleX)
        core.setParameterValueById(eyeParams.y, angleY)
      }
    } catch {
      // Silently ignore parameter errors
    }
  }, [eyeParams])

  const stopMotion = useCallback(() => {
    const model = modelRef.current
    if (!model?.internalModel?.motionManager) return
    try {
      const manager = model.internalModel.motionManager as { stopAllMotions?: () => void }
      manager.stopAllMotions?.()
    } catch {
      // Ignore
    }
  }, [])

  useImperativeHandle(ref, () => ({
    playMotion,
    playIdleRandom,
    setEyeFollow,
    stopMotion,
    hasMotionGroup,
    getAvailableMotions,
  }), [playMotion, playIdleRandom, setEyeFollow, stopMotion, hasMotionGroup, getAvailableMotions])

  useEffect(() => {
    mountedRef.current = true
    let app: PIXI.Application | null = null
    let model: InstanceType<typeof Live2DModel> | null = null

    const init = async () => {
      if (!canvasRef.current) return

      try {
        app = new PIXI.Application({
          view: canvasRef.current,
          width,
          height,
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        })
        appRef.current = app

        model = await Live2DModel.from(modelUrl, {
          motionPreload: MotionPreloadStrategy.IDLE,
        })

        if (!mountedRef.current) {
          model.destroy()
          return
        }

        modelRef.current = model

        const scale = Math.min(width / model.width, height / model.height) * 0.85
        model.scale.set(scale)
        model.x = (width - model.width * scale) / 2
        model.y = (height - model.height * scale) / 2

        app.stage.addChild(model as unknown as PIXI.DisplayObject)

        setReady(true)
        onModelReady?.()

        if (initialMotion) {
          setTimeout(() => {
            playMotion(initialMotion).catch(() => {})
          }, 100)
        }
      } catch (e) {
        if (!mountedRef.current) return
        const msg = e instanceof Error ? e.message : String(e)
        console.error('Live2D load failed:', msg)
        setError(msg)
        onFallback?.()
      }
    }

    init()

    return () => {
      mountedRef.current = false
      if (model) {
        try {
          model.destroy()
        } catch {}
      }
      if (app) {
        try {
          app.destroy(false, { children: true })
        } catch {}
      }
      appRef.current = null
      modelRef.current = null
    }
  }, [modelUrl, width, height, onFallback, onModelReady, initialMotion, playMotion])

  useEffect(() => {
    if (!ready || !mousePosition) return
    const { x, y } = mousePosition
    setEyeFollow(x / width, y / height)
  }, [mousePosition, ready, width, height, setEyeFollow])

  if (error) {
    return (
      <div 
        className={className} 
        style={{ 
          width, 
          height, 
          display: 'grid', 
          placeItems: 'center', 
          fontSize: 11, 
          opacity: 0.7,
          color: '#8a7380'
        }}
      >
        Live2D 暂不可用
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height }}
      data-live2d-model={modelUrl}
    />
  )
})

export const Live2DPoseRenderer = Live2DPoseRendererInner
