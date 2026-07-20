const api = require('../../../../services/api')

function statusText(status) {
  if (status === 'shipped') return '已发货'
  if (status === 'paid') return '待发货'
  return '待核实'
}

Page({
  data: {
    loading: true,
    order: null
  },

  onLoad(options) {
    this.orderId = (options && options.id) || ''
  },

  onShow() {
    this.loadDetail()
  },

  loadDetail() {
    if (!this.orderId) {
      this.setData({ loading: false, order: null })
      return
    }
    this.setData({ loading: true })
    api.getOrderDetail(this.orderId).then(res => {
      if (res.code !== 0 || !res.data) {
        throw new Error(res.message || '加载失败')
      }
      const order = res.data
      order.statusText = statusText(order.status)
      order.payMethodText = order.payMethod === 'alipay' ? '支付宝' : (order.payMethod === 'wechat' ? '微信' : '')
      this.setData({ order, loading: false })
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      this.setData({ loading: false })
    })
  },

  previewShip(e) {
    const current = (e && e.currentTarget && e.currentTarget.dataset.url)
      || (this.data.order && this.data.order.shipImageUrl)
    const urls = (this.data.order && this.data.order.shipImages)
      || (current ? [current] : [])
    if (!urls.length) return
    wx.previewImage({ urls, current: current || urls[0] })
  }
})
