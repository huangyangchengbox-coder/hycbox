/**
 * 自研 Canvas = 不用 Lottie/第三方动画库，自己用 2d 上下文每帧画图。
 * 对比用：和「像素精灵图」比，这里全是代码画出来的。
 */

function destroy(handle) {
  if (!handle) return
  handle._alive = false
  if (handle._timer) {
    clearTimeout(handle._timer)
    handle._timer = null
  }
  if (handle._raf && handle.canvas && handle.canvas.cancelAnimationFrame) {
    try {
      handle.canvas.cancelAnimationFrame(handle._raf)
    } catch (e) {}
  }
}

/**
 * @param {Object} canvas type=2d 节点
 * @param {number} cssW
 * @param {number} cssH
 */
function play(canvas, cssW, cssH) {
  const handle = { _alive: true, canvas: canvas, _raf: 0, _timer: null }
  const sys = typeof wx !== 'undefined' ? wx.getSystemInfoSync() : { pixelRatio: 2 }
  const dpr = Math.min(2, sys.pixelRatio || 2)
  const w = Math.max(160, cssW || 300)
  const h = Math.max(160, cssH || 300)
  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)

  const cx = w * 0.5
  let t0 = Date.now()

  function roundRect(x, y, rw, rh, r) {
    const rr = Math.min(r, rw / 2, rh / 2)
    ctx.beginPath()
    ctx.moveTo(x + rr, y)
    ctx.arcTo(x + rw, y, x + rw, y + rh, rr)
    ctx.arcTo(x + rw, y + rh, x, y + rh, rr)
    ctx.arcTo(x, y + rh, x, y, rr)
    ctx.arcTo(x, y, x + rw, y, rr)
    ctx.closePath()
  }

  function draw() {
    if (!handle._alive) return
    const t = (Date.now() - t0) / 1000
    const bob = Math.sin(t * 2.1) * 10
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.4)
    const cy = h * 0.48 + bob

    ctx.clearRect(0, 0, w, h)

    // 夜空底
    const sky = ctx.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#0b1f14')
    sky.addColorStop(0.55, '#14532d')
    sky.addColorStop(1, '#166534')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)

    // 地面格
    ctx.fillStyle = '#15803d'
    ctx.fillRect(0, h * 0.72, w, h * 0.28)
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    for (let gx = 0; gx < w; gx += 18) {
      for (let gy = Math.floor(h * 0.72); gy < h; gy += 18) {
        if (((gx / 18) + (gy / 18)) % 2 === 0) ctx.fillRect(gx, gy, 18, 18)
      }
    }

    // 光晕
    const glowR = 70 + pulse * 28
    const grd = ctx.createRadialGradient(cx, cy, 8, cx, cy, glowR)
    grd.addColorStop(0, 'rgba(134,239,172,' + (0.55 + pulse * 0.25) + ')')
    grd.addColorStop(1, 'rgba(74,222,128,0)')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2)
    ctx.fill()

    // 瓶影
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.ellipse(cx, h * 0.72, 48, 10, 0, 0, Math.PI * 2)
    ctx.fill()

    // 瓶肚
    ctx.fillStyle = '#4ade80'
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'
    ctx.lineWidth = 2
    roundRect(cx - 40, cy - 8, 80, 100, 12)
    ctx.fill()
    ctx.stroke()

    // 瓶颈 / 口
    ctx.fillStyle = '#86efac'
    roundRect(cx - 13, cy - 48, 26, 44, 3)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#bbf7d0'
    roundRect(cx - 20, cy - 62, 40, 14, 3)
    ctx.fill()
    ctx.stroke()

    // 瓶中液滴（脉冲）
    const drop = 6 + pulse * 5
    ctx.fillStyle = '#166534'
    ctx.beginPath()
    ctx.arc(cx, cy + 40, drop, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(187,247,208,0.8)'
    ctx.beginPath()
    ctx.arc(cx - 2, cy + 37, drop * 0.35, 0, Math.PI * 2)
    ctx.fill()

    // 高光条
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    roundRect(cx - 26, cy + 4, 9, 50, 3)
    ctx.fill()

    // 飞升光点
    for (let i = 0; i < 5; i++) {
      const a = t * 1.6 + i * 1.2
      const sx = cx + Math.cos(a) * (55 + i * 8)
      const sy = cy - 20 + Math.sin(a * 1.3) * 35 - i * 6
      ctx.fillStyle = 'rgba(220,252,231,' + (0.5 + 0.5 * Math.sin(a)) + ')'
      ctx.fillRect(sx, sy, 8, 8)
    }

    // 角标
    ctx.fillStyle = 'rgba(15,23,42,0.82)'
    roundRect(10, 10, 118, 26, 4)
    ctx.fill()
    ctx.fillStyle = '#fde68a'
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('自研 Canvas', 18, 28)

    ctx.fillStyle = 'rgba(15,23,42,0.75)'
    roundRect(cx - 72, h * 0.78, 144, 26, 4)
    ctx.fill()
    ctx.fillStyle = '#ecfdf5'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('代码每帧重绘 · 掌天瓶', cx, h * 0.78 + 17)

    const tick = function () {
      if (!handle._alive) return
      draw()
    }
    if (canvas.requestAnimationFrame) {
      handle._raf = canvas.requestAnimationFrame(tick)
    } else {
      handle._timer = setTimeout(tick, 33)
    }
  }

  draw()
  return {
    destroy: function () {
      destroy(handle)
    }
  }
}

module.exports = {
  play: play,
  destroy: destroy
}
