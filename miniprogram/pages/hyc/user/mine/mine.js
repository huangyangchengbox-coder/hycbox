const api = require('../../../../services/api')
const communityPref = require('../../../../services/communityPref')
const orderStatus = require('../../../../services/orderStatus')
const publicationImages = require('../../../../services/publicationImages')

Page({
  data: {
    publications: [],
    orders: [],
    loading: true,
    communityLabel: ''
  },

  onShow() {
    const app = getApp()
    app.globalData.role = 'user'

    if (!communityPref.hasPref()) {
      wx.redirectTo({ url: '/pages/hyc/user/community/community' })
      return
    }

    const pref = communityPref.getPref()
    this.setData({ communityLabel: communityPref.formatCommunityLabel(pref) })
    this.loadAll()
  },

  loadAll() {
    const pref = communityPref.getPref()
    if (!pref) {
      wx.redirectTo({ url: '/pages/hyc/user/community/community' })
      return
    }
    this.setData({ loading: true })
    Promise.all([
      api.listPublications({
        communityId: pref.communityId,
        phaseId: pref.phaseId || undefined
      }),
      api.listOrders()
    ]).then(([pubRes, orderRes]) => {
      // 仅小区闪送发布（排除村村送 / 物流中国）
      const publications = publicationImages.normalizePublicationList(
        ((pubRes.code === 0 && pubRes.data) ? pubRes.data : [])
          .filter(item => !item.scope || item.scope === 'community')
      )
      // 小区闪送：有门牌的订单
      const orders = ((orderRes.code === 0 && orderRes.data) ? orderRes.data : [])
        .filter(item => item.roomId)
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
      wx.showToast({ title: '当前不可登记派送', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/pages/hyc/user/order/order?publicationId=${id}` })
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
    wx.navigateTo({ url: `/pages/hyc/user/order-detail/order-detail?id=${id}` })
  },

  goHome() {
    wx.reLaunch({ url: '/pages/hyc/hub/hub' })
  },

  goProfile() {
    wx.redirectTo({ url: '/pages/hyc/user/profile/profile?from=flash' })
  },

  goChangeCommunity() {
    wx.navigateTo({ url: '/pages/hyc/user/community/community?change=1' })
  }
})
