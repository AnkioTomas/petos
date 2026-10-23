# 空白素材包模板（PetOS）

立绘运行时：**PNG / WebP 帧序列**、**动画 WebP**、或 **Spine**。禁止 SWF / Flash。

## 最少要求

1. 根目录 `manifest.json`，`"schema": 1`
2. `meta.name`
3. `poses.idle`：任选一种类型

## 姿态类型

### 1) 帧序列（推荐，M1 已完整支持）

```json
"idle": {
  "type": "frames",
  "frames": ["idle/f0.png", "idle/f1.png", "idle/f2.png"],
  "fps": 12,
  "loop": true
}
```

### 2) 单图 / 动画 WebP

```json
"pet": { "type": "webp", "src": "pet.webp", "ms": 900 }
```

或省略 type：`{ "src": "idle.png" }`

### 3) Spine（QQ 宠级动态，质量路径）

```json
"idle": {
  "type": "spine",
  "skeleton": "spine/pet.json",
  "atlas": "spine/pet.atlas",
  "texture": "spine/pet.png",
  "animation": "idle",
  "loop": true
}
```

目录说明见仓库 `docs/spine-pack.md`。

## 可选姿态名

`pet` / `eat` / `sleep` / `sad` / `hunger` / `play`  
缺了会回退 idle，并加 CSS 弹跳/变暗。

## 安全

只允许图片、atlas、声明式 JSON。不要放可执行脚本。
