const DIRS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']

function directionName(deg) {
  const d = ((deg % 360) + 360) % 360
  const idx = Math.round(d / 45) % 8
  return DIRS[idx]
}

Page({
  data: {
    rotate: 0,
    degreeText: '--°',
    directionName: '--',
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
    wx.startCompass({
      success() {
        that._listening = true
        that.setData({ error: '' })
        wx.onCompassChange(that.onCompass)
      },
      fail(err) {
        that.setData({
          error: (err && err.errMsg) || '指南针不可用，请检查设备权限'
        })
      }
    })
  },

  stop() {
    if (!this._listening) return
    wx.offCompassChange(this.onCompass)
    wx.stopCompass({ complete() {} })
    this._listening = false
  },

  onCompass(res) {
    const deg = Number(res.direction) || 0
    this.setData({
      rotate: -deg,
      degreeText: Math.round(deg) + '°',
      directionName: directionName(deg)
    })
  }
})
