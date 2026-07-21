/**
 * 用户订单进度订阅（一次性模板）。
 * 与管理员模板字段结构相同：thing1/2/3 + date4 + number5。
 * 可在微信后台另配「订单状态」模板，并配置 HYCBOX_WX_USER_ORDER_TEMPLATE_ID。
 */
const TEMPLATE_ID = 'dxRwNatW9XCtcenQZVu8K2TJovhsCgMX9sxhR2SFsig'

/**
 * 在用户点击手势内调用；允许则后续可推送进度。
 * @returns {Promise<boolean>} 是否 accept
 */
function requestUserOrderSubscribe() {
  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_ID],
      success(res) {
        resolve(res[TEMPLATE_ID] === 'accept')
      },
      fail() {
        resolve(false)
      }
    })
  })
}

module.exports = {
  TEMPLATE_ID,
  requestUserOrderSubscribe
}
