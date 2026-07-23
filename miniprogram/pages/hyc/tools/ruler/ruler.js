Page({
  data: {
    cmText: '0.00 cm',
    mmText: '0 mm',
    measuring: false,
    hasLine: false,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    lineLeft: 0,
    lineTop: 0,
    lineWidth: 0,
    lineDeg: 0
  },

  _pxPerMm: 3.2,
  _boardTop: 0,
  _boardLeft: 0,

  onReady() {
    try {
      const sys = wx.getSystemInfoSync()
      // 粗估：按常见手机逻辑宽度对应物理宽度约 6.2~7cm
      const approxWidthCm = 6.5
      this._pxPerMm = sys.windowWidth / (approxWidthCm * 10)
    } catch (e) {
      this._pxPerMm = 3.2
    }
    this.measureBoard()
  },

  measureBoard() {
    const that = this
    wx.createSelectorQuery()
      .in(this)
      .select('.board')
      .boundingClientRect((rect) => {
        if (!rect) return
        that._boardLeft = rect.left
        that._boardTop = rect.top
      })
      .exec()
  },

  onTouchStart(e) {
    const t = e.touches[0]
    if (!t) return
    const x = t.clientX - this._boardLeft
    const y = t.clientY - this._boardTop
    this.setData({
      measuring: true,
      hasLine: true,
      x1: x,
      y1: y,
      x2: x,
      y2: y,
      lineLeft: x,
      lineTop: y,
      lineWidth: 0,
      lineDeg: 0,
      cmText: '0.00 cm',
      mmText: '0 mm'
    })
  },

  onTouchMove(e) {
    if (!this.data.measuring) return
    const t = e.touches[0]
    if (!t) return
    const x2 = t.clientX - this._boardLeft
    const y2 = t.clientY - this._boardTop
    this.updateLine(this.data.x1, this.data.y1, x2, y2)
  },

  onTouchEnd() {
    this.setData({ measuring: false })
  },

  updateLine(x1, y1, x2, y2) {
    const dx = x2 - x1
    const dy = y2 - y1
    const distPx = Math.sqrt(dx * dx + dy * dy)
    const mm = distPx / this._pxPerMm
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI
    this.setData({
      x2,
      y2,
      lineLeft: x1,
      lineTop: y1,
      lineWidth: distPx,
      lineDeg: deg,
      cmText: (mm / 10).toFixed(2) + ' cm',
      mmText: Math.round(mm) + ' mm'
    })
  },

  reset() {
    this.setData({
      hasLine: false,
      measuring: false,
      lineWidth: 0,
      cmText: '0.00 cm',
      mmText: '0 mm'
    })
  }
})
