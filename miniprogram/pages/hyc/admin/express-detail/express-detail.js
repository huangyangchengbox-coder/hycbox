const api = require('../../../../services/api')
const adminSession = require('../../../../services/adminSession')

Page({
  data: {
    orderId: '',
    order: null,
    afterSaleRemark: '',
    afterSaleImages: [],
    loading: true,
    saving: false
  },

  onLoad(options) {
    this.setData({ orderId: (options && options.orderId) || '' })
  },

  onShow() {
    if (!adminSession.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/hyc/admin/login/login' })
      return
    }
    this.loadDetail()
  },

  loadDetail() {
    const { orderId } = this.data
    if (!orderId) return
    this.setData({ loading: true })
    api.getOrderDetail(orderId).then(res => {
      if (res.code === 0 && res.data) {
        const order = res.data
        this.setData({
          order,
          afterSaleRemark: order.afterSaleRemark || '',
          afterSaleImages: order.afterSaleImages || [],
          loading: false
        })
        return
      }
      wx.showToast({ title: res.message || '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      this.setData({ loading: false })
    })
  },

  onRemarkInput(e) {
    this.setData({ afterSaleRemark: e.detail.value })
  },

  previewShip(e) {
    const current = (e && e.currentTarget && e.currentTarget.dataset.url)
      || (this.data.order && this.data.order.shipImageUrl)
    const urls = (this.data.order && this.data.order.shipImages)
      || (current ? [current] : [])
    if (!urls.length) return
    wx.previewImage({ urls, current: current || urls[0] })
  },

  previewAfter(e) {
    const url = e.currentTarget.dataset.url
    const urls = this.data.afterSaleImages || []
    wx.previewImage({ urls, current: url })
  },

  addAfterImage() {
    wx.chooseMedia({
      count: 3,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = res.tempFiles || []
        wx.showLoading({ title: '上传中' })
        const tasks = files.map(f => api.uploadImage(f.tempFilePath))
        Promise.all(tasks).then(results => {
          wx.hideLoading()
          const urls = results
            .filter(r => r.code === 0 && r.data && r.data.url)
            .map(r => r.data.url)
          if (!urls.length) {
            wx.showToast({ title: '上传失败', icon: 'none' })
            return
          }
          this.setData({
            afterSaleImages: (this.data.afterSaleImages || []).concat(urls)
          })
        }).catch(err => {
          wx.hideLoading()
          wx.showToast({ title: err.message || '上传失败', icon: 'none' })
        })
      }
    })
  },

  removeAfterImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    const list = (this.data.afterSaleImages || []).slice()
    list.splice(index, 1)
    this.setData({ afterSaleImages: list })
  },

  saveAfterSale() {
    if (this.data.saving) return
    this.setData({ saving: true })
    wx.showLoading({ title: '保存中' })
    api.updateAfterSale(this.data.orderId, this.data.afterSaleRemark, this.data.afterSaleImages)
      .then(res => {
        wx.hideLoading()
        this.setData({ saving: false })
        if (res.code === 0) {
          wx.showToast({ title: '已保存', icon: 'success' })
          this.setData({ order: res.data })
        } else {
          wx.showToast({ title: res.message || '保存失败', icon: 'none' })
        }
      }).catch(err => {
        wx.hideLoading()
        this.setData({ saving: false })
        wx.showToast({ title: err.message || '保存失败', icon: 'none' })
      })
  }
})
