const api = require('../../services/api')

Page({
  data: {
    communityInfo: null
  },

  onLoad() {
    this.loadCommunityInfo()
  },

  loadCommunityInfo() {
    api.getCommunityInfo().then(res => {
      if (res.code === 0) {
        this.setData({ communityInfo: res.data })
      }
    }).catch(err => {
      console.error('loadCommunityInfo failed', err)
    })
  },

  enterAsUser() {
    const app = getApp()
    app.globalData.role = 'user'
    wx.setStorageSync('hyc_role', 'user')
    wx.redirectTo({ url: '/pages/hyc/user/home/home' })
  },

  enterAsAdmin() {
    wx.showModal({
      title: '管理者验证',
      editable: true,
      placeholderText: '请输入管理者口令',
      success: (res) => {
        if (!res.confirm) {
          return
        }
        const config = require('../../services/config')
        if ((res.content || '').trim() !== config.adminPasscode) {
          wx.showToast({ title: '口令错误', icon: 'none' })
          return
        }
        const app = getApp()
        app.globalData.role = 'admin'
        wx.setStorageSync('hyc_role', 'admin')
        wx.redirectTo({ url: '/pages/hyc/admin/publish/publish' })
      }
    })
  }
})
