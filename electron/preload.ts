import { contextBridge, ipcRenderer, webUtils } from 'electron'

export type NeedsState = {
  hunger: number
  cleanliness: number
  mood: number
  energy: number
}

export type GrowthState = {
  xp: number
  stage: 'baby' | 'teen' | 'youth' | 'adult'
  level: number
}

export type WalletState = {
  gold: number
  diamond: number
  tide: number
}

export type InventoryItem = {
  sku: string
  quantity: number
}

export type OccupationState = {
  kind: 'work' | 'study' | 'trip' | null
  jobId: string | null
  startedAt: number | null
  duration: number | null
}

const api = {
  getPersist: () => ipcRenderer.invoke('persist:get') as Promise<{
    needs: NeedsState
    activePackPath: string | null
    activePackName: string | null
    growth: GrowthState
    wallet: WalletState
    inventory: InventoryItem[]
    occupation: OccupationState
    lastSaved: number | null
  }>,
  setNeeds: (needs: NeedsState) => ipcRenderer.invoke('persist:setNeeds', needs) as Promise<boolean>,
  setGrowth: (growth: GrowthState) =>
    ipcRenderer.invoke('persist:setGrowth', growth) as Promise<boolean>,
  getGrowth: () => ipcRenderer.invoke('persist:getGrowth') as Promise<GrowthState>,
  setWallet: (wallet: WalletState) =>
    ipcRenderer.invoke('persist:setWallet', wallet) as Promise<boolean>,
  getWallet: () => ipcRenderer.invoke('persist:getWallet') as Promise<WalletState>,
  setInventory: (inventory: InventoryItem[]) =>
    ipcRenderer.invoke('persist:setInventory', inventory) as Promise<boolean>,
  getInventory: () => ipcRenderer.invoke('persist:getInventory') as Promise<InventoryItem[]>,
  setOccupation: (occupation: OccupationState) =>
    ipcRenderer.invoke('persist:setOccupation', occupation) as Promise<boolean>,
  getOccupation: () => ipcRenderer.invoke('persist:getOccupation') as Promise<OccupationState>,
  setPluginData: (pluginId: string, data: Record<string, unknown>) =>
    ipcRenderer.invoke('persist:setPluginData', pluginId, data) as Promise<boolean>,
  getPluginData: (pluginId: string) =>
    ipcRenderer.invoke('persist:getPluginData', pluginId) as Promise<Record<string, unknown>>,
  save: () => ipcRenderer.invoke('persist:save') as Promise<boolean>,
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  showContextMenu: () => ipcRenderer.invoke('window:showContextMenu') as Promise<boolean>,
  moveWindowOffset: (mouseX: number, mouseY: number) => {
    ipcRenderer.send('window:move-offset', mouseX, mouseY)
  },
  setPanelOpen: (open: boolean) => ipcRenderer.invoke('window:setPanelOpen', open) as Promise<boolean>,
  getPanelOpen: () => ipcRenderer.invoke('window:getPanelOpen') as Promise<boolean>,
  setSleeping: (value: boolean) => ipcRenderer.invoke('pet:setSleeping', value) as Promise<boolean>,
  onMenuAction: (handler: (action: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, action: string) => handler(action)
    ipcRenderer.on('menu:action', listener)
    return () => {
      ipcRenderer.removeListener('menu:action', listener)
    }
  },
  loadActivePack: () =>
    ipcRenderer.invoke('pack:loadActive') as Promise<{
      pack: { dir: string; manifest: unknown; name: string | null } | null
      error: string | null
    }>,
  choosePackFolder: () => ipcRenderer.invoke('pack:chooseFolder'),
  choosePackZip: () => ipcRenderer.invoke('pack:chooseZip'),
  importDroppedZip: (filePath: string) => ipcRenderer.invoke('pack:importDroppedZip', filePath),
  importBlankTemplate: () => ipcRenderer.invoke('pack:importBlankTemplate'),
  getDemoPackPath: () => ipcRenderer.invoke('pack:getDemoPackPath') as Promise<string>,
  clearPack: () => ipcRenderer.invoke('pack:clear'),
  resolveAssetUrl: (packDir: string, relSrc: string) =>
    ipcRenderer.invoke('pack:resolveAssetUrl', packDir, relSrc) as Promise<string | null>,
  /** Resolve OS path for a dropped File (Electron 32+) */
  getPathForFile: (file: File) => {
    try {
      return webUtils.getPathForFile(file)
    } catch {
      return ''
    }
  },
}

contextBridge.exposeInMainWorld('pet', api)

export type PetApi = typeof api
