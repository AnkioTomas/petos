import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import Store from 'electron-store'
import JSZip from 'jszip'

type NeedsState = {
  hunger: number
  mood: number
  energy: number
  cleanliness: number
}

type PersistShape = {
  needs: NeedsState
  activePackPath: string | null
  activePackName: string | null
}

const store = new Store<PersistShape>({
  name: 'petos',
  defaults: {
    needs: { hunger: 80, mood: 80, energy: 80, cleanliness: 80 },
    activePackPath: null,
    activePackName: null,
  },
})

let mainWindow: BrowserWindow | null = null

const isDev = !app.isPackaged

function brandIconPath() {
  const p = path.join(app.getAppPath(), 'assets', 'brand', 'logo.png')
  return fs.existsSync(p) ? p : undefined
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 560,
    minWidth: 320,
    minHeight: 420,
    title: 'PetOS · 我的宠物',
    transparent: true,
    frame: false,
    hasShadow: true,
    resizable: true,
    backgroundColor: '#00000000',
    icon: brandIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function extractZipToUserData(zipPath: string): Promise<string> {
  const buf = fs.readFileSync(zipPath)
  const zip = await JSZip.loadAsync(buf)
  const names = Object.keys(zip.files)
  // Find manifest.json; allow one root folder wrapper
  let manifestEntry = names.find((n) => n === 'manifest.json' || n.endsWith('/manifest.json'))
  if (!manifestEntry) {
    throw new Error('素材包缺少 manifest.json')
  }
  const rootPrefix = manifestEntry === 'manifest.json' ? '' : manifestEntry.slice(0, -'manifest.json'.length)

  const destRoot = path.join(app.getPath('userData'), 'packs', `pack-${Date.now()}`)
  fs.mkdirSync(destRoot, { recursive: true })

  for (const name of names) {
    const entry = zip.files[name]
    if (!entry || entry.dir) continue
    if (rootPrefix && !name.startsWith(rootPrefix)) continue
    const rel = rootPrefix ? name.slice(rootPrefix.length) : name
    if (!rel || rel.includes('..')) continue
    const outPath = path.join(destRoot, rel)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    const content = await entry.async('nodebuffer')
    fs.writeFileSync(outPath, content)
  }

  if (!fs.existsSync(path.join(destRoot, 'manifest.json'))) {
    throw new Error('解压后未找到 manifest.json')
  }
  return destRoot
}

function copyFolderPack(srcDir: string): string {
  const manifestPath = path.join(srcDir, 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    throw new Error('所选文件夹缺少 manifest.json')
  }
  const destRoot = path.join(app.getPath('userData'), 'packs', `pack-${Date.now()}`)
  fs.mkdirSync(destRoot, { recursive: true })
  copyDirSafe(srcDir, destRoot)
  return destRoot
}

function copyDirSafe(src: string, dest: string) {
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const ent of entries) {
    if (ent.name === '.' || ent.name === '..') continue
    const from = path.join(src, ent.name)
    const to = path.join(dest, ent.name)
    if (ent.isDirectory()) {
      fs.mkdirSync(to, { recursive: true })
      copyDirSafe(from, to)
    } else if (ent.isFile()) {
      // Only allow common resource extensions + json
      const ext = path.extname(ent.name).toLowerCase()
      const allowed = ['.json', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.atlas', '.skel', '.mp3', '.ogg', '.wav', '.txt', '.md']
      if (!allowed.includes(ext)) continue
      fs.copyFileSync(from, to)
    }
  }
}

function readManifestSafe(packDir: string): { ok: true; data: unknown } | { ok: false; error: string } {
  try {
    const raw = fs.readFileSync(path.join(packDir, 'manifest.json'), 'utf8')
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return { ok: false, error: 'manifest 不是对象' }
    const schema = (data as { schema?: unknown }).schema
    if (schema !== 1) return { ok: false, error: '仅支持 schema=1' }
    const meta = (data as { meta?: { name?: unknown } }).meta
    if (!meta || typeof meta.name !== 'string' || !meta.name.trim()) {
      return { ok: false, error: '缺少 meta.name' }
    }
    const poses = (data as { poses?: { idle?: { src?: unknown } } }).poses
    if (!poses?.idle?.src || typeof poses.idle.src !== 'string') {
      return { ok: false, error: '缺少 poses.idle.src' }
    }
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

function registerIpc() {
  ipcMain.handle('persist:get', () => {
    return {
      needs: store.get('needs'),
      activePackPath: store.get('activePackPath'),
      activePackName: store.get('activePackName'),
    }
  })

  ipcMain.handle('persist:setNeeds', (_e, needs: NeedsState) => {
    store.set('needs', needs)
    return true
  })

  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window:close', () => {
    mainWindow?.close()
  })

  ipcMain.handle('pack:getBlankTemplatePath', () => {
    // In dev: project/templates/blank-pack; in prod: resources
    if (isDev) {
      return path.join(app.getAppPath(), 'templates', 'blank-pack')
    }
    return path.join(process.resourcesPath, 'templates', 'blank-pack')
  })

  ipcMain.handle('pack:loadActive', async () => {
    const packPath = store.get('activePackPath')
    if (!packPath || !fs.existsSync(path.join(packPath, 'manifest.json'))) {
      return { pack: null, error: null }
    }
    const result = readManifestSafe(packPath)
    if (!result.ok) {
      return { pack: null, error: result.error }
    }
    return {
      pack: {
        dir: packPath,
        manifest: result.data,
        name: store.get('activePackName'),
      },
      error: null,
    }
  })

  ipcMain.handle('pack:chooseFolder', async () => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: '选择素材包文件夹',
      properties: ['openDirectory'],
    })
    if (res.canceled || !res.filePaths[0]) return { ok: false, cancelled: true }
    try {
      const dest = copyFolderPack(res.filePaths[0])
      const parsed = readManifestSafe(dest)
      if (!parsed.ok) {
        fs.rmSync(dest, { recursive: true, force: true })
        return { ok: false, error: parsed.error }
      }
      const name = (parsed.data as { meta: { name: string } }).meta.name
      store.set('activePackPath', dest)
      store.set('activePackName', name)
      return { ok: true, pack: { dir: dest, manifest: parsed.data, name } }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('pack:chooseZip', async () => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: '选择素材包 ZIP',
      properties: ['openFile'],
      filters: [{ name: 'ZIP', extensions: ['zip'] }],
    })
    if (res.canceled || !res.filePaths[0]) return { ok: false, cancelled: true }
    try {
      const dest = await extractZipToUserData(res.filePaths[0])
      const parsed = readManifestSafe(dest)
      if (!parsed.ok) {
        fs.rmSync(dest, { recursive: true, force: true })
        return { ok: false, error: parsed.error }
      }
      const name = (parsed.data as { meta: { name: string } }).meta.name
      store.set('activePackPath', dest)
      store.set('activePackName', name)
      return { ok: true, pack: { dir: dest, manifest: parsed.data, name } }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('pack:importDroppedZip', async (_e, filePath: string) => {
    if (!filePath || typeof filePath !== 'string' || !filePath.toLowerCase().endsWith('.zip')) {
      return { ok: false, error: '请拖入 .zip 素材包' }
    }
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: '文件不存在' }
    }
    try {
      const dest = await extractZipToUserData(filePath)
      const parsed = readManifestSafe(dest)
      if (!parsed.ok) {
        fs.rmSync(dest, { recursive: true, force: true })
        return { ok: false, error: parsed.error }
      }
      const name = (parsed.data as { meta: { name: string } }).meta.name
      store.set('activePackPath', dest)
      store.set('activePackName', name)
      return { ok: true, pack: { dir: dest, manifest: parsed.data, name } }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('pack:importBlankTemplate', async () => {
    try {
      const template = isDev
        ? path.join(app.getAppPath(), 'templates', 'blank-pack')
        : path.join(process.resourcesPath, 'templates', 'blank-pack')
      const dest = copyFolderPack(template)
      const parsed = readManifestSafe(dest)
      if (!parsed.ok) {
        fs.rmSync(dest, { recursive: true, force: true })
        return { ok: false, error: parsed.error }
      }
      const name = (parsed.data as { meta: { name: string } }).meta.name
      store.set('activePackPath', dest)
      store.set('activePackName', name)
      return { ok: true, pack: { dir: dest, manifest: parsed.data, name } }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('pack:clear', () => {
    store.set('activePackPath', null)
    store.set('activePackName', null)
    return true
  })

  ipcMain.handle('pack:resolveAssetUrl', (_e, packDir: string, relSrc: string) => {
    if (!packDir || !relSrc || relSrc.includes('..') || path.isAbsolute(relSrc)) {
      return null
    }
    const full = path.normalize(path.join(packDir, relSrc))
    if (!full.startsWith(path.normalize(packDir))) return null
    if (!fs.existsSync(full)) return null
    return pathToFileURL(full).href
  })
}

app.whenReady().then(() => {
  // Allow loading local pack assets via file: URLs from renderer
  protocol.handle('file', (request) => net.fetch(request.url))

  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
