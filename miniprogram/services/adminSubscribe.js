/**
 * 管理员一次性订阅消息：授权 / 绑定 openid / 续订引导。
 * 模板「新留言提醒」为一次性，推送一条后需再次授权。
 */
const api = require('./api')

const TEMPLATE_ID = 'dxRwNatW9XCtcenQZVu8K2TJovhsCgMX9sxhR2SFsig'

function getOpenid() {
  return wx.getStorageSync('hyc_openid') || ''
}

function wxLoginCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (res.code) {
          resolve(res.code)
        } else {
          reject(new Error('wx.login 无 code'))
        }
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || 'wx.login 失败'))
      }
    })
  })
}

/** 绑定当前管理员微信，便于推送 */
function bindAdminWx() {
  return wxLoginCode().then(code => api.bindAdminWx(code))
}

/**
 * 调起一次性订阅授权；用户允许后额度 +1。
 * @returns {Promise<{accepted:boolean, status?:object}>}
 */
function requestAdminSubscribe() {
  return new Promise((resolve, reject) => {
    // 需在用户点击手势内调用
    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_ID],
      success(res) {
        const state = res[TEMPLATE_ID]
        if (state !== 'accept') {
          resolve({ accepted: false, state })
          return
        }
        const openid = getOpenid()
        const grant = () => api.grantAdminSubscribe(openid).then(statusRes => {
          resolve({
            accepted: true,
            status: statusRes.code === 0 ? statusRes.data : null
          })
        }).catch(reject)

        if (!openid) {
          bindAdminWx().then(bindRes => {
            if (bindRes.code !== 0) {
              reject(new Error(bindRes.message || '绑定微信失败'))
              return
            }
            grant()
          }).catch(reject)
          return
        }
        // 确保服务端已有 openid
        bindAdminWx().then(() => grant()).catch(() => grant())
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || '订阅失败'))
      }
    })
  })
}

module.exports = {
  TEMPLATE_ID,
  bindAdminWx,
  requestAdminSubscribe
}
