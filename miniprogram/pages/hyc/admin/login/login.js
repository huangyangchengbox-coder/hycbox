const api = require('../../../../services/api')
const adminSession = require('../../../../services/adminSession')

Page({
  data: {
    username: '',
    password: '',
    loading: false,
    redirect: '',
    ticket: ''
  },

  onLoad(options) {
    this.setData({
      redirect: (options && options.redirect) || '',
      ticket: (options && options.ticket) || ''
    })
  },

  onShow() {
    // 有效 token：扫码确认页优先，否则进管理发布页
    if (adminSession.isLoggedIn()) {
      if (this.data.redirect === 'web-login' && this.data.ticket) {
        wx.redirectTo({
          url: `/pages/hyc/admin/web-login/web-login?ticket=${encodeURIComponent(this.data.ticket)}`
        })
        return
      }
      require('../../../../services/adminEntry').goAdminHome()
    }
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  submitLogin() {
    const username = (this.data.username || '').trim()
    const password = (this.data.password || '').trim()
    if (!username || !password) {
      wx.showToast({ title: '请输入账号和密码', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    api.adminLogin(username, password).then(res => {
      if (res.code !== 0 || !res.data || !res.data.token) {
        wx.showToast({ title: (res && res.message) || '登录失败', icon: 'none' })
        return
      }
      adminSession.save(res.data)
      if (this.data.redirect === 'web-login' && this.data.ticket) {
        wx.redirectTo({
          url: `/pages/hyc/admin/web-login/web-login?ticket=${encodeURIComponent(this.data.ticket)}`
        })
        return
      }
      require('../../../../services/adminEntry').goAdminHome()
    }).catch(err => {
      console.error('adminLogin failed', err)
      const msg = (err && (err.errMsg || err.message)) || '登录失败'
      const tip = /url not in domain list|不在以下合法域名|request:fail/i.test(msg)
        ? '网络被拦截：开发者工具请关闭「校验合法域名」'
        : msg
      wx.showToast({ title: tip.length > 40 ? tip.slice(0, 40) : tip, icon: 'none', duration: 3000 })
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  goBack() {
    wx.reLaunch({ url: '/pages/hyc/hub/hub' })
  }
})
