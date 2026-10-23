import { isManifestV1, type LoadedPack, type PackManifestV1, type PoseDef } from './schema'

const POSE_KEYS = ['idle', 'pet', 'eat', 'sleep', 'sad', 'hunger', 'play'] as const

async function resolve(dir: string, rel: string): Promise<string | null> {
  try {
    return await window.pet.resolveAssetUrl(dir, rel)
  } catch {
    return null
  }
}

async function collectPoseAssets(
  dir: string,
  poseKey: string,
  pose: PoseDef | undefined,
  assetUrls: Record<string, string | null>,
) {
  if (!pose) return
  if (pose.type === 'frames') {
    for (let i = 0; i < pose.frames.length; i++) {
      const rel = pose.frames[i]
      assetUrls[`${poseKey}::frame::${i}`] = await resolve(dir, rel)
    }
    return
  }
  if (pose.type === 'spine') {
    assetUrls[`${poseKey}::skeleton`] = await resolve(dir, pose.skeleton)
    assetUrls[`${poseKey}::atlas`] = await resolve(dir, pose.atlas)
    if (pose.texture) {
      assetUrls[`${poseKey}::texture`] = await resolve(dir, pose.texture)
    }
    return
  }
  // image / webp / default
  if ('src' in pose && pose.src) {
    assetUrls[`${poseKey}::src`] = await resolve(dir, pose.src)
  }
}

/** idle 是否有可用资源（图 / 至少一帧 / spine 骨架） */
function idleUsable(idle: PoseDef, assetUrls: Record<string, string | null>): boolean {
  if (idle.type === 'frames') {
    return pose.framesHaveAny(assetUrls, 'idle', idle.frames.length)
  }
  if (idle.type === 'spine') {
    return !!(assetUrls['idle::skeleton'] && assetUrls['idle::atlas'])
  }
  return !!assetUrls['idle::src']
}

const pose = {
  framesHaveAny(assetUrls: Record<string, string | null>, key: string, n: number) {
    for (let i = 0; i < n; i++) {
      if (assetUrls[`${key}::frame::${i}`]) return true
    }
    return false
  },
}

export async function hydratePack(
  dir: string,
  manifestRaw: unknown,
  nameHint: string | null,
): Promise<LoadedPack | null> {
  if (!isManifestV1(manifestRaw)) return null
  const manifest = manifestRaw as PackManifestV1
  const assetUrls: Record<string, string | null> = {}

  for (const key of POSE_KEYS) {
    await collectPoseAssets(dir, key, manifest.poses[key], assetUrls)
  }

  if (!idleUsable(manifest.poses.idle, assetUrls)) return null

  return {
    dir,
    name: nameHint || manifest.meta.name,
    manifest,
    assetUrls,
  }
}

export function frameUrlsFor(
  pack: LoadedPack,
  poseKey: string,
  frames: string[],
): string[] {
  const out: string[] = []
  for (let i = 0; i < frames.length; i++) {
    const u = pack.assetUrls[`${poseKey}::frame::${i}`]
    if (u) out.push(u)
  }
  return out
}
