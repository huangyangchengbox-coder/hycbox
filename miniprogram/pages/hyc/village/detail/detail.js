const api = require('../../../../services/api')
const orderStatus = require('../../../../services/orderStatus')
const courierMapTrack = require('../../../../services/courierMapTrack')
const publicationImages = require('../../../../services/publicationImages')

Page({
  data: {
    loading: true,
    order: null,
    canCancel: false,
    showCourierMap: false,
    courierSharing: false,
    courierTip: '',
    mapLatitude: 30.57,
    mapLongitude: 111.30,
    mapMarkers: [],
    mapPolylines: [],
    mapIncludePoints: []
  },

  onLoad(options) {
    this.orderId = (options && options.id) || ''
    this._courierTrack = courierMapTrack.createCourierMapTrack(this, {
      getOrderId: () => this.orderId,
      isActive: () => this.data.showCourierMap,
      // 村村送下单时已选点，直接作为收货终点
      getDest: () => {
        const order = this.data.order
        if (!order || order.locationLat == null || order.locationLng == null) return null
        return {
          latitude: order.locationLat,
          longitude: order.locationLng
        }
      }
    })
  },

  onShow() {
    this.loadDetail()
  },

  onHide() {
    this.stopCourierPoll()
  },

  onUnload() {
    this.stopCourierPoll()
  },

  loadDetail() {
    if (!this.orderId) {
      this.setData({ loading: false, order: null })
      return
    }
    this.setData({ loading: true })
    api.getOrderDetail(this.orderId).then(res => {
      if (res.code !== 0 || !res.data) {
        throw new Error(res.message || '加载失败')
      }
      const order = orderStatus.withFlashStatus(res.data)
      const canCancel = order.status === 'pending'
      const showCourierMap = canCancel
      this.setData({
        order,
        canCancel,
        showCourierMap,
        loading: false
      })
      if (showCourierMap) {
        this.startCourierPoll()
      } else {
        this.stopCourierPoll()
        this.setData({
          courierSharing: false,
          courierTip: '',
          mapMarkers: [],
          mapPolylines: [],
          mapIncludePoints: []
        })
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      this.setData({ loading: false })
    })
  },

  startCourierPoll() {
    if (this._courierTrack) {
      this._courierTrack.start()
    }
  },

  stopCourierPoll() {
    if (this._courierTrack) {
      this._courierTrack.stop()
    }
  },

  previewPubImages(e) {
    const current = e.currentTarget.dataset.url
    publicationImages.previewUrls(
      (this.data.order && this.data.order.publicationImages) || [],
      current
    )
  },

  openMyLocation() {
    const order = this.data.order
    if (!order || order.locationLat == null) return
    wx.openLocation({
      latitude: Number(order.locationLat),
      longitude: Number(order.locationLng),
      name: order.locationName || '收货位置',
      address: order.address || ''
    })
  },

  cancelOrder() {
    if (!this.data.canCancel || !this.orderId) return
    wx.showModal({
      title: '取消订单',
      content: '确定取消该登记？库存将退回。',
      success: (modalRes) => {
        if (!modalRes.confirm) return
        wx.showLoading({ title: '取消中' })
        api.cancelOrder(this.orderId).then(res => {
          wx.hideLoading()
          if (res.code !== 0) {
            wx.showToast({ title: res.message || '取消失败', icon: 'none' })
            return
          }
          wx.showToast({ title: '已取消', icon: 'success' })
          this.loadDetail()
        }).catch(err => {
          wx.hideLoading()
          wx.showToast({ title: err.message || '取消失败', icon: 'none' })
        })
      }
    })
  }
})
