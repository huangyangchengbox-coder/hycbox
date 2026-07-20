const communityPref = require('../../../../services/communityPref')

/** 旧入口兼容：闪送首页统一进「我的闪送」 */
Page({
  onLoad() {
    if (!communityPref.hasPref()) {
      wx.redirectTo({ url: '/pages/hyc/user/community/community' })
      return
    }
    wx.redirectTo({ url: '/pages/hyc/user/mine/mine' })
  }
})
