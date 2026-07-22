const api = require('../../../../services/api')
const orderStatus = require('../../../../services/orderStatus')

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
    mapMarkers: []
  },

  onLoad(options) {
    this.orderId = (options && options.id) || ''
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
        this.setData({ courierSharing: false, courierTip: '', mapMarkers: [] })
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      this.setData({ loading: false })
    })
  },

  startCourierPoll() {
    this.stopCourierPoll()
    this.refreshCourierLocation()
    this._courierTimer = setInterval(() => this.refreshCourierLocation(), 10000)
  },

  stopCourierPoll() {
    if (this._courierTimer) {
      clearInterval(this._courierTimer)
      this._courierTimer = null
    }
  },

  refreshCourierLocation() {
    if (!this.orderId || !this.data.showCourierMap) return
    api.getCourierLocation(this.orderId).then(res => {
      if (res.code !== 0 || !res.data) return
      const d = res.data
      if (!d.sharing || d.latitude == null || d.longitude == null) {
        this.setData({
          courierSharing: false,
          courierTip: '配送员暂未开启位置分享',
          mapMarkers: []
        })
        return
      }
      const lat = Number(d.latitude)
      const lng = Number(d.longitude)
      this.setData({
        courierSharing: true,
        courierTip: '配送员位置（约每 10 秒刷新）',
        mapLatitude: lat,
        mapLongitude: lng,
        mapMarkers: [{
          id: 1,
          latitude: lat,
          longitude: lng,
          width: 28,
          height: 28,
          callout: {
            content: '配送员',
            display: 'ALWAYS',
            padding: 6,
            borderRadius: 6,
            fontSize: 12
          }
        }]
      })
    }).catch(() => {
      this.setData({ courierSharing: false, courierTip: '位置暂时无法获取' })
    })
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
