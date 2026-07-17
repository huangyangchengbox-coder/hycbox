const api = require('../../services/api')

Page({
  data: {
    communityInfo: null
  },

  onLoad() {
    // 默认身份是用户，入口直接进用户首页
    const app = getApp()
    app.globalData.role = 'user'
    wx.setStorageSync('hyc_role', 'user')
    wx.redirectTo({ url: '/pages/hyc/user/home/home' })
  }
})
