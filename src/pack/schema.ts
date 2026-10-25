/**
 * Pack schema=1 — 声明式 JSON only，永不 eval。无 SWF/Flash。
 * pack-authoring.md v2.3
 */

export type PoseType = 'image' | 'webp' | 'frames' | 'spine' | 'live2d'

/** 单图 / 动画 WebP */
export type ImagePoseDef = {
  type?: 'image' | 'webp'
  src: string
  /** 交互展示时长 ms；动画 WebP 可省略（播完或循环） */
  ms?: number
  loop?: boolean
}

/** PNG/WebP 帧序列（M1 主力动态） */
export type FramesPoseDef = {
  type: 'frames'
  /** 相对路径列表，按顺序播放 */
  frames: string[]
  /** 每秒帧数，默认 12 */
  fps?: number
  loop?: boolean
  /** 非循环时播完停留在末帧或回 idle 由引擎决定；ms 可覆盖总时长 */
  ms?: number
}

/**
 * Spine 骨骼动画（高质量动态路径）
 * 目录约定见 docs/spine-pack.md
 */
export type SpinePoseDef = {
  type: 'spine'
  /** .json 骨骼数据 */
  skeleton: string
  /** .atlas 图集描述 */
  atlas: string
  /** 图集贴图（若 atlas 内已写相对路径可省略，建议显式） */
  texture?: string
  /** 要播放的动画名，默认 idle */
  animation?: string
  loop?: boolean
  /** 皮肤名可选 */
  skin?: string
}

/**
 * Live2D Cubism（官方默认路径）
 * redesign.md §5.1 官方默认 Live2D Cubism 4 + Core 许可合规
 */
export type Live2DPoseDef = {
  type: 'live2d'
  /** .model3.json 路径 */
  model: string
  /** motion 映射表（可选覆盖默认） */
  motions?: Record<string, string[]>
  /** 眼球跟随参数名 */
  eyeParams?: { x: string; y: string }
}

export type PoseDef = ImagePoseDef | FramesPoseDef | SpinePoseDef | Live2DPoseDef

export type PackManifestV1 = {
  schema: 1
  meta: {
    name: string
    author?: string
    description?: string
    /** 渲染器类型：live2d | spine | frames */
    renderer?: 'live2d' | 'spine' | 'frames'
    /** 保真度标签 */
    fidelity?: 'official_live2d' | 'spine' | 'frames'
  }
  /** Live2D 包：直接指定 model 路径 */
  live2d?: {
    model: string
    /** 形态映射 */
    forms?: {
      juvenile?: string
      adult?: string
    }
    /** motion 组到动画名的映射 */
    motions?: {
      idle?: string[]
      walk?: string[]
      jump?: string[]
      hide?: string[]
      lift?: string[]
      sleep?: string[]
      pet?: string[]
      eat?: string[]
      play?: string[]
    }
    /** 眼球跟随参数 */
    eyeParams?: { x: string; y: string }
  }
  poses: {
    idle: PoseDef
    pet?: PoseDef
    eat?: PoseDef
    sleep?: PoseDef
    sad?: PoseDef
    hunger?: PoseDef
    play?: PoseDef
    walk?: PoseDef
    jump?: PoseDef
    hide?: PoseDef
    lift?: PoseDef
    weak?: PoseDef
    clean?: PoseDef
  }
  voice?: {
    lines?: Partial<Record<string, string[]>>
    pet?: string[]
    hungry?: string[]
    feed?: string[]
    sleep?: string[]
    food?: string[]
    clean?: string[]
    med?: string[]
    toy?: string[]
  }
  items?: unknown[]
}

export type LoadedPack = {
  dir: string
  name: string
  manifest: PackManifestV1
  /** 解析后的资源 URL；frames 存 JSON 数组字符串 key 用 poseKey::frame::i */
  assetUrls: Record<string, string | null>
}

function hasSrc(p: unknown): boolean {
  if (!p || typeof p !== 'object') return false
  const o = p as Record<string, unknown>
  if (o.type === 'frames') {
    return Array.isArray(o.frames) && o.frames.length > 0 && o.frames.every((x) => typeof x === 'string')
  }
  if (o.type === 'spine') {
    return typeof o.skeleton === 'string' && typeof o.atlas === 'string'
  }
  if (o.type === 'live2d') {
    return typeof o.model === 'string'
  }
  // image / webp / 缺省
  return typeof o.src === 'string' && !!(o.src as string).trim()
}

export function isManifestV1(data: unknown): data is PackManifestV1 {
  if (!data || typeof data !== 'object') return false
  const m = data as Record<string, unknown>
  if (m.schema !== 1) return false
  const meta = m.meta as Record<string, unknown> | undefined
  if (!meta || typeof meta.name !== 'string' || !meta.name.trim()) return false
  
  // Live2D 包可以只有 live2d 字段
  if (m.live2d && typeof m.live2d === 'object') {
    const l2d = m.live2d as Record<string, unknown>
    if (typeof l2d.model === 'string') return true
  }
  
  const poses = m.poses as Record<string, unknown> | undefined
  if (!poses || typeof poses !== 'object') return false
  if (!hasSrc(poses.idle)) return false
  return true
}

export function getPoseType(pose: PoseDef): PoseType {
  if (pose.type === 'frames' || pose.type === 'spine' || pose.type === 'webp' || pose.type === 'image' || pose.type === 'live2d') {
    return pose.type
  }
  // 缺省：按扩展名猜
  if ('src' in pose && typeof pose.src === 'string') {
    return pose.src.toLowerCase().endsWith('.webp') ? 'webp' : 'image'
  }
  if ('model' in pose && typeof pose.model === 'string') {
    return 'live2d'
  }
  return 'image'
}

export function isLive2DPack(manifest: PackManifestV1): boolean {
  return !!(manifest.live2d?.model || manifest.meta.renderer === 'live2d')
}
