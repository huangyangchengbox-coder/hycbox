const api = require('../../../../services/api')
const adminSession = require('../../../../services/adminSession')

Page({
  data: {
    ticket: '',
    ticketShort: '',
    adminName: '管理者',
    loading: false
  },

  onLoad(options) {
    let ticket = (options && options.ticket) || ''
    if (options && options.scene) {
      ticket = decodeURIComponent(options.scene)
    }
    ticket = (ticket || '').trim()
    this.setData({
      ticket,
      ticketShort: ticket ? `${ticket.slice(0, 8)}…${ticket.slice(-4)}` : ''
    })
  },

  onShow() {
    if (!this.data.ticket) {
      wx.showToast({ title: '缺少登录票据', icon: 'none' })
      return
    }
    if (!adminSession.isLoggedIn()) {
      wx.redirectTo({
        url: `/pages/hyc/admin/login/login?redirect=web-login&ticket=${encodeURIComponent(this.data.ticket)}`
      })
      return
    }
    this.setData({
      adminName: wx.getStorageSync('hyc_admin_name') || '管理者'
    })
    api.scanQrLogin(this.data.ticket).catch(() => {})
  },

  onConfirm() {
    const ticket = this.data.ticket
    if (!ticket) {
      wx.showToast({ title: '缺少登录票据', icon: 'none' })
      return
    }
    if (!adminSession.isLoggedIn()) {
      wx.redirectTo({
        url: `/pages/hyc/admin/login/login?redirect=web-login&ticket=${encodeURIComponent(ticket)}`
      })
      return
    }
    this.setData({ loading: true })
    api.confirmQrLogin(ticket).then((res) => {
      if (res.code !== 0) {
        wx.showToast({ title: (res && res.message) || '确认失败', icon: 'none' })
        return
      }
      wx.showToast({ title: '已确认，请返回电脑端', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack({
          fail() {
            wx.reLaunch({ url: '/pages/hyc/admin/publish/publish' })
          }
        })
      }, 1200)
    }).catch((err) => {
      wx.showToast({ title: (err && err.message) || '确认失败', icon: 'none' })
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  goBack() {
    wx.navigateBack({
      fail() {
        wx.reLaunch({ url: '/pages/hyc/hub/hub' })
      }
    })
  }
})
