/** 旧入口兼容：物流首页统一进「我的物流」 */
Page({
  onLoad() {
    wx.redirectTo({ url: '/pages/hyc/express/mine/mine' })
  }
})
