const api = require('../../../../services/api')

Page({
  data: {
    publications: [],
    loading: true
  },

  onLoad(options) {
    // stay=1 表示从底部「首页」点进来，不强制跳订单页
    this.forceStay = options && options.stay === '1'
  },

  onShow() {
    const app = getApp()
    app.globalData.role = 'user'
    // 不在这里强制写 storage role，避免覆盖启动时的管理员偏好；切换时已 syncRole
    if (!this.forceStay && !this.entryChecked) {
      this.entryChecked = true
      this.tryEnterOrdersFirst()
      return
    }
    this.loadData()
  },

  tryEnterOrdersFirst() {
    api.listOrders().then(res => {
      const orders = (res.code === 0 && res.data) ? res.data : []
      if (orders.length > 0) {
        wx.redirectTo({ url: '/pages/hyc/user/mine/mine' })
        return
      }
      this.loadData()
    }).catch(() => {
      this.loadData()
    })
  },

  loadData() {
    this.setData({ loading: true })
    api.listPublications().then(res => {
      if (res.code === 0) {
        this.setData({ publications: res.data || [] })
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  goOrder(e) {
    const id = e.currentTarget.dataset.id
    const canOrder = e.currentTarget.dataset.can === '1'
    if (!canOrder) {
      wx.showToast({ title: '当前不可登记派送', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/pages/hyc/user/order/order?publicationId=${id}` })
  },

  goMine() {
    wx.redirectTo({ url: '/pages/hyc/user/mine/mine' })
  },

  goProfile() {
    wx.redirectTo({ url: '/pages/hyc/user/profile/profile' })
  }
})
