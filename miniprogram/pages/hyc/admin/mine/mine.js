const adminSession = require('../../../../services/adminSession')
const api = require('../../../../services/api')
const adminSubscribe = require('../../../../services/adminSubscribe')

Page({
  data: {
    adminName: '',
    isSuperAdmin: false,
    wxBound: false,
    subscribeQuota: 0,
    needSubscribe: true
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
    this.refreshSubscribe()
  },

  refreshSubscribe() {
    api.getAdminSubscribeStatus().then(res => {
      if (res.code === 0 && res.data) {
        this.setData({
          wxBound: !!res.data.wxBound,
          subscribeQuota: Number(res.data.subscribeQuota) || 0,
          needSubscribe: !!res.data.needSubscribe
        })
      }
    }).catch(() => {})
  },

  /** 开启/续订一次性订阅（必须用户点击） */
  onSubscribeTap() {
    wx.showLoading({ title: '准备中' })
    adminSubscribe.bindAdminWx().then(() => {
      wx.hideLoading()
      return adminSubscribe.requestAdminSubscribe()
    }).then(result => {
      if (!result.accepted) {
        wx.showToast({ title: '未授权订阅', icon: 'none' })
        this.refreshSubscribe()
        return
      }
      const quota = result.status ? result.status.subscribeQuota : 1
      this.setData({
        wxBound: true,
        subscribeQuota: quota,
        needSubscribe: quota <= 0
      })
      wx.showToast({ title: '订阅成功，可推送 ' + quota + ' 条', icon: 'success' })
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: (err && err.message) || '订阅失败', icon: 'none' })
    })
  },

  goPublish() {
    wx.redirectTo({ url: '/pages/hyc/admin/publish/publish' })
  },

  goManagers() {
    wx.redirectTo({ url: '/pages/hyc/admin/managers/managers' })
  },

  goAiImage() {
    wx.navigateTo({ url: '/pages/hyc/admin/ai-image/ai-image' })
  },

  goAiVideo() {
    wx.navigateTo({ url: '/pages/hyc/admin/ai-video/ai-video' })
  },

  goUser() {
    adminSession.switchToUser()
    require('../../../../services/adminEntry').goUserHome(false)
  }
})
