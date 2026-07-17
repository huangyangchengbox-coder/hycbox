const adminSession = require('../../../../services/adminSession')
const adminEntry = require('../../../../services/adminEntry')
const communityPref = require('../../../../services/communityPref')

Page({
  data: {
    communityLabel: ''
  },

  onShow() {
    const pref = communityPref.getPref()
    this.setData({
      communityLabel: pref ? communityPref.formatLabel(pref) : '未选择'
    })
  },

  goHome() {
    wx.redirectTo({ url: '/pages/hyc/user/home/home?stay=1' })
  },

  goOrders() {
    wx.redirectTo({ url: '/pages/hyc/user/mine/mine' })
  },

  goChangeCommunity() {
    wx.navigateTo({ url: '/pages/hyc/user/community/community?change=1' })
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
