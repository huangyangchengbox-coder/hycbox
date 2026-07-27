/**
 * 管理员一次性订阅消息：授权 / 绑定 openid / 续订引导。
 * 模板「新留言提醒」为一次性，推送一条后需再次授权。
 */
const api = require('./api')
const wxSession = require('./wxSession')

const TEMPLATE_ID = 'dxRwNatW9XCtcenQZVu8K2TJovhsCgMX9sxhR2SFsig'

function ensureOpenid() {
  const cached = wxSession.getOpenid()
  if (cached) {
    return Promise.resolve(cached)
  }
  return wxSession.ensureWxSession().then((s) => s.openid || wxSession.getOpenid())
}

/** 绑定当前管理员微信，便于推送 / 扫码免登 */
function bindAdminWx() {
  return ensureOpenid().then((openid) => {
    if (!openid) {
      return Promise.reject(new Error('获取微信 openid 失败'))
    }
    return api.bindAdminWx(openid)
  })
}

/**
 * 调起一次性订阅授权；用户允许后额度 +1。
 * @returns {Promise<{accepted:boolean, status?:object}>}
 */
function requestAdminSubscribe() {
  return new Promise((resolve, reject) => {
    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_ID],
      success(res) {
        const state = res[TEMPLATE_ID]
        if (state !== 'accept') {
          resolve({ accepted: false, state })
          return
        }
        const grant = (openid) => api.grantAdminSubscribe(openid).then(statusRes => {
          resolve({
            accepted: true,
            status: statusRes.code === 0 ? statusRes.data : null
          })
        }).catch(reject)

        ensureOpenid().then((openid) => {
          return api.bindAdminWx(openid).then(() => grant(openid)).catch(() => grant(openid))
        }).catch(reject)
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
  ensureOpenid,
  requestAdminSubscribe
}
