const api = require('../../../../services/api')

Page({
  data: {
    publications: [],
    loading: true
  },

  onShow() {
    this.loadData()
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
    wx.navigateTo({ url: `/pages/hyc/user/order/order?publicationId=${id}` })
  },

  goMine() {
    wx.redirectTo({ url: '/pages/hyc/user/mine/mine' })
  },

  switchRole() {
    wx.redirectTo({ url: '/pages/hyc/index' })
  }
})
