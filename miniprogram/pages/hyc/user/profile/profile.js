const adminSession = require('../../../../services/adminSession')
const adminEntry = require('../../../../services/adminEntry')

Page({
  goHome() {
    wx.redirectTo({ url: '/pages/hyc/user/home/home?stay=1' })
  },

  goOrders() {
    wx.redirectTo({ url: '/pages/hyc/user/mine/mine' })
  },

  goAdmin() {
    if (adminSession.isLoggedIn()) {
      adminSession.switchToAdmin()
      adminEntry.goAdminHome()
      return
    }
    wx.navigateTo({ url: '/pages/hyc/admin/login/login' })
  }
})
