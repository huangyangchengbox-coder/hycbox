Page({
  data: {
    locating: false,
    latitude: '',
    longitude: '',
    accuracy: '',
    error: ''
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const that = this
    this.setData({ locating: true, error: '' })
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      highAccuracyExpireTime: 4000,
      success(res) {
        that.setData({
          locating: false,
          latitude: Number(res.latitude).toFixed(6),
          longitude: Number(res.longitude).toFixed(6),
          accuracy: res.accuracy != null ? Math.round(res.accuracy) : ''
        })
      },
      fail(err) {
        that.setData({
          locating: false,
          error: (err && err.errMsg) || '定位失败，请在设置中开启位置权限'
        })
      }
    })
  },

  openMap() {
    const lat = Number(this.data.latitude)
    const lng = Number(this.data.longitude)
    if (!lat || !lng) return
    wx.openLocation({
      latitude: lat,
      longitude: lng,
      scale: 16,
      name: '当前位置'
    })
  },

  copyCoords() {
    const text = `${this.data.latitude},${this.data.longitude}`
    wx.setClipboardData({
      data: text,
      success() {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  }
})
