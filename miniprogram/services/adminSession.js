/**
 * 管理者登录态：本地缓存 token，30 天有效。
 * 切换到用户界面时保留 token，无需重新登录。
 */
const TOKEN_KEY = 'hyc_admin_token'
const EXPIRE_KEY = 'hyc_admin_token_expire'
const ROLE_KEY = 'hyc_role'
const ADMIN_ID_KEY = 'hyc_admin_id'
const ADMIN_NAME_KEY = 'hyc_admin_name'
const SUPER_KEY = 'hyc_is_super_admin'

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000

function applyToApp(partial) {
  const app = getApp()
  if (!app || !app.globalData) {
    return
  }
  Object.keys(partial).forEach((key) => {
    app.globalData[key] = partial[key]
  })
}

function save(loginData) {
  const token = loginData.token || ''
  const expireAt = Number(loginData.expireAt) || (Date.now() + DEFAULT_TTL_MS)
  const isSuper = !!loginData.superAdmin
  const name = loginData.displayName || loginData.username || '管理者'

  wx.setStorageSync(TOKEN_KEY, token)
  wx.setStorageSync(EXPIRE_KEY, String(expireAt))
  wx.setStorageSync(ROLE_KEY, 'admin')
  wx.setStorageSync(ADMIN_ID_KEY, loginData.adminId || '')
  wx.setStorageSync(ADMIN_NAME_KEY, name)
  wx.setStorageSync(SUPER_KEY, isSuper ? '1' : '0')

  applyToApp({
    role: 'admin',
    adminToken: token,
    adminId: loginData.adminId || '',
    adminName: name,
    isSuperAdmin: isSuper
  })

  try {
    require('./wxSession').syncRole('admin')
  } catch (e) {}
}

function syncToApp() {
  const token = getToken()
  if (!token || !isLoggedIn()) {
    return false
  }
  applyToApp({
    role: 'admin',
    adminToken: token,
    adminId: wx.getStorageSync(ADMIN_ID_KEY) || '',
    adminName: wx.getStorageSync(ADMIN_NAME_KEY) || '',
    isSuperAdmin: wx.getStorageSync(SUPER_KEY) === '1'
  })
  return true
}

/** 仅清除管理员 token（不影响 openid / 用户身份） */
function clearAdminAuth() {
  wx.removeStorageSync(TOKEN_KEY)
  wx.removeStorageSync(EXPIRE_KEY)
  wx.removeStorageSync(ADMIN_ID_KEY)
  wx.removeStorageSync(ADMIN_NAME_KEY)
  wx.removeStorageSync(SUPER_KEY)
  applyToApp({
    adminToken: '',
    adminId: '',
    adminName: '',
    isSuperAdmin: false
  })
}

/** 兼容旧调用名 */
function clear() {
  clearAdminAuth()
  wx.setStorageSync(ROLE_KEY, 'user')
  applyToApp({ role: 'user' })
  try {
    require('./wxSession').syncRole('user')
  } catch (e) {}
}

function switchToUser() {
  wx.setStorageSync(ROLE_KEY, 'user')
  applyToApp({ role: 'user' })
  try {
    require('./wxSession').syncRole('user')
  } catch (e) {}
}

function switchToAdmin() {
  wx.setStorageSync(ROLE_KEY, 'admin')
  syncToApp()
  try {
    require('./wxSession').syncRole('admin')
  } catch (e) {}
}

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || ''
}

function getExpireAt() {
  return Number(wx.getStorageSync(EXPIRE_KEY) || 0)
}

function isLoggedIn() {
  const token = getToken()
  const expireAt = getExpireAt()
  if (!token || !expireAt || expireAt <= Date.now()) {
    if (token) {
      clearAdminAuth()
    }
    return false
  }
  return true
}

function isLoginExpiredError(errOrMsg) {
  const msg = typeof errOrMsg === 'string'
    ? errOrMsg
    : ((errOrMsg && (errOrMsg.message || errOrMsg.errMsg)) || '')
  return msg.indexOf('登录') >= 0 || msg.indexOf('失效') >= 0
}

module.exports = {
  save,
  clear,
  clearAdminAuth,
  syncToApp,
  switchToUser,
  switchToAdmin,
  getToken,
  getExpireAt,
  isLoggedIn,
  isLoginExpiredError,
  DEFAULT_TTL_MS
}
