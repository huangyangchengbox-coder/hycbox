/**
 * 生成仙途 Demo 像素精灵 PNG（无第三方依赖）
 * node scripts/gen-pixel-sprites.js
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const OUT = path.join(__dirname, '../assets/xian/sprites')

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function writePng(file, w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4
      const di = y * (w * 4 + 1) + 1 + x * 4
      raw[di] = rgba[si]
      raw[di + 1] = rgba[si + 1]
      raw[di + 2] = rgba[si + 2]
      raw[di + 3] = rgba[si + 3]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ])
  fs.writeFileSync(file, png)
}

function px(buf, w, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= w) return
  const i = (y * w + x) * 4
  buf[i] = r
  buf[i + 1] = g
  buf[i + 2] = b
  buf[i + 3] = a == null ? 255 : a
}

function fillRect(buf, w, x, y, rw, rh, r, g, b, a) {
  for (let j = 0; j < rh; j++) {
    for (let i = 0; i < rw; i++) px(buf, w, x + i, y + j, r, g, b, a)
  }
}

function makeTree() {
  const w = 32
  const h = 48
  const buf = Buffer.alloc(w * h * 4)
  // leaves
  fillRect(buf, w, 4, 2, 24, 10, 34, 197, 94)
  fillRect(buf, w, 6, 10, 20, 10, 22, 163, 74)
  fillRect(buf, w, 8, 18, 16, 8, 21, 128, 61)
  // trunk
  fillRect(buf, w, 13, 26, 6, 20, 120, 72, 30)
  fillRect(buf, w, 14, 26, 2, 20, 146, 96, 48)
  writePng(path.join(OUT, 'tree.png'), w, h, buf)
}

function makeHouse() {
  const w = 48
  const h = 40
  const buf = Buffer.alloc(w * h * 4)
  // roof
  fillRect(buf, w, 2, 2, 44, 10, 185, 28, 28)
  fillRect(buf, w, 4, 0, 40, 4, 220, 38, 38)
  // wall
  fillRect(buf, w, 6, 12, 36, 26, 214, 163, 90)
  fillRect(buf, w, 8, 14, 8, 8, 125, 211, 252) // window L
  fillRect(buf, w, 32, 14, 8, 8, 125, 211, 252) // window R
  fillRect(buf, w, 20, 22, 8, 16, 92, 58, 30) // door
  px(buf, w, 26, 30, 250, 204, 21) // knob
  writePng(path.join(OUT, 'house.png'), w, h, buf)
}

function makeSteve() {
  const w = 16
  const h = 32
  const buf = Buffer.alloc(w * h * 4)
  fillRect(buf, w, 4, 0, 8, 8, 224, 160, 96) // head
  px(buf, w, 6, 3, 15, 23, 42)
  px(buf, w, 9, 3, 15, 23, 42)
  fillRect(buf, w, 4, 8, 8, 12, 37, 99, 235) // body
  fillRect(buf, w, 1, 8, 3, 10, 224, 160, 96) // arm L
  fillRect(buf, w, 12, 8, 3, 10, 224, 160, 96) // arm R
  fillRect(buf, w, 4, 20, 3, 12, 30, 58, 95) // leg L
  fillRect(buf, w, 9, 20, 3, 12, 30, 58, 95) // leg R
  writePng(path.join(OUT, 'steve.png'), w, h, buf)
}

function makeCloud() {
  const w = 40
  const h = 16
  const buf = Buffer.alloc(w * h * 4)
  fillRect(buf, w, 4, 6, 28, 6, 255, 255, 255)
  fillRect(buf, w, 10, 2, 16, 6, 255, 255, 255)
  fillRect(buf, w, 2, 8, 10, 4, 241, 245, 249)
  writePng(path.join(OUT, 'cloud.png'), w, h, buf)
}

function makeGrassTile() {
  const w = 16
  const h = 16
  const buf = Buffer.alloc(w * h * 4)
  fillRect(buf, w, 0, 0, 16, 16, 92, 138, 58)
  fillRect(buf, w, 0, 0, 16, 4, 74, 222, 128)
  for (let i = 0; i < 16; i += 4) {
    fillRect(buf, w, i, 4, 2, 2, 34, 197, 94)
  }
  writePng(path.join(OUT, 'grass.png'), w, h, buf)
}

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
makeTree()
makeHouse()
makeSteve()
makeCloud()
makeGrassTile()
console.log('sprites written to', OUT)
