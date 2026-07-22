const api = require('../../../../services/api')
const communityPref = require('../../../../services/communityPref')
const addressCascade = require('../../../../services/addressCascade')
const orderStatus = require('../../../../services/orderStatus')
const courierMapTrack = require('../../../../services/courierMapTrack')
const publicationImages = require('../../../../services/publicationImages')

Page({
  data: {
    loading: true,
    order: null,
    canEditAddress: false,
    canCancel: false,
    editingAddress: false,
    saving: false,
    showCourierMap: false,
    courierSharing: false,
    courierTip: '',
    mapLatitude: 30.57,
    mapLongitude: 114.30,
    mapMarkers: [],
    mapPolylines: [],
    mapIncludePoints: [],
    communityId: '',
    addressLabel: '',
    phases: [],
    phaseNames: [],
    phaseIndex: 0,
    buildingNames: [],
    buildingIndex: 0,
    unitOptions: [],
    unitIndex: 0,
    rooms: [],
    roomLabels: [],
    roomIndex: 0,
    selectedRoom: null,
    searchKeyword: '',
    searchResults: []
  },

  onLoad(options) {
    this.orderId = (options && options.id) || ''
    this._userDest = null
    const pref = communityPref.getPref() || communityPref.getDefault()
    this.setData({ communityId: pref.communityId })
    addressCascade.bindAddressCascade(this, {
      getCommunityId: () => this.data.communityId
    })
    // 小区闪送门牌无坐标：用当前用户定位当收货点，画出「箱子→你」路线
    this._courierTrack = courierMapTrack.createCourierMapTrack(this, {
      getOrderId: () => this.orderId,
      isActive: () => this.data.showCourierMap,
      getDest: () => this._userDest
    })
    this.ensureUserDest()
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

  ensureUserDest() {
    const that = this
    wx.getLocation({
      type: 'gcj02',
      success(res) {
        that._userDest = {
          latitude: res.latitude,
          longitude: res.longitude
        }
        if (that.data.courierSharing && that._courierTrack) {
          that._courierTrack.refresh()
        }
      }
    })
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
      const canEditAddress = order.status === 'pending' && !!order.roomId
      const canCancel = order.status === 'pending'
      const showCourierMap = canEditAddress
      this.setData({
        order,
        canEditAddress,
        canCancel,
        showCourierMap,
        addressLabel: order.roomLabel || '',
        editingAddress: false,
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

  openEditAddress() {
    if (!this.data.canEditAddress) {
      wx.showToast({ title: '已送达，无法改地址', icon: 'none' })
      return
    }
    const order = this.data.order
    this.setData({ editingAddress: true, searchKeyword: '', searchResults: [] })
    this.resolvePreferFromOrder(order).then(prefer => {
      this.loadPhasesForAddress(prefer)
    })
  },

  closeEditAddress() {
    this.setData({
      editingAddress: false,
      searchKeyword: '',
      searchResults: []
    })
  },

  /** 用订单门牌反查期数/楼栋，便于级联回显 */
  resolvePreferFromOrder(order) {
    const fallback = {
      roomId: order.roomId,
      unit: order.unit
    }
    if (!order.roomNo) {
      return Promise.resolve(fallback)
    }
    return api.searchRooms(String(order.roomNo), this.data.communityId).then(res => {
      const list = (res.code === 0 && res.data) ? res.data : []
      const room = list.find(item => item.id === order.roomId) || list[0]
      if (!room) {
        return fallback
      }
      return {
        phaseId: room.phaseId,
        buildingId: room.buildingId,
        unit: room.unit != null ? room.unit : order.unit,
        roomId: order.roomId
      }
    }).catch(() => fallback)
  },

  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ searchKeyword: keyword })
    if (!keyword.trim()) {
      this.setData({ searchResults: [] })
      return
    }
    api.searchRooms(keyword, this.data.communityId).then(res => {
      if (res.code === 0) {
        this.setData({ searchResults: res.data || [] })
      }
    })
  },

  selectSearchResult(e) {
    const index = e.currentTarget.dataset.index
    const room = this.data.searchResults[index]
    this.setData({
      selectedRoom: room,
      addressLabel: room.label,
      searchResults: [],
      searchKeyword: ''
    })
  },

  saveAddress() {
    if (this.data.saving) return
    const room = this.data.selectedRoom
    if (!room || !room.id) {
      wx.showToast({ title: '请选择门牌', icon: 'none' })
      return
    }
    const order = this.data.order
    if (order && room.id === order.roomId) {
      this.setData({ editingAddress: false })
      wx.showToast({ title: '地址未变化', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    wx.showLoading({ title: '保存中' })
    api.updateOrderAddress(this.orderId, room.id).then(res => {
      wx.hideLoading()
      this.setData({ saving: false })
      if (res.code !== 0) {
        wx.showToast({ title: res.message || '保存失败', icon: 'none' })
        return
      }
      const next = orderStatus.withFlashStatus(res.data || {})
      this.setData({
        order: next,
        addressLabel: next.roomLabel || room.label,
        editingAddress: false,
        canEditAddress: next.status === 'pending' && !!next.roomId
      })
      wx.showToast({ title: '地址已更新', icon: 'success' })
    }).catch(err => {
      wx.hideLoading()
      this.setData({ saving: false })
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    })
  },

  cancelOrder() {
    if (!this.data.canCancel || !this.orderId) {
      return
    }
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
