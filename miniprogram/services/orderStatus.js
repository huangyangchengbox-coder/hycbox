/**
 * 小区闪送订单状态文案与标签样式（mine / 详情等复用）。
 */
function flashStatusText(status) {
  if (status === 'completed') return '已送达'
  if (status === 'cancelled') return '已取消'
  return '待配送'
}

/** 对应 common.wxss：hyc-tag-pending / hyc-tag-done / hyc-tag-cancelled */
function flashTagClass(status) {
  if (status === 'pending') return 'hyc-tag-pending'
  if (status === 'cancelled') return 'hyc-tag-cancelled'
  return 'hyc-tag-done'
}

function withFlashStatus(item) {
  const status = item && item.status
  return Object.assign({}, item, {
    statusText: flashStatusText(status),
    statusTagClass: flashTagClass(status)
  })
}

module.exports = {
  flashStatusText,
  flashTagClass,
  withFlashStatus
}
