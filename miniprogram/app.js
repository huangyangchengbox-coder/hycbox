const config = require('./config')
const themeListeners = []
global.isDemo = false
App({

  onLaunch(opts, data) {
    console.log('App Launch', opts)
    if (data && data.path) {
      wx.navigateTo({
        url: data.path,
      })
    }
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: config.envId,
        traceUser: true,
      })
    }
    this.bootstrapWxSession()
  },

  /** 关联微信 openid，并按上次角色进入 */
  bootstrapWxSession() {
    const wxSession = require('./services/wxSession')
    const adminSession = require('./services/adminSession')
    const adminEntry = require('./services/adminEntry')
    wxSession.ensureWxSession().then((session) => {
      console.log('wx session ok', session.lastRole, session.openid)
      const lastRole = session.lastRole || wx.getStorageSync('hyc_role') || 'user'
      if (lastRole === 'admin' && adminSession.isLoggedIn()) {
        adminSession.switchToAdmin()
        adminEntry.goAdminHome(true)
      } else if (lastRole === 'admin' && !adminSession.isLoggedIn()) {
        wx.reLaunch({ url: '/pages/hyc/admin/login/login' })
      } else {
        adminEntry.goUserHome(true)
      }
    }).catch((err) => {
      console.warn('wx session failed, fallback local role', err)
      const lastRole = wx.getStorageSync('hyc_role') || 'user'
      if (lastRole === 'admin' && adminSession.isLoggedIn()) {
        adminEntry.goAdminHome(true)
      }
    })
  },

  onShow(opts) {
    console.log('App Show', opts)
  },
  onHide() {
    console.log('App Hide')
  },
  onThemeChange({ theme }) {
    this.globalData.theme = theme
    themeListeners.forEach((listener) => {
      listener(theme)
    })
  },
  watchThemeChange(listener) {
    if (themeListeners.indexOf(listener) < 0) {
      themeListeners.push(listener)
    }
  },
  unWatchThemeChange(listener) {
    const index = themeListeners.indexOf(listener)
    if (index > -1) {
      themeListeners.splice(index, 1)
    }
  },
  globalData: {
    theme: wx.getSystemInfoSync().theme,
    hasLogin: false,
    openid: wx.getStorageSync('hyc_openid') || null,
    userId: wx.getStorageSync('hyc_openid') || wx.getStorageSync('hyc_user_id') || '',
    role: wx.getStorageSync('hyc_role') || 'user',
    adminToken: wx.getStorageSync('hyc_admin_token') || '',
    adminId: wx.getStorageSync('hyc_admin_id') || '',
    adminName: wx.getStorageSync('hyc_admin_name') || '',
    isSuperAdmin: wx.getStorageSync('hyc_is_super_admin') === '1',
    iconTabbar: '/page/weui/example/images/icon_tabbar.png',
  },
  getUserOpenId(callback) {
    const self = this
    if (self.globalData.openid) {
      callback(null, self.globalData.openid)
      return
    }
    const wxSession = require('./services/wxSession')
    wxSession.ensureWxSession().then((session) => {
      callback(null, session.openid)
    }).catch((err) => {
      callback(err)
    })
  }
})
