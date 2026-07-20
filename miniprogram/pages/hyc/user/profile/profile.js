const adminSession = require('../../../../services/adminSession')
const adminEntry = require('../../../../services/adminEntry')
const communityPref = require('../../../../services/communityPref')

Page({
  data: {
    communityLabel: '',
    from: 'flash',
    midTabLabel: '我的闪送'
  },

  onLoad(options) {
    const from = (options && options.from) === 'express' ? 'express' : 'flash'
    this.setData({
      from,
      midTabLabel: from === 'express' ? '我的物流' : '我的闪送'
    })
  },

  onShow() {
    const pref = communityPref.getPref()
    this.setData({
      communityLabel: pref && pref.roomId ? communityPref.formatLabel(pref) : '未选择，点击设置'
    })
  },

  goHome() {
    wx.reLaunch({ url: '/pages/hyc/hub/hub' })
  },

  goMid() {
    if (this.data.from === 'express') {
      wx.redirectTo({ url: '/pages/hyc/express/mine/mine' })
      return
    }
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
