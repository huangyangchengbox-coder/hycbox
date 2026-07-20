const api = require('../../../../services/api')

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
      order.statusText = order.status === 'completed' ? '已送达' : '待配送'
      this.setData({ order, loading: false })
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      this.setData({ loading: false })
    })
  }
})
