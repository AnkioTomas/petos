import { app, BrowserWindow, ipcMain, dialog, protocol, Menu, Tray, nativeImage, screen } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'
import Store from 'electron-store'
import JSZip from 'jszip'

type NeedsState = {
  hunger: number
  cleanliness: number
  mood: number
  energy: number
}

type GrowthState = {
  xp: number
  stage: 'baby' | 'teen' | 'youth' | 'adult'
  level: number
}

type WalletState = {
  gold: number
  diamond: number
  tide: number
}

type InventoryItem = {
  sku: string
  quantity: number
}

type OccupationState = {
  kind: 'work' | 'study' | 'trip' | null
  jobId: string | null
  startedAt: number | null
  duration: number | null
}

type PersistShape = {
  needs: NeedsState
  activePackPath: string | null
  activePackName: string | null
  growth: GrowthState
  wallet: WalletState
  inventory: InventoryItem[]
  occupation: OccupationState
  plugins: Record<string, Record<string, unknown>>
  lastSaved: number | null
}

const STAGE_LABELS: Record<GrowthState['stage'], string> = {
  baby: '幼体',
  teen: '少年',
  youth: '青年',
  adult: '成年',
}

const store = new Store<PersistShape>({
  name: 'petos',
  defaults: {
    needs: { hunger: 80, cleanliness: 80, mood: 80, energy: 80 },
    activePackPath: null,
    activePackName: null,
    growth: { xp: 0, stage: 'baby', level: 1 },
    wallet: { gold: 320, diamond: 2, tide: 0 },
    inventory: [
      { sku: 'food_fish_snack', quantity: 3 },
      { sku: 'food_cat_food', quantity: 1 },
      { sku: 'clean_wipes', quantity: 1 },
    ],
    occupation: { kind: null, jobId: null, startedAt: null, duration: null },
    plugins: {},
    lastSaved: null,
  },
})

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let sleeping = false
let panelOpen = false

const isDev = !app.isPackaged

// Must run before app.ready — allows <img src="petos://..."> from Vite http origin
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'petos',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true,
    },
  },
])

const PET_SIZE = { width: 260, height: 300 }
const PANEL_SIZE = { width: 360, height: 560 }

function brandIconPath() {
  const p = path.join(app.getAppPath(), 'assets', 'brand', 'logo.png')
  return fs.existsSync(p) ? p : undefined
}

function trayIcon() {
  const iconPath = brandIconPath()
  if (!iconPath) return nativeImage.createEmpty()
  const img = nativeImage.createFromPath(iconPath)
  return img.resize({ width: 18, height: 18 })
}

function sendMenuAction(action: string) {
  mainWindow?.webContents.send('menu:action', action)
}

function buildPetMenu(): Menu {
  const growth = store.get('growth')
  const wallet = store.get('wallet')
  const stageLabel = STAGE_LABELS[growth?.stage ?? 'baby']
  const level = growth?.level ?? 1
  return Menu.buildFromTemplate([
    {
      label: `${stageLabel} · Lv.${level}`,
      enabled: false,
    },
    {
      label: `金币 ${wallet?.gold ?? 0} · 钻石 ${wallet?.diamond ?? 0}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: sleeping ? '叫醒' : '睡一会儿',
      click: () => sendMenuAction(sleeping ? 'wake' : 'sleep'),
    },
    {
      label: '摸摸',
      enabled: !sleeping,
      click: () => sendMenuAction('pet'),
    },
    {
      label: '照料小铺',
      click: () => sendMenuAction('shop'),
    },
    { type: 'separator' },
    {
      label: '导入素材',
      submenu: [
        { label: '选择 ZIP…', click: () => sendMenuAction('import-zip') },
        { label: '选择文件夹…', click: () => sendMenuAction('import-folder') },
        { label: '空白模板', click: () => sendMenuAction('import-blank') },
      ],
    },
    {
      label: panelOpen ? '收起面板' : '打开面板',
      click: () => sendMenuAction('toggle-panel'),
    },
    {
      label: '显示状态',
      click: () => sendMenuAction('show-status'),
    },
    { type: 'separator' },
    {
      label: '退出 PetOS',
      click: () => app.quit(),
    },
  ])
}

function showContextMenu() {
  if (!mainWindow) return
  buildPetMenu().popup({ window: mainWindow })
}

function applyWindowMode(openPanel: boolean) {
  panelOpen = openPanel
  if (!mainWindow) return
  const size = openPanel ? PANEL_SIZE : PET_SIZE
  mainWindow.setResizable(openPanel)
  mainWindow.setMinimumSize(openPanel ? 320 : PET_SIZE.width, openPanel ? 420 : PET_SIZE.height)
  const [x, y] = mainWindow.getPosition()
  mainWindow.setSize(size.width, size.height)
  // keep top-left anchored so pet doesn't jump
  mainWindow.setPosition(x, y)
}

function createWindow() {
  const display = screen.getPrimaryDisplay().workArea
  const x = Math.round(display.x + display.width - PET_SIZE.width - 40)
  const y = Math.round(display.y + display.height - PET_SIZE.height - 40)

  mainWindow = new BrowserWindow({
    width: PET_SIZE.width,
    height: PET_SIZE.height,
    x,
    y,
    minWidth: PET_SIZE.width,
    minHeight: PET_SIZE.height,
    title: 'PetOS · 我的宠物',
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    icon: brandIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.setAlwaysOnTop(true, 'floating')
  if (process.platform === 'darwin') {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createTray() {
  tray = new Tray(trayIcon())
  tray.setToolTip('PetOS · 我的宠物')
  tray.setContextMenu(buildPetMenu())
  tray.on('click', () => {
    if (!mainWindow) return
    if (mainWindow.isVisible()) mainWindow.focus()
    else mainWindow.show()
  })
  tray.on('right-click', () => {
    tray?.setContextMenu(buildPetMenu())
    tray?.popUpContextMenu()
  })
}

async function extractZipToUserData(zipPath: string): Promise<string> {
  const buf = fs.readFileSync(zipPath)
  const zip = await JSZip.loadAsync(buf)
  const names = Object.keys(zip.files)
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
      const ext = path.extname(ent.name).toLowerCase()
      const allowed = ['.json', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.atlas', '.skel', '.mp3', '.ogg', '.wav', '.txt', '.md']
      if (!allowed.includes(ext)) continue
      fs.copyFileSync(from, to)
    }
  }
}

/** 与 src/pack/schema.ts hasSrc 对齐：frames / spine / src 均可 */
function poseHasAsset(p: unknown): boolean {
  if (!p || typeof p !== 'object') return false
  const o = p as Record<string, unknown>
  if (o.type === 'frames') {
    return Array.isArray(o.frames) && o.frames.length > 0 && o.frames.every((x) => typeof x === 'string')
  }
  if (o.type === 'spine') {
    return typeof o.skeleton === 'string' && typeof o.atlas === 'string'
  }
  return typeof o.src === 'string' && !!(o.src as string).trim()
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
    const poses = (data as { poses?: { idle?: unknown } }).poses
    if (!poses || typeof poses !== 'object' || !poseHasAsset(poses.idle)) {
      return { ok: false, error: '缺少可用的 poses.idle（需 src / frames / spine）' }
    }
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

function demoPackSourcePath(): string {
  if (isDev) {
    return path.join(app.getAppPath(), 'packs', 'demo-logo-cat')
  }
  return path.join(process.resourcesPath, 'packs', 'demo-logo-cat')
}

/** 首次无激活包时，把内置示例拷到 userData 并设为当前包 */
function ensureDemoPackActive(): { dir: string; manifest: unknown; name: string } | null {
  const src = demoPackSourcePath()
  if (!fs.existsSync(path.join(src, 'manifest.json'))) return null
  try {
    const dest = copyFolderPack(src)
    const parsed = readManifestSafe(dest)
    if (!parsed.ok) {
      fs.rmSync(dest, { recursive: true, force: true })
      return null
    }
    const name = (parsed.data as { meta: { name: string } }).meta.name
    store.set('activePackPath', dest)
    store.set('activePackName', name)
    return { dir: dest, manifest: parsed.data, name }
  } catch {
    return null
  }
}

function registerIpc() {
  ipcMain.handle('persist:get', () => {
    return {
      needs: store.get('needs'),
      activePackPath: store.get('activePackPath'),
      activePackName: store.get('activePackName'),
      growth: store.get('growth'),
      wallet: store.get('wallet'),
      inventory: store.get('inventory'),
      occupation: store.get('occupation'),
      lastSaved: store.get('lastSaved'),
    }
  })

  ipcMain.handle('persist:setNeeds', (_e, needs: NeedsState) => {
    store.set('needs', needs)
    return true
  })

  ipcMain.handle('persist:setGrowth', (_e, growth: GrowthState) => {
    if (!growth || typeof growth.xp !== 'number') return false
    const stage = growth.stage
    if (!STAGE_LABELS[stage]) return false
    store.set('growth', { xp: Math.max(0, growth.xp), stage, level: growth.level ?? 1 })
    tray?.setContextMenu(buildPetMenu())
    return true
  })

  ipcMain.handle('persist:getGrowth', () => store.get('growth'))

  ipcMain.handle('persist:setWallet', (_e, wallet: WalletState) => {
    if (!wallet || typeof wallet.gold !== 'number') return false
    store.set('wallet', {
      gold: Math.max(0, Math.floor(wallet.gold)),
      diamond: Math.max(0, Math.floor(wallet.diamond)),
      tide: Math.max(0, Math.floor(wallet.tide)),
    })
    return true
  })

  ipcMain.handle('persist:getWallet', () => store.get('wallet'))

  ipcMain.handle('persist:setInventory', (_e, inventory: InventoryItem[]) => {
    if (!Array.isArray(inventory)) return false
    store.set('inventory', inventory)
    return true
  })

  ipcMain.handle('persist:getInventory', () => store.get('inventory'))

  ipcMain.handle('persist:setOccupation', (_e, occupation: OccupationState) => {
    store.set('occupation', occupation)
    return true
  })

  ipcMain.handle('persist:getOccupation', () => store.get('occupation'))

  ipcMain.handle('persist:setPluginData', (_e, pluginId: string, data: Record<string, unknown>) => {
    const plugins = store.get('plugins')
    plugins[pluginId] = data
    store.set('plugins', plugins)
    return true
  })

  ipcMain.handle('persist:getPluginData', (_e, pluginId: string) => {
    const plugins = store.get('plugins')
    return plugins[pluginId] ?? {}
  })

  ipcMain.handle('persist:save', () => {
    store.set('lastSaved', Date.now())
    return true
  })

  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window:close', () => {
    mainWindow?.close()
  })

  ipcMain.handle('window:showContextMenu', () => {
    showContextMenu()
    return true
  })

  ipcMain.on('window:move-offset', (e, mouseX: number, mouseY: number) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return
    const point = screen.getCursorScreenPoint()
    win.setPosition(Math.round(point.x - mouseX), Math.round(point.y - mouseY))
  })

  ipcMain.handle('window:setPanelOpen', (_e, open: boolean) => {
    applyWindowMode(!!open)
    tray?.setContextMenu(buildPetMenu())
    return panelOpen
  })

  ipcMain.handle('window:getPanelOpen', () => panelOpen)

  ipcMain.handle('pet:setSleeping', (_e, value: boolean) => {
    sleeping = !!value
    tray?.setContextMenu(buildPetMenu())
    return sleeping
  })

  ipcMain.handle('pack:getBlankTemplatePath', () => {
    if (isDev) {
      return path.join(app.getAppPath(), 'templates', 'blank-pack')
    }
    return path.join(process.resourcesPath, 'templates', 'blank-pack')
  })

  ipcMain.handle('pack:getDemoPackPath', () => {
    return demoPackSourcePath()
  })

  ipcMain.handle('pack:loadActive', async () => {
    let packPath = store.get('activePackPath')
    if (!packPath || !fs.existsSync(path.join(packPath, 'manifest.json'))) {
      const demo = ensureDemoPackActive()
      if (demo) {
        return { pack: demo, error: null }
      }
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
    const root = path.normalize(packDir + path.sep)
    const full = path.normalize(path.join(packDir, relSrc))
    if (!full.startsWith(root) && full !== path.normalize(packDir)) return null
    if (!fs.existsSync(full)) return null
    // petos://pack/<abs-path> — privileged scheme; works from Vite http origin
    return `petos://pack${pathToFileURL(full).pathname}`
  })
}

function mimeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    case '.svg':
      return 'image/svg+xml'
    case '.json':
      return 'application/json'
    case '.atlas':
      return 'text/plain'
    default:
      return 'application/octet-stream'
  }
}

function registerPetosProtocol() {
  protocol.handle('petos', (request) => {
    try {
      const u = new URL(request.url)
      if (u.hostname !== 'pack') {
        return new Response('Bad Host', { status: 400 })
      }
      // pathname is absolute POSIX form from pathToFileURL (e.g. /Users/...)
      const filePath = fileURLToPath(new URL(u.pathname, 'file://'))
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return new Response('Not Found', { status: 404 })
      }
      const data = fs.readFileSync(filePath)
      return new Response(data, {
        status: 200,
        headers: {
          'Content-Type': mimeFor(filePath),
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
      })
    } catch {
      return new Response('Bad Request', { status: 400 })
    }
  })
}

app.whenReady().then(() => {
  registerPetosProtocol()
  registerIpc()
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  tray?.destroy()
  tray = null
})
