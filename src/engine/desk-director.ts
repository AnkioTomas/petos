/**
 * DeskDirector - Live2D Motion 驱动层
 * redesign.md §5.3 Desk 状态机 + CORE Live2D motion 集成
 * 
 * 核心职责：
 * 1. 将 DeskBehavior 映射到 Live2D motion group
 * 2. 管理 Idle pool 随机播放
 * 3. 处理 Drag → Lift，Release → Idle/Land
 * 4. Weak/Sleep 锁定 playful behaviors
 */

import type { DeskBehavior } from './desk'
import type { Live2DPoseRendererHandle, MotionGroup } from '../render/Live2DPoseRenderer'
import type { Live2DMotionMapping } from '../pack/schema'

export type DeskDirectorConfig = {
  motionMapping?: Live2DMotionMapping
  idlePoolInterval?: [number, number]
}

export type DeskDirectorState = {
  currentBehavior: DeskBehavior
  isLocked: boolean
  lockReason: 'weak' | 'sleep' | 'occupied' | null
}

const DEFAULT_IDLE_POOL_INTERVAL: [number, number] = [4000, 8000]

const BEHAVIOR_TO_MOTION: Record<DeskBehavior, MotionGroup> = {
  idle: 'idle',
  walk_left: 'walk',
  walk_right: 'walk',
  jump: 'jump',
  edge_hide_left: 'hide_left',
  edge_hide_right: 'hide_right',
  lift: 'lift',
  sleep: 'sleep',
  weak: 'weak',
}

export class DeskDirector {
  private rendererRef: { current: Live2DPoseRendererHandle | null } = { current: null }
  private config: DeskDirectorConfig
  private state: DeskDirectorState
  private idleTimer: number | null = null
  private onStateChange?: (state: DeskDirectorState) => void

  constructor(config: DeskDirectorConfig = {}) {
    this.config = {
      idlePoolInterval: config.idlePoolInterval ?? DEFAULT_IDLE_POOL_INTERVAL,
      motionMapping: config.motionMapping,
    }
    this.state = {
      currentBehavior: 'idle',
      isLocked: false,
      lockReason: null,
    }
  }

  setRenderer(ref: { current: Live2DPoseRendererHandle | null }) {
    this.rendererRef = ref
  }

  setOnStateChange(callback: (state: DeskDirectorState) => void) {
    this.onStateChange = callback
  }

  private updateState(partial: Partial<DeskDirectorState>) {
    this.state = { ...this.state, ...partial }
    this.onStateChange?.(this.state)
  }

  private getRenderer(): Live2DPoseRendererHandle | null {
    return this.rendererRef.current
  }

  async playBehavior(behavior: DeskBehavior): Promise<boolean> {
    if (this.state.isLocked && behavior !== 'sleep' && behavior !== 'weak') {
      return false
    }

    const renderer = this.getRenderer()
    if (!renderer) return false

    const motionGroup = BEHAVIOR_TO_MOTION[behavior]
    
    if (!renderer.hasMotionGroup(motionGroup)) {
      if (behavior === 'idle') {
        return renderer.playIdleRandom()
      }
      return false
    }

    this.updateState({ currentBehavior: behavior })

    if (behavior === 'idle') {
      return renderer.playIdleRandom()
    }

    return renderer.playMotion(motionGroup)
  }

  async startIdlePool() {
    this.stopIdlePool()
    
    const scheduleNext = () => {
      const [min, max] = this.config.idlePoolInterval!
      const delay = min + Math.random() * (max - min)
      
      this.idleTimer = window.setTimeout(async () => {
        if (this.state.isLocked) {
          scheduleNext()
          return
        }
        
        if (this.state.currentBehavior === 'idle') {
          const renderer = this.getRenderer()
          if (renderer) {
            await renderer.playIdleRandom()
          }
        }
        
        scheduleNext()
      }, delay)
    }

    scheduleNext()
  }

  stopIdlePool() {
    if (this.idleTimer !== null) {
      window.clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
  }

  async handleDragStart(): Promise<boolean> {
    if (this.state.isLocked) return false
    
    const renderer = this.getRenderer()
    if (!renderer) return false

    this.updateState({ currentBehavior: 'lift' })
    
    if (renderer.hasMotionGroup('lift')) {
      return renderer.playMotion('lift')
    }
    
    return true
  }

  async handleDragEnd(): Promise<boolean> {
    const renderer = this.getRenderer()
    if (!renderer) return false

    this.updateState({ currentBehavior: 'idle' })
    return renderer.playIdleRandom()
  }

  async lockForWeak(): Promise<void> {
    this.stopIdlePool()
    this.updateState({
      isLocked: true,
      lockReason: 'weak',
      currentBehavior: 'weak',
    })

    const renderer = this.getRenderer()
    if (renderer?.hasMotionGroup('weak')) {
      await renderer.playMotion('weak')
    } else if (renderer?.hasMotionGroup('sleep')) {
      await renderer.playMotion('sleep')
    }
  }

  async lockForSleep(): Promise<void> {
    this.stopIdlePool()
    this.updateState({
      isLocked: true,
      lockReason: 'sleep',
      currentBehavior: 'sleep',
    })

    const renderer = this.getRenderer()
    if (renderer?.hasMotionGroup('sleep')) {
      await renderer.playMotion('sleep')
    }
  }

  async lockForOccupation(): Promise<void> {
    this.stopIdlePool()
    this.updateState({
      isLocked: true,
      lockReason: 'occupied',
      currentBehavior: 'idle',
    })
  }

  async unlock(): Promise<void> {
    this.updateState({
      isLocked: false,
      lockReason: null,
      currentBehavior: 'idle',
    })

    const renderer = this.getRenderer()
    if (renderer) {
      await renderer.playIdleRandom()
    }

    this.startIdlePool()
  }

  async playInteraction(pose: 'pet' | 'eat' | 'play'): Promise<boolean> {
    if (this.state.isLocked) return false

    const renderer = this.getRenderer()
    if (!renderer) return false

    if (renderer.hasMotionGroup(pose)) {
      return renderer.playMotion(pose)
    }

    return false
  }

  getState(): DeskDirectorState {
    return { ...this.state }
  }

  canPerformBehavior(): boolean {
    return !this.state.isLocked
  }

  hasMotion(group: MotionGroup | string): boolean {
    const renderer = this.getRenderer()
    return renderer?.hasMotionGroup(group) ?? false
  }

  getAvailableMotions(): string[] {
    const renderer = this.getRenderer()
    return renderer?.getAvailableMotions() ?? []
  }

  dispose() {
    this.stopIdlePool()
    this.rendererRef = { current: null }
  }
}

export function createDeskDirector(config?: DeskDirectorConfig): DeskDirector {
  return new DeskDirector(config)
}
