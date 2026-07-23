/**
 * 小程序：输入区 → 历史列表 的水流飞入动画（可复用）。
 * 用法：页面 data 含 flyVisible/flyStyle/flyText；调用 playTaskFly(page, fromId, toId, text)
 */
function rpxToPx(rpx) {
  try {
    const sys = wx.getSystemInfoSync()
    return (rpx * sys.windowWidth) / 750
  } catch (e) {
    return rpx
  }
}

/**
 * @param {WechatMiniprogram.Page.Instance} page
 * @param {string} fromSelector 如 #promptBox
 * @param {string} toSelector 如 #historyCard
 * @param {string} text
 * @returns {Promise<void>}
 */
function playTaskFly(page, fromSelector, toSelector, text) {
  return new Promise((resolve) => {
    wx.createSelectorQuery()
      .in(page)
      .select(fromSelector)
      .boundingClientRect()
      .select(toSelector)
      .boundingClientRect()
      .exec((res) => {
        const from = res && res[0]
        const to = res && res[1]
        if (!from || !to) {
          resolve()
          return
        }
        const endW = Math.min(280, Math.max(160, to.width * 0.7))
        const endH = 64
        const endLeft = to.left + 12
        const endTop = to.top + 40
        page.setData({
          flyVisible: true,
          flyText: text || '生成任务',
          flyStyle: [
            `left:${from.left}px`,
            `top:${from.top}px`,
            `width:${from.width}px`,
            `height:${Math.min(from.height, 110)}px`,
            'transform:scale(1)',
            'opacity:1',
            'transition:none'
          ].join(';')
        })
        setTimeout(() => {
          page.setData({
            flyStyle: [
              `left:${from.left}px`,
              `top:${from.top}px`,
              `width:${from.width}px`,
              `height:${Math.min(from.height, 110)}px`,
              'transform:scale(1.05)',
              'opacity:1',
              'transition:transform 160ms ease'
            ].join(';')
          })
          setTimeout(() => {
            page.setData({
              flyStyle: [
                `left:${endLeft}px`,
                `top:${endTop}px`,
                `width:${endW}px`,
                `height:${endH}px`,
                'transform:scale(0.92)',
                'opacity:0.95',
                'transition:left 520ms cubic-bezier(0.4,0.05,0.2,1),top 520ms cubic-bezier(0.55,0.05,0.2,1.1),width 520ms ease,height 520ms ease,transform 520ms ease'
              ].join(';'),
              flyTrailStyle: [
                `left:${from.left + from.width / 2 - 5}px`,
                `top:${from.top + 20}px`,
                `height:${Math.max(24, endTop - from.top)}px`,
                'opacity:0.8'
              ].join(';')
            })
            setTimeout(() => {
              page.setData({
                flyVisible: false,
                flyTrailStyle: 'opacity:0;height:0'
              })
              resolve()
            }, 560)
          }, 160)
        }, 30)
      })
  })
}

module.exports = {
  playTaskFly,
  rpxToPx
}
