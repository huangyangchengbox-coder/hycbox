const adminSession = require('../../../../services/adminSession')

Page({
  data: {
    adminName: '',
    isSuperAdmin: false
  },

  onShow() {
    if (!adminSession.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/hyc/admin/login/login' })
      return
    }
    this.setData({
      adminName: wx.getStorageSync('hyc_admin_name') || '管理者',
      isSuperAdmin: wx.getStorageSync('hyc_is_super_admin') === '1'
    })
  },

  goPublish() {
    wx.redirectTo({ url: '/pages/hyc/admin/publish/publish' })
  },

  goDelivery() {
    wx.redirectTo({ url: '/pages/hyc/admin/delivery/delivery' })
  },

  goManagers() {
    wx.redirectTo({ url: '/pages/hyc/admin/managers/managers' })
  },

  goUser() {
    adminSession.switchToUser()
    require('../../../../services/adminEntry').goUserHome(false)
  }
})
