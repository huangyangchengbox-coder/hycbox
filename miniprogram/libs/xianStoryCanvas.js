/**
 * 仙途 · 自研 Canvas 剧情场景引擎
 * 按 scene + fx 每帧绘制；不依赖 Lottie / 贴图精灵。
 *
 * scene: village | cliff | bottle | meditate | spar | spirit | boss | battle | ink
 * fx: mist | walk | climb | glow | pulse | slash | spar | spirit | quake
 */

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function drawPerson(ctx, x, y, scale, opts) {
  opts = opts || {}
  const s = scale || 1
  const head = opts.head || '#e0a060'
  const body = opts.body || '#2563eb'
  const leg = opts.leg || '#1e3a5f'
  const bob = opts.bob || 0
  const yy = y + bob
  ctx.fillStyle = head
  ctx.fillRect(x, yy, 14 * s, 14 * s)
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(x + 3 * s, yy + 5 * s, 2 * s, 3 * s)
  ctx.fillRect(x + 9 * s, yy + 5 * s, 2 * s, 3 * s)
  ctx.fillStyle = body
  ctx.fillRect(x, yy + 14 * s, 14 * s, 16 * s)
  ctx.fillStyle = head
  ctx.fillRect(x - 5 * s, yy + 14 * s, 5 * s, 12 * s)
  ctx.fillRect(x + 14 * s, yy + 14 * s, 5 * s, 12 * s)
  ctx.fillStyle = leg
  ctx.fillRect(x + 1 * s, yy + 30 * s, 5 * s, 10 * s)
  ctx.fillRect(x + 8 * s, yy + 30 * s, 5 * s, 10 * s)
}

function drawLabel(ctx, text, x, y) {
  ctx.font = '11px sans-serif'
  const tw = ctx.measureText(text).width + 10
  ctx.fillStyle = 'rgba(15,23,42,0.78)'
  roundRect(ctx, x - tw / 2, y, tw, 18, 3)
  ctx.fill()
  ctx.fillStyle = '#f8fafc'
  ctx.textAlign = 'center'
  ctx.fillText(text, x, y + 13)
}

function skyFor(scene, h, w, ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  if (scene === 'cliff') {
    g.addColorStop(0, '#7dd3fc')
    g.addColorStop(0.45, '#38bdf8')
    g.addColorStop(0.45, '#9ca3af')
    g.addColorStop(1, '#57534e')
  } else if (scene === 'bottle' || scene === 'spirit') {
    g.addColorStop(0, '#052e16')
    g.addColorStop(0.5, '#14532d')
    g.addColorStop(1, '#166534')
  } else if (scene === 'meditate') {
    g.addColorStop(0, '#0f172a')
    g.addColorStop(0.5, '#1e293b')
    g.addColorStop(1, '#334155')
  } else if (scene === 'boss') {
    g.addColorStop(0, '#450a0a')
    g.addColorStop(0.5, '#1c1917')
    g.addColorStop(1, '#7f1d1d')
  } else if (scene === 'spar' || scene === 'battle') {
    g.addColorStop(0, '#1e3a5f')
    g.addColorStop(0.4, '#334155')
    g.addColorStop(0.4, '#3f6212')
    g.addColorStop(1, '#365314')
  } else {
    g.addColorStop(0, '#93c5fd')
    g.addColorStop(0.42, '#bfdbfe')
    g.addColorStop(0.42, '#4ade80')
    g.addColorStop(0.72, '#22c55e')
    g.addColorStop(0.72, '#854d0e')
    g.addColorStop(1, '#713f12')
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function drawChecker(ctx, y0, w, h, c1, c2, size) {
  const s = size || 16
  for (let y = y0; y < h; y += s) {
    for (let x = 0; x < w; x += s) {
      ctx.fillStyle = ((x / s + y / s) | 0) % 2 === 0 ? c1 : c2
      ctx.fillRect(x, y, s, s)
    }
  }
}

function drawTree(ctx, x, y, scale) {
  const s = scale || 1
  ctx.fillStyle = '#7c4a1e'
  ctx.fillRect(x + 10 * s, y + 28 * s, 10 * s, 28 * s)
  ctx.fillStyle = '#22c55e'
  ctx.fillRect(x, y, 30 * s, 22 * s)
  ctx.fillStyle = '#16a34a'
  ctx.fillRect(x + 4 * s, y + 16 * s, 22 * s, 16 * s)
}

function drawHouse(ctx, x, y, scale) {
  const s = scale || 1
  ctx.fillStyle = '#b91c1c'
  ctx.fillRect(x - 4 * s, y, 56 * s, 12 * s)
  ctx.fillStyle = '#d6a35a'
  ctx.fillRect(x, y + 12 * s, 48 * s, 32 * s)
  ctx.fillStyle = '#7dd3fc'
  ctx.fillRect(x + 6 * s, y + 18 * s, 10 * s, 10 * s)
  ctx.fillRect(x + 32 * s, y + 18 * s, 10 * s, 10 * s)
  ctx.fillStyle = '#5c3a1e'
  ctx.fillRect(x + 18 * s, y + 26 * s, 12 * s, 18 * s)
}

/** —— 各场景 —— */
function paintVillage(ctx, w, h, t, fx) {
  skyFor('village', h, w, ctx)
  drawChecker(ctx, h * 0.7, w, h, '#4ade80', '#22c55e', 18)
  // clouds
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  const cx = ((t * 20) % (w + 40)) - 20
  ctx.fillRect(cx, 18, 36, 10)
  ctx.fillRect(cx + 10, 12, 28, 10)
  ctx.fillRect(cx + 80, 28, 40, 10)
  drawTree(ctx, 24, h * 0.42, 1.4)
  drawTree(ctx, w - 70, h * 0.4, 1.6)
  drawHouse(ctx, w * 0.38, h * 0.48, 1.5)
  const walk = fx === 'walk' ? Math.sin(t * 4) * 18 : 0
  const bob = Math.sin(t * 3) * 3
  drawPerson(ctx, w * 0.22 + walk, h * 0.55 + bob, 1.6, { bob: 0 })
  drawLabel(ctx, '小村', w * 0.5, h * 0.88)
  if (fx === 'glow' || fx === 'mist') {
    ctx.fillStyle = 'rgba(253,230,138,' + (0.08 + 0.08 * Math.sin(t * 2)) + ')'
    ctx.fillRect(0, 0, w, h)
  }
}

function paintCliff(ctx, w, h, t, fx) {
  skyFor('cliff', h, w, ctx)
  // steps
  const steps = [
    [w * 0.35, h * 0.75, w * 0.65, h * 0.25],
    [w * 0.45, h * 0.6, w * 0.55, h * 0.16],
    [w * 0.55, h * 0.48, w * 0.45, h * 0.14],
    [w * 0.65, h * 0.36, w * 0.35, h * 0.12],
    [w * 0.75, h * 0.26, w * 0.25, h * 0.1]
  ]
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]
    ctx.fillStyle = i % 2 ? '#a8a29e' : '#78716c'
    ctx.fillRect(s[0], s[1], s[2], s[3])
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.strokeRect(s[0], s[1], s[2], s[3])
  }
  // bamboo
  ctx.fillStyle = '#16a34a'
  const sway = Math.sin(t * 2) * 3
  ctx.fillRect(18 + sway, h * 0.35, 8, h * 0.45)
  ctx.fillRect(36 - sway, h * 0.28, 8, h * 0.52)
  ctx.fillStyle = '#4ade80'
  ctx.fillRect(24 + sway, h * 0.32, 22, 8)
  // climber
  const climbY = fx === 'climb' ? h * 0.55 - (Math.sin(t * 2) * 0.5 + 0.5) * h * 0.22 : h * 0.42
  drawPerson(ctx, w * 0.48, climbY, 1.5, { body: '#2563eb' })
  drawLabel(ctx, '炼骨崖', w * 0.72, h * 0.88)
  if (fx === 'slash') {
    ctx.strokeStyle = '#fde68a'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(w * 0.2, h * 0.35)
    ctx.lineTo(w * 0.8, h * 0.55)
    ctx.stroke()
  }
}

function paintBottle(ctx, w, h, t, fx) {
  skyFor('bottle', h, w, ctx)
  drawChecker(ctx, h * 0.72, w, h, '#166534', '#15803d', 16)
  const bob = Math.sin(t * 2.1) * 8
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.4)
  const cx = w * 0.5
  const cy = h * 0.42 + bob
  const glowR = 55 + pulse * 22
  const grd = ctx.createRadialGradient(cx, cy, 6, cx, cy, glowR)
  grd.addColorStop(0, 'rgba(134,239,172,' + (0.5 + pulse * 0.3) + ')')
  grd.addColorStop(1, 'rgba(74,222,128,0)')
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.arc(cx, cy, glowR, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#4ade80'
  roundRect(ctx, cx - 32, cy - 6, 64, 86, 10)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.stroke()
  ctx.fillStyle = '#86efac'
  roundRect(ctx, cx - 11, cy - 42, 22, 38, 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#bbf7d0'
  roundRect(ctx, cx - 16, cy - 54, 32, 12, 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#166534'
  ctx.beginPath()
  ctx.arc(cx, cy + 36, 5 + pulse * 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  roundRect(ctx, cx - 20, cy + 4, 8, 42, 2)
  ctx.fill()
  for (let i = 0; i < 4; i++) {
    const a = t * 1.8 + i
    ctx.fillStyle = '#dcfce7'
    ctx.fillRect(cx + Math.cos(a) * 50, cy - 10 + Math.sin(a * 1.2) * 28, 7, 7)
  }
  if (fx === 'quake') {
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(0, 0, w, h)
  }
  drawLabel(ctx, '掌天瓶', cx, h * 0.88)
}

function paintMeditate(ctx, w, h, t, fx) {
  skyFor('meditate', h, w, ctx)
  drawChecker(ctx, h * 0.7, w, h, '#334155', '#1e293b', 16)
  // moon
  ctx.fillStyle = '#fef08a'
  ctx.beginPath()
  ctx.arc(w * 0.78, h * 0.18, 22, 0, Math.PI * 2)
  ctx.fill()
  const pulse = 0.5 + 0.5 * Math.sin(t * 2)
  const cx = w * 0.5
  const cy = h * 0.5
  const grd = ctx.createRadialGradient(cx, cy, 10, cx, cy, 70 + pulse * 20)
  grd.addColorStop(0, 'rgba(125,211,252,' + (0.35 + pulse * 0.25) + ')')
  grd.addColorStop(1, 'rgba(125,211,252,0)')
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.arc(cx, cy, 70 + pulse * 20, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#4c1d95'
  roundRect(ctx, cx - 36, h * 0.62, 72, 14, 4)
  ctx.fill()
  drawPerson(ctx, cx - 11, h * 0.48, 1.5, { body: '#64748b', bob: Math.sin(t) * 2 })
  drawLabel(ctx, '打坐', cx, h * 0.88)
  if (fx === 'spirit' || fx === 'pulse') {
    ctx.strokeStyle = 'rgba(125,211,252,0.6)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, 40 + pulse * 25, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function paintSpar(ctx, w, h, t, fx) {
  skyFor('spar', h, w, ctx)
  drawChecker(ctx, h * 0.68, w, h, '#4d7c0f', '#365314', 16)
  // arena
  ctx.fillStyle = '#a8a29e'
  roundRect(ctx, w * 0.15, h * 0.55, w * 0.7, h * 0.18, 6)
  ctx.fill()
  const bob = Math.sin(t * 5) * 4
  drawPerson(ctx, w * 0.28, h * 0.42 + bob, 1.7, { body: '#2563eb' })
  drawPerson(ctx, w * 0.58, h * 0.42 - bob, 1.7, {
    head: '#65a30d',
    body: '#3f6212',
    leg: '#1a2e05'
  })
  drawLabel(ctx, '你', w * 0.32, h * 0.78)
  drawLabel(ctx, '对手', w * 0.62, h * 0.78)
  if (fx === 'slash' || fx === 'spar') {
    const flash = (Math.sin(t * 12) > 0.3)
    if (flash) {
      ctx.strokeStyle = '#fde68a'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(w * 0.3, h * 0.4)
      ctx.lineTo(w * 0.7, h * 0.55)
      ctx.stroke()
    }
  }
  // sword
  ctx.fillStyle = '#cbd5e1'
  ctx.save()
  ctx.translate(w * 0.5, h * 0.38)
  ctx.rotate(-0.4 + Math.sin(t * 6) * 0.2)
  ctx.fillRect(-3, -40, 6, 50)
  ctx.fillStyle = '#ca8a04'
  ctx.fillRect(-10, 8, 20, 5)
  ctx.restore()
}

function paintSpirit(ctx, w, h, t, fx) {
  skyFor('spirit', h, w, ctx)
  // creek
  ctx.fillStyle = '#0ea5e9'
  ctx.fillRect(0, h * 0.62, w, 18)
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  const wx = ((t * 40) % (w + 30)) - 15
  ctx.fillRect(wx, h * 0.64, 40, 6)
  drawChecker(ctx, h * 0.7, w, h, '#166534', '#14532d', 16)
  drawTree(ctx, 20, h * 0.38, 1.3)
  drawPerson(ctx, w * 0.35, h * 0.48, 1.5, { body: '#2563eb' })
  // fallen
  ctx.save()
  ctx.translate(w * 0.58, h * 0.58)
  ctx.rotate(1.2)
  drawPerson(ctx, 0, 0, 1.4, { body: '#7f1d1d', head: '#c68642' })
  ctx.restore()
  const pulse = 0.4 + 0.3 * Math.sin(t * 3)
  ctx.fillStyle = 'rgba(248,113,113,' + pulse + ')'
  ctx.beginPath()
  ctx.arc(w * 0.62, h * 0.5, 28, 0, Math.PI * 2)
  ctx.fill()
  drawLabel(ctx, '溪边', w * 0.5, h * 0.88)
}

function paintBoss(ctx, w, h, t, fx) {
  skyFor('boss', h, w, ctx)
  drawChecker(ctx, h * 0.7, w, h, '#44403c', '#292524', 16)
  ctx.fillStyle = 'rgba(248,113,113,' + (0.35 + 0.25 * Math.sin(t * 4)) + ')'
  ctx.fillRect(w * 0.48, 0, 10, h * 0.7)
  drawPerson(ctx, w * 0.2, h * 0.48, 1.6, { body: '#2563eb' })
  // boss
  ctx.fillStyle = '#171717'
  ctx.fillRect(w * 0.52, h * 0.32, 36, 28)
  ctx.fillStyle = '#7f1d1d'
  ctx.fillRect(w * 0.52, h * 0.6, 36, 40)
  ctx.fillStyle = '#ef4444'
  ctx.fillRect(w * 0.56, h * 0.4, 6, 8)
  ctx.fillRect(w * 0.72, h * 0.4, 6, 8)
  if (fx === 'slash') {
    ctx.strokeStyle = '#fde68a'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(w * 0.25, h * 0.4)
    ctx.lineTo(w * 0.75, h * 0.55)
    ctx.stroke()
  }
  drawLabel(ctx, '境主', w * 0.6, h * 0.88)
}

function paintDefault(ctx, w, h, t, fx, scene) {
  skyFor(scene || 'ink', h, w, ctx)
  drawChecker(ctx, h * 0.7, w, h, '#4ade80', '#22c55e', 16)
  drawPerson(ctx, w * 0.42, h * 0.5, 1.6, { bob: Math.sin(t * 2) * 3 })
  drawLabel(ctx, '仙途', w * 0.5, h * 0.88)
}

const PAINTERS = {
  village: paintVillage,
  cliff: paintCliff,
  bottle: paintBottle,
  meditate: paintMeditate,
  spar: paintSpar,
  battle: paintSpar,
  spirit: paintSpirit,
  boss: paintBoss,
  ink: paintDefault
}

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
 * @param {Object} canvas
 * @param {number} cssW
 * @param {number} cssH
 * @param {{ scene?: string, fx?: string, label?: string }} opts
 */
function play(canvas, cssW, cssH, opts) {
  opts = opts || {}
  const handle = {
    _alive: true,
    canvas: canvas,
    _raf: 0,
    _timer: null,
    scene: opts.scene || 'village',
    fx: opts.fx || 'mist',
    label: opts.label || ''
  }
  const sys = typeof wx !== 'undefined' ? wx.getSystemInfoSync() : { pixelRatio: 2 }
  const dpr = Math.min(2, sys.pixelRatio || 2)
  const w = Math.max(200, cssW || 320)
  const h = Math.max(160, cssH || 240)
  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)
  const t0 = Date.now()

  function frame() {
    if (!handle._alive) return
    const t = (Date.now() - t0) / 1000
    ctx.clearRect(0, 0, w, h)
    const painter = PAINTERS[handle.scene] || paintDefault
    painter(ctx, w, h, t, handle.fx, handle.scene)

    // 角标
    ctx.fillStyle = 'rgba(15,23,42,0.82)'
    roundRect(ctx, 8, 8, 108, 22, 4)
    ctx.fill()
    ctx.fillStyle = '#fde68a'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('自研 Canvas', 14, 23)

    if (handle.label) {
      ctx.fillStyle = 'rgba(15,23,42,0.7)'
      roundRect(ctx, 8, 34, clamp(ctx.measureText(handle.label).width + 14, 40, w - 16), 18, 3)
      ctx.fill()
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '10px sans-serif'
      ctx.fillText(handle.label, 14, 47)
    }

    const tick = function () {
      if (!handle._alive) return
      frame()
    }
    if (canvas.requestAnimationFrame) {
      handle._raf = canvas.requestAnimationFrame(tick)
    } else {
      handle._timer = setTimeout(tick, 33)
    }
  }

  frame()

  return {
    setScene: function (scene) {
      if (scene) handle.scene = scene
    },
    setFx: function (fx) {
      if (fx) handle.fx = fx
    },
    setLabel: function (label) {
      handle.label = label || ''
    },
    destroy: function () {
      destroy(handle)
    }
  }
}

module.exports = {
  play: play,
  destroy: destroy
}
