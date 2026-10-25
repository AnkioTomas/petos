/**
 * 插件宿主骨架（CORE）
 * plugin-spec.md 架构
 * 
 * 首期：官方插件同进程模块，权限检查
 * CORE 可在零玩法插件下完成照料+Desk+档案
 */

export type PluginPermission =
  | 'needs.read'
  | 'needs.write'
  | 'wallet.read'
  | 'wallet.debit'
  | 'wallet.credit'
  | 'growth.grant'
  | 'occupation.request'
  | 'mail.send'
  | 'ui.panel'
  | 'ui.footbar'
  | 'storage'
  | 'items.register'
  | 'quests.register'
  | 'notify.bubble'
  | 'desk.intent'

export type PluginManifest = {
  id: string
  name: string
  version: string
  engines: { petos: string }
  main: string
  official?: boolean
  permissions: PluginPermission[]
  contributes?: {
    footbar?: FootbarItem[]
    trayMenu?: unknown[]
    panels?: PanelDef[]
    items?: unknown[]
    shop?: unknown[]
    quests?: unknown[]
    mail?: unknown[]
    counters?: string[]
    occupationKinds?: ('work' | 'study' | 'trip')[]
  }
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

export type FootbarItem = {
  group: 'daily' | 'interact' | 'tools' | 'activity' | 'dress' | 'custom'
  id: string
  label: string
  order: number
  panel?: string
  when?: string
}

export type PanelDef = {
  id: string
  title: string
  entry: string
}

export type PluginState = 'installed' | 'enabled' | 'disabled'

export type PluginRecord = {
  manifest: PluginManifest
  state: PluginState
  data: Record<string, unknown>
}

export type PluginRegistry = Map<string, PluginRecord>

export function createPluginRegistry(): PluginRegistry {
  return new Map()
}

export function hasPermission(plugin: PluginRecord, permission: PluginPermission): boolean {
  return plugin.manifest.permissions.includes(permission)
}

export function checkEngineVersion(manifest: PluginManifest, currentVersion: string): boolean {
  const range = manifest.engines.petos
  const [major, minor] = currentVersion.split('.').map(Number)
  if (range.startsWith('>=')) {
    const reqVer = range.slice(2).split(' ')[0]
    const [reqMajor, reqMinor] = reqVer.split('.').map(Number)
    return major > reqMajor || (major === reqMajor && minor >= reqMinor)
  }
  return true
}

export const CORE_FOOTBAR_GROUPS = ['daily', 'profile', 'settings'] as const
export const PLUGIN_FOOTBAR_GROUPS = ['interact', 'tools', 'activity', 'dress', 'custom'] as const

export type FootbarGroup = {
  id: string
  label: string
  items: FootbarItem[]
  isCore: boolean
}

export function buildFootbarGroups(
  coreItems: FootbarItem[],
  registry: PluginRegistry
): FootbarGroup[] {
  const groups: FootbarGroup[] = []
  
  const groupMap = new Map<string, FootbarItem[]>()
  
  for (const item of coreItems) {
    if (!groupMap.has(item.group)) {
      groupMap.set(item.group, [])
    }
    groupMap.get(item.group)!.push(item)
  }
  
  for (const [, plugin] of registry) {
    if (plugin.state !== 'enabled') continue
    const footbarItems = plugin.manifest.contributes?.footbar ?? []
    for (const item of footbarItems) {
      if (!groupMap.has(item.group)) {
        groupMap.set(item.group, [])
      }
      groupMap.get(item.group)!.push(item)
    }
  }
  
  const groupLabels: Record<string, string> = {
    daily: '日常',
    profile: '档案',
    settings: '设置',
    interact: '交互',
    tools: '工具',
    activity: '活动',
    dress: '装扮',
    custom: '其他',
  }
  
  for (const [groupId, items] of groupMap) {
    if (items.length === 0) continue
    items.sort((a, b) => a.order - b.order)
    groups.push({
      id: groupId,
      label: groupLabels[groupId] ?? groupId,
      items,
      isCore: (CORE_FOOTBAR_GROUPS as readonly string[]).includes(groupId),
    })
  }
  
  return groups
}
