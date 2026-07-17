const api = require('../../../../services/api')

Page({
  data: {
    orders: [],
    loading: true
  },

  onShow() {
    this.loadOrders()
  },

  loadOrders() {
    this.setData({ loading: true })
    api.listOrders().then(res => {
      if (res.code === 0) {
        this.setData({ orders: res.data || [] })
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  goHome() {
    wx.redirectTo({ url: '/pages/hyc/user/home/home' })
  },

  switchRole() {
    wx.redirectTo({ url: '/pages/hyc/index' })
  }
})
