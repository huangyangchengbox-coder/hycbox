/**
 * 处理怪物走路帧：近黑变透明，输出到 game-assets/xian/mobs/
 */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const ASSETS = path.resolve('C:/Users/E14/.cursor/projects/d-AI-hycBox/assets')
const OUT = path.resolve(__dirname, '..', 'xian', 'mobs')

const JOBS = [
  { key: 'walker', w0: 'walker_walk_sheet.png', w1: 'walker_w1.png' },
  { key: 'sprinter', w0: 'sprinter_walk_sheet.png', w1: 'sprinter_w1.png' },
  { key: 'spitter', w0: 'spitter_walk_sheet.png', w1: 'spitter_w1.png' },
  { key: 'brute', w0: 'brute_walk_sheet.png', w1: 'brute_w1.png' },
  { key: 'wraith', w0: 'wraith_walk_sheet.png', w1: 'wraith_w1.png' },
  { key: 'screamer', w0: 'screamer_walk_sheet.png', w1: 'screamer_w1.png' }
]

async function toTransparentPng(input, output, size) {
  const img = sharp(input).ensureAlpha()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    // 近黑底抠除
    if (r < 22 && g < 22 && b < 22) data[i + 3] = 0
  }
  let pipeline = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  if (size) pipeline = pipeline.resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  await pipeline.png().toFile(output)
}

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  for (const job of JOBS) {
    const src0 = path.join(ASSETS, job.w0)
    const src1 = path.join(ASSETS, job.w1)
    const out0 = path.join(OUT, job.key + '_w0.png')
    const out1 = path.join(OUT, job.key + '_w1.png')
    if (!fs.existsSync(src0) || !fs.existsSync(src1)) {
      console.warn('missing', job.key, src0, src1)
      continue
    }
    await toTransparentPng(src0, out0, 512)
    await toTransparentPng(src1, out1, 512)
    console.log('ok', job.key)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
