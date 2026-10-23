import { contextBridge, ipcRenderer, webUtils } from 'electron'

export type NeedsState = {
  hunger: number
  mood: number
  energy: number
  cleanliness: number
}

const api = {
  getPersist: () => ipcRenderer.invoke('persist:get') as Promise<{
    needs: NeedsState
    activePackPath: string | null
    activePackName: string | null
    growth: { xp: number; stage: 'baby' | 'teen' | 'youth' | 'adult' }
  }>,
  setNeeds: (needs: NeedsState) => ipcRenderer.invoke('persist:setNeeds', needs) as Promise<boolean>,
  setGrowth: (growth: { xp: number; stage: 'baby' | 'teen' | 'youth' | 'adult' }) =>
    ipcRenderer.invoke('persist:setGrowth', growth) as Promise<boolean>,
  getGrowth: () =>
    ipcRenderer.invoke('persist:getGrowth') as Promise<{
      xp: number
      stage: 'baby' | 'teen' | 'youth' | 'adult'
    }>,
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
