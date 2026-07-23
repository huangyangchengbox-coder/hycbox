Page({
  data: {
    bubbleLeft: 50,
    bubbleTop: 50,
    angleX: '0.0',
    angleY: '0.0',
    isLevel: false,
    statusText: '检测中…',
    error: ''
  },

  _listening: false,

  onShow() {
    this.start()
  },

  onHide() {
    this.stop()
  },

  onUnload() {
    this.stop()
  },

  start() {
    const that = this
    if (this._listening) return
    wx.startAccelerometer({
      interval: 'ui',
      success() {
        that._listening = true
        that.setData({ error: '' })
        wx.onAccelerometerChange(that.onAccel)
      },
      fail(err) {
        that.setData({
          error: (err && err.errMsg) || '加速度计不可用'
        })
      }
    })
  },

  stop() {
    if (!this._listening) return
    wx.offAccelerometerChange(this.onAccel)
    wx.stopAccelerometer({ complete() {} })
    this._listening = false
  },

  onAccel(res) {
    // 平放时 z≈±1，x/y≈0；用 x/y 偏移气泡
    const x = Number(res.x) || 0
    const y = Number(res.y) || 0
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v))
    const left = clamp(50 + x * 45, 8, 92)
    const top = clamp(50 - y * 45, 8, 92)
    const angleX = (Math.asin(clamp(x, -1, 1)) * 180) / Math.PI
    const angleY = (Math.asin(clamp(y, -1, 1)) * 180) / Math.PI
    const level = Math.abs(x) < 0.04 && Math.abs(y) < 0.04
    this.setData({
      bubbleLeft: left,
      bubbleTop: top,
      angleX: angleX.toFixed(1),
      angleY: angleY.toFixed(1),
      isLevel: level,
      statusText: level ? '已水平' : '倾斜中'
    })
  }
})
