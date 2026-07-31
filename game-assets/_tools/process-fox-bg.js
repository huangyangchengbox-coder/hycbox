/**
 * 灵狐立绘：从边缘洪水填充抠除纯黑底，保留体内深色描边与金光边缘。
 * 原地覆盖 game-assets/xian/helper/fox/fox_00..03.png
 */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const FOX_DIR = path.resolve(__dirname, '..', 'xian', 'helper', 'fox')
const FILES = ['fox_00.png', 'fox_01.png', 'fox_02.png', 'fox_03.png']
/** 近黑判定：max(r,g,b) 低于此值视为可抠背景 */
const BLACK_MAX = 26
/** 低于此值完全透明；其间做软边，减轻金光锯齿 */
const HARD_CLEAR = 10

function isNearBlack(r, g, b) {
  return Math.max(r, g, b) < BLACK_MAX
}

async function punchBlackBg(filePath) {
  const img = sharp(filePath).ensureAlpha()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const h = info.height
  const n = w * h
  const visited = new Uint8Array(n)
  const stack = []

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const p = y * w + x
    if (visited[p]) return
    visited[p] = 1
    stack.push(p)
  }

  for (let x = 0; x < w; x++) {
    push(x, 0)
    push(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    push(0, y)
    push(w - 1, y)
  }

  let cleared = 0
  while (stack.length) {
    const p = stack.pop()
    const i = p * 4
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (!isNearBlack(r, g, b)) continue
    const m = Math.max(r, g, b)
    if (m <= HARD_CLEAR) {
      data[i + 3] = 0
    } else {
      // 软边：略亮的近黑留给金光晕边
      data[i + 3] = Math.round(255 * (m - HARD_CLEAR) / (BLACK_MAX - HARD_CLEAR))
    }
    cleared++
    const x = p % w
    const y = (p / w) | 0
    push(x - 1, y)
    push(x + 1, y)
    push(x, y - 1)
    push(x, y + 1)
  }

  const out = filePath
  await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toFile(out + '.tmp')
  fs.renameSync(out + '.tmp', out)
  return { w, h, cleared }
}

async function main() {
  for (const name of FILES) {
    const fp = path.join(FOX_DIR, name)
    if (!fs.existsSync(fp)) {
      console.warn('missing', fp)
      continue
    }
    const r = await punchBlackBg(fp)
    console.log('ok', name, r.w + 'x' + r.h, 'cleared=' + r.cleared)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
