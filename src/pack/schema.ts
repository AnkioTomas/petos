/** Pack schema=1 — 声明式 JSON only，永不 eval。无 SWF/Flash。 */

export type PoseType = 'image' | 'webp' | 'frames' | 'spine'

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
 * Spine 骨骼动画（QQ 宠级动态质量路径）
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

export type PoseDef = ImagePoseDef | FramesPoseDef | SpinePoseDef

export type PackManifestV1 = {
  schema: 1
  meta: {
    name: string
    author?: string
    description?: string
  }
  poses: {
    idle: PoseDef
    pet?: PoseDef
    eat?: PoseDef
    sleep?: PoseDef
    sad?: PoseDef
    hunger?: PoseDef
    play?: PoseDef
  }
  voice?: {
    lines?: Partial<Record<string, string[]>>
    pet?: string[]
    hungry?: string[]
    feed?: string[]
    sleep?: string[]
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
  // image / webp / 缺省
  return typeof o.src === 'string' && !!(o.src as string).trim()
}

export function isManifestV1(data: unknown): data is PackManifestV1 {
  if (!data || typeof data !== 'object') return false
  const m = data as Record<string, unknown>
  if (m.schema !== 1) return false
  const meta = m.meta as Record<string, unknown> | undefined
  if (!meta || typeof meta.name !== 'string' || !meta.name.trim()) return false
  const poses = m.poses as Record<string, unknown> | undefined
  if (!poses || typeof poses !== 'object') return false
  if (!hasSrc(poses.idle)) return false
  return true
}

export function getPoseType(pose: PoseDef): PoseType {
  if (pose.type === 'frames' || pose.type === 'spine' || pose.type === 'webp' || pose.type === 'image') {
    return pose.type
  }
  // 缺省：按扩展名猜
  if ('src' in pose && typeof pose.src === 'string') {
    return pose.src.toLowerCase().endsWith('.webp') ? 'webp' : 'image'
  }
  return 'image'
}
