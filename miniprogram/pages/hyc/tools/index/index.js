const api = require('../../../../services/api')

Page({
  data: {
    showXian: false
  },

  onShow() {
    this.loadEntries()
  },

  loadEntries() {
    api.getHubEntries().then(res => {
      if (res.code !== 0 || !res.data) return
      this.setData({ showXian: !!res.data.xian })
    }).catch(err => {
      console.warn('[tools] hub entries', err && err.message)
    })
  },

  goLocator() {
    wx.navigateTo({ url: '/pages/hyc/tools/locator/locator' })
  },
  goCompass() {
    wx.navigateTo({ url: '/pages/hyc/tools/compass/compass' })
  },
  goRuler() {
    wx.navigateTo({ url: '/pages/hyc/tools/ruler/ruler' })
  },
  goLevel() {
    wx.navigateTo({ url: '/pages/hyc/tools/level/level' })
  },
  goFlashlight() {
    wx.navigateTo({ url: '/pages/hyc/tools/flashlight/flashlight' })
  },
  goTimer() {
    wx.navigateTo({ url: '/pages/hyc/tools/timer/timer' })
  },
  goZombie() {
    wx.navigateTo({
      url: '/pages/hyc/tools/zombie/zombie',
      fail(err) {
        console.error('打开仙途失败', err)
        wx.showToast({
          title: (err && err.errMsg) || '打开失败，请清缓存重编译',
          icon: 'none',
          duration: 2500
        })
      }
    })
  },
  goDaotu() {
    wx.navigateTo({
      url: '/pages/hyc/tools/daotu/daotu',
      fail(err) {
        console.error('打开道途失败', err)
        wx.showToast({
          title: (err && err.errMsg) || '打开失败，请清缓存重编译',
          icon: 'none',
          duration: 2500
        })
      }
    })
  }
})
