/**
 * 单通道打僵尸原型：点击/自动开火，击杀升级武器，僵尸血量随波次变厚。
 * 纯前端 Canvas，不依赖服务端。
 */

/** 武器表：击杀门槛 → 射速间隔(ms)、单发伤害、弹道数、名称 */
const WEAPONS = [
  { kills: 0, interval: 420, dmg: 1, shots: 1, name: '手枪' },
  { kills: 8, interval: 320, dmg: 1, shots: 1, name: '冲锋枪' },
  { kills: 20, interval: 280, dmg: 2, shots: 1, name: '步枪' },
  { kills: 40, interval: 240, dmg: 2, shots: 2, name: '双管' },
  { kills: 70, interval: 180, dmg: 3, shots: 2, name: '机枪' },
  { kills: 110, interval: 140, dmg: 4, shots: 3, name: '加特林' }
]

function weaponByKills(kills) {
  let w = WEAPONS[0]
  let lv = 1
  for (let i = 0; i < WEAPONS.length; i++) {
    if (kills >= WEAPONS[i].kills) {
      w = WEAPONS[i]
      lv = i + 1
    }
  }
  return { ...w, lv }
}

Page({
  data: {
    kills: 0,
    weaponLv: 1,
    weaponName: '手枪',
    wave: 1,
    autoFire: true,
    over: false
  },

  onReady() {
    this._initCanvas()
  },

  onUnload() {
    this._stop()
  },

  onHide() {
    this._paused = true
  },

  onShow() {
    this._paused = false
  },

  toggleAuto() {
    this.setData({ autoFire: !this.data.autoFire })
  },

  onShootTap() {
    this._tryShoot(true)
  },

  onTouch() {
    this._tryShoot(true)
  },

  restart() {
    this._resetGame()
    this.setData({
      kills: 0,
      weaponLv: 1,
      weaponName: '手枪',
      wave: 1,
      over: false
    })
  },

  _initCanvas() {
    const query = wx.createSelectorQuery()
    query
      .select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          wx.showToast({ title: '画布初始化失败', icon: 'none' })
          return
        }
        const canvas = res[0].node
        const width = res[0].width
        const height = res[0].height
        const dpr = wx.getSystemInfoSync().pixelRatio || 1
        canvas.width = width * dpr
        canvas.height = height * dpr
        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)

        this._canvas = canvas
        this._ctx = ctx
        this._w = width
        this._h = height
        this._resetGame()
        this._loop()
      })
  },

  _resetGame() {
    const w = this._w || 300
    const h = this._h || 500
    this._laneX = w * 0.5
    this._laneHalf = Math.min(56, w * 0.18)
    this._playerY = h - 90
    this._zombies = []
    this._bullets = []
    this._particles = []
    this._kills = 0
    this._wave = 1
    this._spawnAcc = 0
    this._lastShot = 0
    this._over = false
    this._lastTs = 0
    this._raf = null
  },

  _stop() {
    this._over = true
    if (this._raf && this._canvas) {
      this._canvas.cancelAnimationFrame(this._raf)
      this._raf = null
    }
  },

  _loop() {
    if (!this._canvas) return
    const tick = (ts) => {
      this._raf = this._canvas.requestAnimationFrame(tick)
      if (this._paused || this._over) {
        this._draw()
        return
      }
      const dt = this._lastTs ? Math.min(0.05, (ts - this._lastTs) / 1000) : 0.016
      this._lastTs = ts
      this._update(dt, ts)
      this._draw()
    }
    this._raf = this._canvas.requestAnimationFrame(tick)
  },

  _update(dt, ts) {
    // 波次：约每 12 秒升一波，影响刷怪与血量
    this._wave = 1 + Math.floor(this._kills / 15)
    const weapon = weaponByKills(this._kills)

    if (this.data.autoFire) {
      this._tryShoot(false, ts, weapon)
    }

    // 刷怪间隔随波次缩短
    const spawnEvery = Math.max(0.55, 1.35 - this._wave * 0.08)
    this._spawnAcc += dt
    if (this._spawnAcc >= spawnEvery) {
      this._spawnAcc = 0
      this._spawnZombie()
    }

    // 子弹上移
    for (let i = this._bullets.length - 1; i >= 0; i--) {
      const b = this._bullets[i]
      b.y -= b.speed * dt
      if (b.y < -20) this._bullets.splice(i, 1)
    }

    // 僵尸下移 + 碰撞
    const baseSpeed = 38 + this._wave * 4
    for (let i = this._zombies.length - 1; i >= 0; i--) {
      const z = this._zombies[i]
      z.y += (baseSpeed + z.speedBonus) * dt
      if (z.y + z.r >= this._playerY - 8) {
        this._gameOver()
        return
      }
    }

    // 子弹打中僵尸
    for (let bi = this._bullets.length - 1; bi >= 0; bi--) {
      const b = this._bullets[bi]
      for (let zi = this._zombies.length - 1; zi >= 0; zi--) {
        const z = this._zombies[zi]
        const dx = b.x - z.x
        const dy = b.y - z.y
        if (dx * dx + dy * dy <= (z.r + 4) * (z.r + 4)) {
          z.hp -= b.dmg
          this._bullets.splice(bi, 1)
          this._burst(z.x, z.y, '#fbbf24', 4)
          if (z.hp <= 0) {
            this._burst(z.x, z.y, '#86efac', 10)
            this._zombies.splice(zi, 1)
            this._kills += 1
            const nw = weaponByKills(this._kills)
            this.setData({
              kills: this._kills,
              wave: this._wave,
              weaponLv: nw.lv,
              weaponName: nw.name
            })
          }
          break
        }
      }
    }

    // 粒子
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i]
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.life <= 0) this._particles.splice(i, 1)
    }

    // HUD 波次低频刷新
    if (this.data.wave !== this._wave) {
      this.setData({ wave: this._wave })
    }
  },

  /** 生成一只僵尸；血量随波次变厚，体型略增 */
  _spawnZombie() {
    const hp = 2 + Math.floor(this._wave * 1.4) + Math.floor(this._kills / 25)
    const r = 16 + Math.min(14, this._wave * 0.6)
    this._zombies.push({
      x: this._laneX + (Math.random() - 0.5) * this._laneHalf * 0.6,
      y: -r - 10,
      r,
      hp,
      maxHp: hp,
      speedBonus: Math.random() * 12
    })
  },

  _tryShoot(manual, ts, weapon) {
    if (this._over || !this._ctx) return
    const now = ts || Date.now()
    const w = weapon || weaponByKills(this._kills)
    if (!manual && now - this._lastShot < w.interval) return
    if (manual && now - this._lastShot < 90) return
    this._lastShot = now

    const spacing = 10
    const start = -((w.shots - 1) * spacing) / 2
    for (let i = 0; i < w.shots; i++) {
      this._bullets.push({
        x: this._laneX + start + i * spacing,
        y: this._playerY - 18,
        speed: 420 + w.lv * 30,
        dmg: w.dmg
      })
    }
  },

  _burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 40 + Math.random() * 80
      this._particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.25 + Math.random() * 0.25,
        color
      })
    }
  },

  _gameOver() {
    this._over = true
    this.setData({ over: true, kills: this._kills, wave: this._wave })
  },

  _draw() {
    const ctx = this._ctx
    const w = this._w
    const h = this._h
    if (!ctx) return

    // 背景
    ctx.fillStyle = '#121820'
    ctx.fillRect(0, 0, w, h)

    // 通道
    const lx = this._laneX - this._laneHalf
    const lw = this._laneHalf * 2
    const grad = ctx.createLinearGradient(lx, 0, lx + lw, 0)
    grad.addColorStop(0, '#1a2330')
    grad.addColorStop(0.5, '#243044')
    grad.addColorStop(1, '#1a2330')
    ctx.fillStyle = grad
    ctx.fillRect(lx, 0, lw, h)

    // 通道边线
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(lx, 0)
    ctx.lineTo(lx, h)
    ctx.moveTo(lx + lw, 0)
    ctx.lineTo(lx + lw, h)
    ctx.stroke()

    // 防线
    ctx.fillStyle = 'rgba(248, 113, 113, 0.35)'
    ctx.fillRect(lx, this._playerY + 6, lw, 4)

    // 子弹
    ctx.fillStyle = '#fde68a'
    for (const b of this._bullets) {
      ctx.beginPath()
      ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // 僵尸
    for (const z of this._zombies) {
      ctx.fillStyle = '#3f7a4a'
      ctx.beginPath()
      ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2)
      ctx.fill()
      // 眼睛
      ctx.fillStyle = '#fef08a'
      ctx.beginPath()
      ctx.arc(z.x - z.r * 0.28, z.y - z.r * 0.15, z.r * 0.18, 0, Math.PI * 2)
      ctx.arc(z.x + z.r * 0.28, z.y - z.r * 0.15, z.r * 0.18, 0, Math.PI * 2)
      ctx.fill()
      // 血条
      const bw = z.r * 2
      const ratio = Math.max(0, z.hp / z.maxHp)
      ctx.fillStyle = '#1f2937'
      ctx.fillRect(z.x - bw / 2, z.y - z.r - 10, bw, 4)
      ctx.fillStyle = ratio > 0.4 ? '#4ade80' : '#f87171'
      ctx.fillRect(z.x - bw / 2, z.y - z.r - 10, bw * ratio, 4)
    }

    // 玩家
    ctx.fillStyle = '#38bdf8'
    ctx.beginPath()
    ctx.moveTo(this._laneX, this._playerY - 16)
    ctx.lineTo(this._laneX - 14, this._playerY + 12)
    ctx.lineTo(this._laneX + 14, this._playerY + 12)
    ctx.closePath()
    ctx.fill()

    // 枪口
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(this._laneX - 2, this._playerY - 28, 4, 14)

    // 粒子
    for (const p of this._particles) {
      ctx.globalAlpha = Math.max(0, p.life * 3)
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
      ctx.globalAlpha = 1
    }
  }
})
