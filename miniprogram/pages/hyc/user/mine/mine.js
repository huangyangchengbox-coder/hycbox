const api = require('../../../../services/api')
const communityPref = require('../../../../services/communityPref')

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
      const publications = (pubRes.code === 0 && pubRes.data) ? pubRes.data : []
      // 小区闪送：有门牌的订单
      const orders = ((orderRes.code === 0 && orderRes.data) ? orderRes.data : [])
        .filter(item => item.roomId)
        .map(item => Object.assign({}, item, {
          statusText: item.status === 'completed' ? '已送达' : '待配送'
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
      wx.showToast({ title: '当前不可登记派送', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/pages/hyc/user/order/order?publicationId=${id}` })
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
