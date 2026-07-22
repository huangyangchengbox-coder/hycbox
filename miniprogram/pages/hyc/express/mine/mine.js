const api = require('../../../../services/api')
const publicationImages = require('../../../../services/publicationImages')

function statusText(status) {
  if (status === 'shipped') return '已发货'
  if (status === 'paid') return '待发货'
  return '待核实'
}

Page({
  data: {
    publications: [],
    orders: [],
    loading: true
  },

  onShow() {
    const app = getApp()
    app.globalData.role = 'user'
    this.loadAll()
  },

  loadAll() {
    this.setData({ loading: true })
    Promise.all([
      api.listPublications({ scope: 'nationwide' }),
      api.listOrders()
    ]).then(([pubRes, orderRes]) => {
      const publications = publicationImages.normalizePublicationList(
        ((pubRes.code === 0 && pubRes.data) ? pubRes.data : [])
          .filter(item => item && item.scope === 'nationwide')
      )
      const orders = ((orderRes.code === 0 && orderRes.data) ? orderRes.data : [])
        .filter(item => item.province && item.locationLat == null)
        .map(item => Object.assign({}, item, {
          statusText: statusText(item.status)
        }))
      this.setData({ publications, orders })
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
      wx.showToast({ title: '当前不可登记', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/pages/hyc/express/order/order?publicationId=${id}` })
  },

  previewPubImages(e) {
    const id = e.currentTarget.dataset.id
    const current = e.currentTarget.dataset.url
    const item = (this.data.publications || []).find(p => p.id === id)
    publicationImages.previewPublicationImages(item, current)
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/hyc/express/detail/detail?id=${id}` })
  },

  goHome() {
    wx.reLaunch({ url: '/pages/hyc/hub/hub' })
  },

  goProfile() {
    wx.redirectTo({ url: '/pages/hyc/user/profile/profile?from=express' })
  }
})
