import { useCallback, useState, type DragEvent } from 'react'
import type { LoadedPack } from '../pack/schema'
import { hydratePack } from '../pack/loader'

type Props = {
  pack: LoadedPack | null
  onPackChange: (pack: LoadedPack | null) => void
}

export function ImportPanel({ pack, onPackChange }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const applyResult = useCallback(
    async (result: { ok?: boolean; cancelled?: boolean; error?: string; pack?: { dir: string; manifest: unknown; name: string } }) => {
      if (result.cancelled) return
      if (!result.ok || !result.pack) {
        setError(result.error || '导入失败')
        return
      }
      const loaded = await hydratePack(result.pack.dir, result.pack.manifest, result.pack.name)
      if (!loaded) {
        setError('素材包无效：无法加载 idle（需 frames / PNG·WebP / Spine）')
        return
      }
      setError(null)
      onPackChange(loaded)
    },
    [onPackChange],
  )

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await applyResult((await fn()) as Parameters<typeof applyResult>[0])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onDrop = async (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const filePath = window.pet.getPathForFile(file)
    if (!filePath.toLowerCase().endsWith('.zip')) {
      setError('请拖入 .zip 素材包（内含 manifest.json + PNG/WebP）')
      return
    }
    await run(() => window.pet.importDroppedZip(filePath))
  }

  return (
    <div className="import-panel">
      <div className="pack-status">
        {pack ? (
          <>
            <span className="pack-name">当前皮囊：{pack.name}</span>
            <button
              type="button"
              className="linkish"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await window.pet.clearPack()
                  onPackChange(null)
                  return { ok: true, cancelled: true }
                })
              }
            >
              卸下
            </button>
          </>
        ) : (
          <span className="pack-name muted">当前：占位宠（未导入素材包）</span>
        )}
      </div>

      <div
        className={`dropzone ${dragOver ? 'over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        拖入 ZIP 素材包到此处
        <span className="hint">manifest + 帧序列/WebP/Spine · 无 Flash/SWF</span>
      </div>

      <div className="import-actions">
        <button type="button" disabled={busy} onClick={() => run(() => window.pet.choosePackZip())}>
          选择 ZIP
        </button>
        <button type="button" disabled={busy} onClick={() => run(() => window.pet.choosePackFolder())}>
          选择文件夹
        </button>
        <button type="button" disabled={busy} onClick={() => run(() => window.pet.importBlankTemplate())}>
          导入空白模板
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
