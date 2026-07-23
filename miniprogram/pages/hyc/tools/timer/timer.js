function pad(n, len) {
  let s = String(Math.floor(Math.abs(n)))
  while (s.length < len) s = '0' + s
  return s
}

function formatMs(ms) {
  const total = Math.max(0, Math.floor(ms))
  const m = Math.floor(total / 60000)
  const s = Math.floor((total % 60000) / 1000)
  const cs = Math.floor((total % 1000) / 10)
  return pad(m, 2) + ':' + pad(s, 2) + '.' + pad(cs, 2)
}

Page({
  data: {
    tab: 'stopwatch',
    display: '00:00.00',
    running: false,
    remainMs: 60000
  },

  _timer: null,
  _startedAt: 0,
  _elapsed: 0,
  _countdownTotal: 60000,

  onUnload() {
    this.clearTick()
  },

  onHide() {
    // 保持后台计时：不暂停；若需省电可在此 pause
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab || tab === this.data.tab) return
    this.clearTick()
    this._elapsed = 0
    this._startedAt = 0
    const remain = tab === 'countdown' ? this._countdownTotal : 0
    this.setData({
      tab,
      running: false,
      remainMs: remain,
      display: tab === 'countdown' ? formatMs(remain) : '00:00.00'
    })
  },

  setPreset(e) {
    if (this.data.running) return
    const sec = Number(e.currentTarget.dataset.sec) || 60
    this._countdownTotal = sec * 1000
    this._elapsed = 0
    this.setData({
      remainMs: this._countdownTotal,
      display: formatMs(this._countdownTotal)
    })
  },

  toggle() {
    if (this.data.running) this.pause()
    else this.start()
  },

  start() {
    if (this.data.tab === 'countdown' && this.data.remainMs <= 0) {
      this._elapsed = 0
      this.setData({ remainMs: this._countdownTotal })
    }
    this._startedAt = Date.now()
    this.setData({ running: true })
    this.clearTick()
    this._timer = setInterval(() => this.tick(), 50)
  },

  pause() {
    this.tick()
    if (this.data.tab === 'stopwatch') {
      this._elapsed += Date.now() - this._startedAt
    } else {
      const left = Math.max(0, this.data.remainMs - (Date.now() - this._startedAt))
      this.setData({ remainMs: left })
      this._elapsed = this._countdownTotal - left
    }
    this.clearTick()
    this.setData({ running: false })
  },

  reset() {
    this.clearTick()
    this._elapsed = 0
    this._startedAt = 0
    if (this.data.tab === 'countdown') {
      this.setData({
        running: false,
        remainMs: this._countdownTotal,
        display: formatMs(this._countdownTotal)
      })
    } else {
      this.setData({
        running: false,
        display: '00:00.00'
      })
    }
  },

  tick() {
    if (!this.data.running) return
    const now = Date.now()
    if (this.data.tab === 'stopwatch') {
      const ms = this._elapsed + (now - this._startedAt)
      this.setData({ display: formatMs(ms) })
      return
    }
    const left = Math.max(0, this.data.remainMs - (now - this._startedAt))
    this.setData({ display: formatMs(left) })
    if (left <= 0) {
      this.clearTick()
      this.setData({ running: false, remainMs: 0 })
      wx.vibrateLong({ complete() {} })
      wx.showToast({ title: '时间到', icon: 'none' })
    }
  },

  clearTick() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  }
})
