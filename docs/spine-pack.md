# Spine 素材包约定（PetOS）

目标：做出生动的骨骼动态（呼吸、眨眼、吃、睡），同时 **不使用 SWF/Flash**。

## 状态

| 能力 | 状态 |
|---|---|
| `type: "frames"` 帧序列 | M1 已完整 |
| 动画 WebP / 静图 PNG | M1 已完整 |
| `type: "spine"` | M1 已接入 `@esotericsoftware/spine-player` 脚手架；失败自动回退帧/静图 |
| 编辑器导出校验 UI / 多皮肤热切 | TODO(M2) |

## 目录布局（建议）

```
my-pack/
  manifest.json
  spine/
    pet.json      # Spine 骨骼+动画
    pet.atlas     # 图集描述
    pet.png       # 贴图（或 atlas 内引用的同名图）
  idle/           # 可选：帧序列回退
    f0.png
```

## manifest 片段

```json
"idle": {
  "type": "spine",
  "skeleton": "spine/pet.json",
  "atlas": "spine/pet.atlas",
  "texture": "spine/pet.png",
  "animation": "idle",
  "loop": true,
  "skin": "default"
}
```

交互姿态可将 `animation` 设为 `pet` / `eat` / `sleep` 等与 Spine 工程内动画名一致的名字。

## 导出注意

- 推荐 Spine 4.2+，与运行时主版本对齐（当前依赖 4.x player）。
- 预乘 Alpha（PMA）导出；透明底。
- 动画命名与 manifest 一致，避免运行时找不到 clip。
- 包内仍禁止可执行脚本；仅 JSON + atlas + 图片。

## 回退策略

Spine 加载失败 → 同名姿态的 frames/image → idle 帧序列 → 占位宠。应用不得因缺 Spine 资源卡死。
