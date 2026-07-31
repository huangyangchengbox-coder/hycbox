const adminSession = require('../../../../services/adminSession')
const api = require('../../../../services/api')
const adminSubscribe = require('../../../../services/adminSubscribe')

Page({
  data: {
    adminName: '',
    isSuperAdmin: false,
    wxBound: false,
    qrWxBound: false,
    subscribeQuota: 0,
    needSubscribe: true,
    showBindForm: false,
    bindUsername: '',
    bindPassword: '',
    bindLoading: false,
    hubFlash: false,
    hubExpress: false,
    hubVillage: false,
    hubXian: false,
    hubSaving: false
  },

  onShow() {
    if (!adminSession.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/hyc/admin/login/login' })
      return
    }
    this.setData({
      adminName: wx.getStorageSync('hyc_admin_name') || '管理者',
      isSuperAdmin: wx.getStorageSync('hyc_is_super_admin') === '1',
      bindUsername: wx.getStorageSync('hyc_admin_username') || ''
    })
    this.refreshBindStatus()
    this.loadHubEntries()
  },

  loadHubEntries() {
    api.getAdminHubEntries().then(res => {
      if (res.code !== 0 || !res.data) {
        return
      }
      this.setData({
        hubFlash: !!res.data.flash,
        hubExpress: !!res.data.express,
        hubVillage: !!res.data.village,
        hubXian: !!res.data.xian
      })
    }).catch(err => {
      console.warn('[admin mine] hub entries', err && err.message)
    })
  },

  onHubFlashChange(e) {
    this.saveHubEntry('flash', !!e.detail.value, 'hubFlash')
  },

  onHubExpressChange(e) {
    this.saveHubEntry('express', !!e.detail.value, 'hubExpress')
  },

  onHubVillageChange(e) {
    this.saveHubEntry('village', !!e.detail.value, 'hubVillage')
  },

  onHubXianChange(e) {
    this.saveHubEntry('xian', !!e.detail.value, 'hubXian')
  },

  saveHubEntry(field, value, dataKey) {
    const prev = this.data[dataKey]
    const payload = {}
    payload[field] = value
    this.setData({ [dataKey]: value, hubSaving: true })
    api.updateHubEntries(payload).then(res => {
      if (res.code !== 0) {
        this.setData({ [dataKey]: prev })
        wx.showToast({ title: (res && res.message) || '保存失败', icon: 'none' })
        return
      }
      if (res.data) {
        this.setData({
          hubFlash: !!res.data.flash,
          hubExpress: !!res.data.express,
          hubVillage: !!res.data.village,
          hubXian: !!res.data.xian
        })
      }
      wx.showToast({ title: value ? '已显示' : '已隐藏', icon: 'success' })
    }).catch(err => {
      this.setData({ [dataKey]: prev })
      wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' })
    }).finally(() => {
      this.setData({ hubSaving: false })
    })
  },

  /** 以服务端管理员记录为准（token），不再每次用 code 换票判断 */
  refreshBindStatus() {
    api.getAdminSubscribeStatus().then(res => {
      if (res.code === 0 && res.data) {
        const bound = !!res.data.wxBound
        this.setData({
          wxBound: bound,
          qrWxBound: bound,
          subscribeQuota: Number(res.data.subscribeQuota) || 0,
          needSubscribe: !!res.data.needSubscribe
        })
      }
    }).catch(() => {})
  },

  onSubscribeTap() {
    wx.showLoading({ title: '准备中' })
    adminSubscribe.bindAdminWx().then(() => {
      wx.hideLoading()
      return adminSubscribe.requestAdminSubscribe()
    }).then(result => {
      if (!result.accepted) {
        wx.showToast({ title: '未授权订阅', icon: 'none' })
        this.refreshBindStatus()
        return
      }
      const quota = result.status ? result.status.subscribeQuota : 1
      this.setData({
        wxBound: true,
        qrWxBound: true,
        subscribeQuota: quota,
        needSubscribe: quota <= 0
      })
      wx.showToast({ title: '订阅成功，可推送 ' + quota + ' 条', icon: 'success' })
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: (err && err.message) || '订阅失败', icon: 'none' })
    })
  },

  onBindMpTap() {
    if (this.data.qrWxBound) {
      wx.showToast({ title: '已绑定当前微信', icon: 'none' })
      return
    }
    this.bindWithToken()
  },

  bindWithToken() {
    wx.showLoading({ title: '绑定中' })
    adminSubscribe.ensureOpenid().then((openid) => api.bindAdminWx(openid)).then((res) => {
      wx.hideLoading()
      if (res.code !== 0) {
        this.setData({ showBindForm: true })
        wx.showToast({ title: (res && res.message) || '请验证账号后绑定', icon: 'none' })
        return
      }
      this.setData({ qrWxBound: true, wxBound: true, showBindForm: false })
      wx.showToast({ title: '绑定成功', icon: 'success' })
      this.refreshBindStatus()
    }).catch((err) => {
      wx.hideLoading()
      this.setData({ showBindForm: true })
      wx.showToast({ title: (err && err.message) || '请验证账号后绑定', icon: 'none' })
    })
  },

  onBindUsernameInput(e) {
    this.setData({ bindUsername: e.detail.value })
  },

  onBindPasswordInput(e) {
    this.setData({ bindPassword: e.detail.value })
  },

  cancelBindForm() {
    this.setData({ showBindForm: false, bindPassword: '' })
  },

  submitBindForm() {
    const username = (this.data.bindUsername || '').trim()
    const password = (this.data.bindPassword || '').trim()
    if (!username || !password) {
      wx.showToast({ title: '请输入管理员账号和密码', icon: 'none' })
      return
    }
    this.setData({ bindLoading: true })
    adminSubscribe.ensureOpenid().then((openid) => api.bindAdminWxByLogin(username, password, openid)).then((res) => {
      if (res.code !== 0) {
        wx.showToast({ title: (res && res.message) || '绑定失败', icon: 'none' })
        return
      }
      this.setData({
        qrWxBound: true,
        wxBound: true,
        showBindForm: false,
        bindPassword: ''
      })
      wx.showToast({ title: '绑定成功，扫码可免密确认', icon: 'success' })
      this.refreshBindStatus()
    }).catch((err) => {
      wx.showToast({ title: (err && err.message) || '绑定失败', icon: 'none' })
    }).finally(() => {
      this.setData({ bindLoading: false })
    })
  },

  goPublish() {
    wx.redirectTo({ url: '/pages/hyc/admin/publish/publish' })
  },

  onScanWebLogin() {
    if (!this.data.qrWxBound) {
      wx.showModal({
        title: '请先绑定小程序号',
        content: '绑定后扫码确认电脑端登录，无需再输入密码',
        confirmText: '去绑定',
        success: (r) => {
          if (r.confirm) {
            this.onBindMpTap()
          }
        }
      })
      return
    }
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        const ticket = parseWebLoginTicket(res)
        if (!ticket) {
          wx.showToast({ title: '未识别到登录码，请扫网页二维码', icon: 'none' })
          return
        }
        wx.navigateTo({
          url: `/pages/hyc/admin/web-login/web-login?ticket=${encodeURIComponent(ticket)}`
        })
      },
      fail: (err) => {
        if (err && /cancel/i.test(err.errMsg || '')) {
          return
        }
        wx.showToast({ title: '扫码失败', icon: 'none' })
      }
    })
  },

  goManagers() {
    wx.redirectTo({ url: '/pages/hyc/admin/managers/managers' })
  },

  goUser() {
    adminSession.switchToUser()
    require('../../../../services/adminEntry').goUserHome(false)
  }
})

function parseWebLoginTicket(res) {
  if (!res) {
    return ''
  }
  const path = String(res.path || '')
  let m = path.match(/[?&](?:scene|ticket)=([^&]+)/i)
  if (m && m[1]) {
    return decodeURIComponent(m[1]).trim()
  }
  if (res.scene != null && String(res.scene).trim()) {
    return String(res.scene).trim()
  }
  const raw = String(res.result || '').trim()
  if (!raw) {
    return ''
  }
  m = raw.match(/(?:scene|ticket)=([^&\s]+)/i)
  if (m && m[1]) {
    return decodeURIComponent(m[1]).trim()
  }
  if (/^[A-Za-z0-9_-]{16,64}$/.test(raw)) {
    return raw
  }
  return ''
}
