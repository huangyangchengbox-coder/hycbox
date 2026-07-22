const api = require('../../../../services/api')
const orderStatus = require('../../../../services/orderStatus')
const publicationImages = require('../../../../services/publicationImages')

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
      api.listPublications({ scope: 'village' }),
      api.listOrders()
    ]).then(([pubRes, orderRes]) => {
      // 仅展示管理员发布的村村送；旧接口若误回其他 scope 也过滤掉
      const publications = publicationImages.normalizePublicationList(
        ((pubRes.code === 0 && pubRes.data) ? pubRes.data : [])
          .filter(item => item && item.scope === 'village')
      )
      const orders = ((orderRes.code === 0 && orderRes.data) ? orderRes.data : [])
        .filter(item => item.locationLat != null && item.locationLng != null)
        .map(item => orderStatus.withFlashStatus(item))
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
    wx.navigateTo({ url: `/pages/hyc/village/order/order?publicationId=${id}` })
  },

  goAiDetail(e) {
    const id = e.currentTarget.dataset.id
    const title = e.currentTarget.dataset.title || ''
    if (!id) return
    wx.navigateTo({
      url: `/pages/hyc/common/pub-ai-detail/pub-ai-detail?id=${id}&title=${encodeURIComponent(title)}`
    })
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
    wx.navigateTo({ url: `/pages/hyc/village/detail/detail?id=${id}` })
  },

  goHome() {
    wx.reLaunch({ url: '/pages/hyc/hub/hub' })
  },

  goProfile() {
    wx.redirectTo({ url: '/pages/hyc/user/profile/profile?from=village' })
  }
})
