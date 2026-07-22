const api = require('../../../../services/api')

Page({
  data: {
    publicationId: '',
    title: '',
    content: '',
    cached: false,
    updatedAt: '',
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
    this.setData({ loading: true, error: '', content: '' })
    api.getPublicationAiDetail(id).then(res => {
      if (res.code !== 0 || !res.data) {
        throw new Error(res.message || '加载失败')
      }
      const d = res.data
      this.setData({
        title: d.title || this.data.title,
        content: d.content || '',
        cached: !!d.cached,
        updatedAt: d.updatedAt || '',
        loading: false,
        error: ''
      })
    }).catch(err => {
      this.setData({
        loading: false,
        error: (err && err.message) || '加载失败'
      })
    })
  }
})
