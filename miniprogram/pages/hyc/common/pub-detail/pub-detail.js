const api = require('../../../../services/api')

Page({
  data: {
    publicationId: '',
    title: '',
    description: '',
    images: [],
    remainBags: null,
    totalBags: null,
    unit: '袋',
    unitPrice: null,
    communityLabel: '',
    adminName: '',
    createdAt: '',
    loading: true,
    error: ''
  },

  onLoad(options) {
    this.setData({
      publicationId: (options && options.id) || '',
      title: (options && options.title) ? decodeURIComponent(options.title) : ''
    })
    this.reload()
  },

  reload() {
    const id = this.data.publicationId
    if (!id) {
      this.setData({ loading: false, error: '缺少发布 ID' })
      return
    }
    this.setData({ loading: true, error: '' })
    api.getPublicationDetail(id).then(res => {
      if (res.code !== 0 || !res.data) {
        throw new Error(res.message || '加载失败')
      }
      const d = res.data
      const communityParts = []
      if (d.communityName) communityParts.push(d.communityName)
      if (d.phaseName) communityParts.push(d.phaseName)
      this.setData({
        title: d.title || this.data.title,
        description: d.description || '',
        images: d.images || [],
        remainBags: d.remainBags,
        totalBags: d.totalBags,
        unit: d.unit || '袋',
        unitPrice: d.unitPrice,
        communityLabel: communityParts.join(' · '),
        adminName: d.adminName || '',
        createdAt: d.createdAt || '',
        loading: false,
        error: ''
      })
    }).catch(err => {
      this.setData({
        loading: false,
        error: (err && err.message) || '加载失败'
      })
    })
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url
    const urls = this.data.images || []
    if (!url || !urls.length) return
    wx.previewImage({ current: url, urls })
  }
})
