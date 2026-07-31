/**
 * 修复 mob *_w0.png：原先把四连帧整图 contain 进 512，走动时显示成四个小怪。
 * 从内容区裁出左侧单帧，透明底铺成正方形后覆盖原文件。
 */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const OUT = path.resolve(__dirname, '..', 'xian', 'mobs')
const KEYS = ['walker', 'sprinter', 'spitter', 'brute', 'wraith', 'screamer']
const SIZE = 512

async function extractLeftFrame(input, output) {
  const img = sharp(input).ensureAlpha()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const h = info.height

  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (data[i + 3] > 20 && data[i] + data[i + 1] + data[i + 2] > 40) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX <= minX || maxY <= minY) {
    throw new Error('no content: ' + input)
  }

  const bw = maxX - minX + 1
  const bh = maxY - minY + 1
  const ratio = bw / bh
  // 横条多帧（制作时均为 4 连帧）：等分取左起第一帧
  let cellW = bw
  let frames = 1
  if (ratio >= 1.6) {
    frames = 4
    cellW = Math.floor(bw / frames)
  }

  const left = minX
  const top = minY
  const cropW = Math.min(cellW, bw)
  const cropH = bh

  await sharp(input)
    .extract({ left, top, width: cropW, height: cropH })
    .resize(SIZE, SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(output + '.tmp')
  fs.renameSync(output + '.tmp', output)
  return { bw, bh, frames, cropW, cropH, ratio: ratio.toFixed(2) }
}

async function main() {
  for (const key of KEYS) {
    const fp = path.join(OUT, key + '_w0.png')
    if (!fs.existsSync(fp)) {
      console.warn('missing', fp)
      continue
    }
    const r = await extractLeftFrame(fp, fp)
    console.log('ok', key, r)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
