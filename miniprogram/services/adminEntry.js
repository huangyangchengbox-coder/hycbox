/**
 * 管理员入口：有待派送时优先进配送页，否则进发布页。
 */
const config = require('./config')

function getToken() {
  return wx.getStorageSync('hyc_admin_token') || ''
}

function navigate(url, useReLaunch) {
  if (useReLaunch) {
    wx.reLaunch({ url: url })
  } else {
    wx.redirectTo({ url: url })
  }
}

function goAdminHome(useReLaunch) {
  const token = getToken()
  if (!token) {
    navigate('/pages/hyc/admin/login/login', useReLaunch)
    return
  }
  wx.request({
    url: config.baseUrl + '/admin/stats',
    method: 'GET',
    header: { 'X-Admin-Token': token },
    timeout: 8000,
    success(res) {
      const body = res.data || {}
      const pending = body.code === 0 && body.data ? (body.data.pendingCount || 0) : 0
      if (pending > 0) {
        navigate('/pages/hyc/admin/delivery/delivery', useReLaunch)
      } else {
        navigate('/pages/hyc/admin/publish/publish', useReLaunch)
      }
    },
    fail() {
      navigate('/pages/hyc/admin/publish/publish', useReLaunch)
    }
  })
}

function goUserHome(useReLaunch) {
  // 有订单优先进订单页
  const api = require('./api')
  api.listOrders().then((res) => {
    const orders = (res.code === 0 && res.data) ? res.data : []
    const url = orders.length > 0
      ? '/pages/hyc/user/mine/mine'
      : '/pages/hyc/user/home/home?stay=1'
    navigate(url, useReLaunch)
  }).catch(() => {
    navigate('/pages/hyc/user/home/home?stay=1', useReLaunch)
  })
}

module.exports = {
  goAdminHome,
  goUserHome
}
