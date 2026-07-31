/**
 * 微信用户会话：openid + 上次角色（user/admin）
 */
const config = require('./config')

const OPENID_KEY = 'hyc_openid'
const USER_ID_KEY = 'hyc_user_id'
const ROLE_KEY = 'hyc_role'

function applyToApp(partial) {
  try {
    const app = getApp()
    if (app && app.globalData) {
      Object.keys(partial).forEach((k) => {
        app.globalData[k] = partial[k]
      })
    }
  } catch (e) {}
}

function getOpenid() {
  return wx.getStorageSync(OPENID_KEY) || ''
}

function saveSession(data) {
  const openid = (data && data.openid) || ''
  const userId = (data && data.userId) || openid
  const lastRole = (data && data.lastRole) === 'admin' ? 'admin' : 'user'
  if (openid) {
    wx.setStorageSync(OPENID_KEY, openid)
    wx.setStorageSync(USER_ID_KEY, userId || openid)
  }
  wx.setStorageSync(ROLE_KEY, lastRole)
  applyToApp({
    openid: openid,
    userId: userId || openid,
    role: lastRole
  })
  return { openid, userId, lastRole }
}

/** wx.login → 服务端换 openid */
function ensureWxSession() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(loginRes) {
        if (!loginRes.code) {
          reject(new Error('wx.login 无 code'))
          return
        }
        wx.request({
          url: config.baseUrl + '/wx/session',
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          data: { code: loginRes.code },
          timeout: 15000,
          success(res) {
            const body = res.data || {}
            if (res.statusCode >= 200 && res.statusCode < 300 && body.code === 0 && body.data) {
              resolve(saveSession(body.data))
            } else {
              reject(new Error((body && body.message) || '微信登录失败'))
            }
          },
          fail(err) {
            reject(new Error((err && err.errMsg) || '微信登录网络失败'))
          }
        })
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || 'wx.login 失败'))
      }
    })
  })
}

/** 同步上次角色到服务端 */
function syncRole(role) {
  const openid = getOpenid()
  const normalized = role === 'admin' ? 'admin' : 'user'
  wx.setStorageSync(ROLE_KEY, normalized)
  applyToApp({ role: normalized })
  if (!openid) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    wx.request({
      url: config.baseUrl + '/wx/role',
      method: 'PUT',
      header: { 'Content-Type': 'application/json' },
      data: { openid: openid, role: normalized },
      timeout: 8000,
      complete() {
        resolve()
      }
    })
  })
}

module.exports = {
  ensureWxSession,
  syncRole,
  saveSession,
  getOpenid,
  getUserId() {
    return wx.getStorageSync(USER_ID_KEY) || wx.getStorageSync(OPENID_KEY) || ''
  },
  OPENID_KEY,
  USER_ID_KEY,
  ROLE_KEY
}
