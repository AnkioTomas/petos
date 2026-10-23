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
  }>,
  setNeeds: (needs: NeedsState) => ipcRenderer.invoke('persist:setNeeds', needs) as Promise<boolean>,
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
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
