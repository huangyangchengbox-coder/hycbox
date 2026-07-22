const api = require('../../../../services/api')

Page({
  data: {
    publicationId: '',
    pubTitle: '',
    qtyUnit: '袋',
    orders: [],
    loading: true,
    locationTip: '',
    statusText: ''
  },

  onLoad(options) {
    this.setData({
      publicationId: (options && options.publicationId) || '',
      pubTitle: options && options.title ? decodeURIComponent(options.title) : '',
      qtyUnit: options && options.unit ? decodeURIComponent(options.unit) : '袋'
    })
  },

  onShow() {
    this.loadOrders()
    this.startLocationShare()
  },

  onHide() {
    this.stopLocationShare()
  },

  onUnload() {
    this.stopLocationShare()
  },

  startLocationShare() {
    const that = this
    this.stopLocationShare(false)
    this._locSharing = true
    const report = function () {
      if (!that._locSharing) return
      wx.getLocation({
        type: 'gcj02',
        isHighAccuracy: true,
        success(res) {
          api.reportAdminLocation({
            sharing: true,
            latitude: res.latitude,
            longitude: res.longitude
          }).catch(() => {})
          that.setData({ locationTip: '正在向用户分享配送位置…' })
        },
        fail() {
          that.setData({ locationTip: '未授权定位，用户看不到您的位置' })
        }
      })
    }
    report()
    this._locTimer = setInterval(report, 12000)
  },

  stopLocationShare(notifyServer) {
    this._locSharing = false
    if (this._locTimer) {
      clearInterval(this._locTimer)
      this._locTimer = null
    }
    if (notifyServer === false) return
    api.reportAdminLocation({ sharing: false }).catch(() => {})
    this.setData({ locationTip: '' })
  },

  loadOrders() {
    const publicationId = this.data.publicationId
    if (!publicationId) {
      this.setData({ loading: false, orders: [], statusText: '缺少发布 ID' })
      return
    }
    this.setData({ loading: true })
    api.listAdminOrders(publicationId).then(res => {
      const list = (res.code === 0 && res.data) ? res.data : []
      const orders = list
        .filter(item => item.status === 'pending' && item.locationLat != null)
        .map(item => Object.assign({}, item, {
          displayPlace: item.locationName || item.address || '未命名位置'
        }))
      this.setData({
        orders,
        loading: false,
        statusText: '待配送 ' + orders.length + ' 单'
      })
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      this.setData({ loading: false })
    })
  },

  openNav(e) {
    const index = Number(e.currentTarget.dataset.index)
    const order = this.data.orders[index]
    if (!order || order.locationLat == null) {
      wx.showToast({ title: '无坐标', icon: 'none' })
      return
    }
    wx.openLocation({
      latitude: Number(order.locationLat),
      longitude: Number(order.locationLng),
      name: order.displayPlace || '收货点',
      address: order.address || order.phone || ''
    })
  },

  callUser(e) {
    const phone = e.currentTarget.dataset.phone
    if (!phone) return
    wx.makePhoneCall({ phoneNumber: String(phone) })
  },

  notifyArrive(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.showModal({
      title: '到门口提醒',
      content: '向用户发送「配送员已到门口」通知？',
      success: (modalRes) => {
        if (!modalRes.confirm) return
        wx.showLoading({ title: '发送中' })
        api.notifyArrivedAtDoor(id).then(res => {
          wx.hideLoading()
          if (res.code === 0) {
            wx.showToast({ title: '已发送', icon: 'success' })
          } else {
            wx.showToast({ title: res.message || '发送失败', icon: 'none' })
          }
        }).catch(err => {
          wx.hideLoading()
          wx.showToast({ title: err.message || '发送失败', icon: 'none' })
        })
      }
    })
  },

  completeOne(e) {
    const id = e.currentTarget.dataset.id
    const qty = Number(e.currentTarget.dataset.qty) || 1
    if (!id) return
    const that = this
    wx.showModal({
      title: '确认送达',
      content: '确认该单已送达？',
      success(modalRes) {
        if (!modalRes.confirm) return
        wx.showLoading({ title: '提交中' })
        api.completeOrder(id, qty).then(res => {
          wx.hideLoading()
          if (res.code === 0) {
            wx.showToast({ title: '已送达', icon: 'success' })
            that.loadOrders()
          } else {
            wx.showToast({ title: res.message || '失败', icon: 'none' })
          }
        }).catch(err => {
          wx.hideLoading()
          wx.showToast({ title: err.message || '失败', icon: 'none' })
        })
      }
    })
  },

  goPublish() {
    wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/hyc/admin/publish/publish' }) })
  }
})
