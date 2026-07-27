const api = require('../../../../services/api')
const adminSubscribe = require('../../../../services/adminSubscribe')

Page({
  data: {
    ticket: '',
    statusText: '待确认',
    loading: false
  },

  onLoad(options) {
    const ticket = parseTicketFromOptions(options)
    this.setData({ ticket })
    if (!ticket) {
      console.warn('web-login missing ticket', options)
    }
  },

  onShow() {
    if (!this.data.ticket) {
      this.setData({ statusText: '无效二维码' })
      wx.showToast({ title: '缺少登录票据', icon: 'none' })
      return
    }
    this.setData({ statusText: '待确认' })
    api.scanQrLogin(this.data.ticket).then(() => {
      this.setData({ statusText: '已扫码，请确认' })
    }).catch((err) => {
      const msg = (err && err.message) || '二维码无效'
      this.setData({ statusText: '二维码无效' })
      if (/不存在|失效/.test(msg)) {
        wx.showToast({
          title: '请刷新网页二维码后重扫（注意体验/正式站对应）',
          icon: 'none',
          duration: 3000
        })
      }
    })
  },

  onConfirm() {
    const ticket = this.data.ticket
    if (!ticket) {
      wx.showToast({ title: '缺少登录票据', icon: 'none' })
      return
    }
    this.setData({ loading: true, statusText: '确认中…' })
    adminSubscribe.ensureOpenid().then((openid) => api.confirmQrLogin(ticket, openid)).then((res) => {
      if (res.code !== 0) {
        this.handleConfirmFail((res && res.message) || '确认失败')
        return
      }
      this.setData({ statusText: '已确认' })
      wx.showToast({ title: '登录成功，请返回电脑', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack({
          fail() {
            wx.reLaunch({ url: '/pages/hyc/hub/hub' })
          }
        })
      }, 1200)
    }).catch((err) => {
      this.handleConfirmFail((err && err.message) || '确认失败')
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  handleConfirmFail(msg) {
    this.setData({ statusText: '确认失败' })
    const text = msg || '确认失败'
    if (/不存在|失效/.test(text)) {
      wx.showModal({
        title: '二维码已失效',
        content: '请回到电脑刷新二维码后重新扫码。体验站请用体验版小程序，正式站请用正式版。',
        showCancel: false
      })
      return
    }
    if (/未绑定|绑定小程序/.test(text)) {
      wx.showModal({
        title: '需要绑定小程序号',
        content: '请先登录管理员，在「我的」绑定小程序号后，再扫码确认',
        confirmText: '去绑定',
        success(r) {
          if (r.confirm) {
            wx.reLaunch({ url: '/pages/hyc/admin/mine/mine' })
          }
        }
      })
      return
    }
    wx.showToast({ title: text.length > 40 ? text.slice(0, 40) : text, icon: 'none', duration: 3000 })
  },

  goBack() {
    wx.navigateBack({
      fail() {
        wx.reLaunch({ url: '/pages/hyc/hub/hub' })
      }
    })
  }
})

/** 解析小程序码 / 扫码 / 跳转带来的 ticket */
function parseTicketFromOptions(options) {
  if (!options) {
    return ''
  }
  let raw = ''
  if (options.ticket) {
    raw = String(options.ticket)
  } else if (options.scene) {
    raw = String(options.scene)
  }
  if (!raw) {
    return ''
  }
  try {
    raw = decodeURIComponent(raw)
  } catch (e) {}
  raw = raw.trim()
  // 兼容 scene=xxx&其它 或误带 query
  if (raw.indexOf('ticket=') >= 0) {
    const m = raw.match(/ticket=([^&]+)/i)
    if (m) {
      raw = m[1]
    }
  }
  if (raw.indexOf('&') >= 0) {
    raw = raw.split('&')[0]
  }
  return raw.trim()
}
