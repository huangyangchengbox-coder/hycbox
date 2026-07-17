const api = require('../../../../services/api')

Page({
  data: {
    publications: [],
    pubTitles: [],
    pubIndex: 0,
    currentPubId: '',
    buildingGroups: [],
    stats: {
      pendingCount: 0,
      pendingBags: 0,
      completedCount: 0,
      completedBags: 0
    },
    loading: true
  },

  onShow() {
    this.loadPublications()
  },

  loadPublications() {
    api.listPublications().then(res => {
      if (res.code === 0) {
        const publications = res.data || []
        this.setData({
          publications,
          pubTitles: publications.map(item => `${item.title}（剩余${item.remainBags}袋）`),
          pubIndex: 0,
          currentPubId: publications[0] ? publications[0].id : ''
        })
        if (publications[0]) {
          this.loadDeliveryData(publications[0].id)
        } else {
          this.setData({ loading: false, buildingGroups: [] })
        }
      }
    })
  },

  loadDeliveryData(publicationId) {
    this.setData({ loading: true })
    Promise.all([
      api.groupPendingByBuilding(publicationId),
      api.getAdminStats(publicationId)
    ]).then(([groupRes, statsRes]) => {
      const groups = (groupRes.code === 0 ? groupRes.data : []).map(item => (
        Object.assign({}, item, { expanded: true })
      ))
      this.setData({
        buildingGroups: groups,
        stats: statsRes.code === 0 ? statsRes.data : this.data.stats
      })
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  onPubChange(e) {
    const pubIndex = Number(e.detail.value)
    const publication = this.data.publications[pubIndex]
    this.setData({
      pubIndex,
      currentPubId: publication ? publication.id : ''
    })
    if (publication) {
      this.loadDeliveryData(publication.id)
    }
  },

  toggleGroup(e) {
    const index = e.currentTarget.dataset.index
    const key = `buildingGroups[${index}].expanded`
    this.setData({
      [key]: !this.data.buildingGroups[index].expanded
    })
  },

  completeOrder(e) {
    const orderId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认送达',
      content: '确认已将水果送到该户？',
      success: (res) => {
        if (!res.confirm) {
          return
        }
        api.completeOrder(orderId).then(result => {
          if (result.code === 0) {
            wx.showToast({ title: '已完成', icon: 'success' })
            this.loadDeliveryData(this.data.currentPubId)
          }
        }).catch(err => {
          wx.showToast({ title: err.message || '操作失败', icon: 'none' })
        })
      }
    })
  },

  goPublish() {
    wx.redirectTo({ url: '/pages/hyc/admin/publish/publish' })
  },

  switchRole() {
    wx.redirectTo({ url: '/pages/hyc/index' })
  }
})
