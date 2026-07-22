const api = require('../../../../services/api')
const communityPref = require('../../../../services/communityPref')
const addressCascade = require('../../../../services/addressCascade')
const publicationImages = require('../../../../services/publicationImages')

Page({
  data: {
    publicationId: '',
    publication: null,
    communityId: '',
    addressLabel: '',
    // 临时改址面板；关闭时不影响默认地址
    editingAddress: false,
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
    searchResults: [],
    userName: '',
    remark: '',
    quantity: 1
  },

  onLoad(options) {
    const pref = communityPref.getPref()
    if (!pref || !pref.roomId) {
      wx.redirectTo({ url: '/pages/hyc/user/community/community' })
      return
    }
    this.defaultPref = pref
    this.setData({
      publicationId: options.publicationId || '',
      communityId: pref.communityId,
      addressLabel: communityPref.formatLabel(pref)
    })
    addressCascade.bindAddressCascade(this, {
      getCommunityId: () => this.data.communityId
    })
    this.loadPublication()
    this.applyDefaultRoom(pref)
  },

  /** 用默认地址构造选中房间，不打开编辑面板 */
  applyDefaultRoom(pref) {
    this.setData({
      selectedRoom: {
        id: pref.roomId,
        communityId: pref.communityId,
        communityName: pref.communityName,
        phaseId: pref.phaseId,
        phaseName: pref.phaseName,
        buildingId: pref.buildingId,
        buildingName: pref.buildingName,
        unit: pref.unit,
        roomNo: pref.roomNo,
        label: pref.roomLabel || communityPref.formatLabel(pref)
      },
      addressLabel: communityPref.formatLabel(pref),
      editingAddress: false
    })
  },

  loadPublication() {
    const pref = this.defaultPref || communityPref.getPref()
    if (!pref) {
      return
    }
    api.listPublications({
      communityId: pref.communityId,
      phaseId: pref.phaseId || undefined
    }).then(res => {
      if (res.code === 0) {
        const publication = publicationImages.normalizePublicationImages(
          (res.data || []).find(item => item.id === this.data.publicationId)
        )
        this.setData({ publication: publication || null })
      }
    })
  },

  previewPubImages(e) {
    const current = e.currentTarget.dataset.url
    publicationImages.previewPublicationImages(this.data.publication, current)
  },

  /** 打开临时改址：仅影响本次登记 */
  openEditAddress() {
    const pref = this.defaultPref || communityPref.getPref() || {}
    this.setData({ editingAddress: true })
    this.loadPhasesForAddress({
      phaseId: (this.data.selectedRoom && this.data.selectedRoom.phaseId) || pref.phaseId,
      buildingId: (this.data.selectedRoom && this.data.selectedRoom.buildingId) || pref.buildingId,
      unit: (this.data.selectedRoom && this.data.selectedRoom.unit) || pref.unit,
      roomId: (this.data.selectedRoom && this.data.selectedRoom.id) || pref.roomId
    })
  },

  /** 收起临时改址面板，保留当前选中房间（仍不写默认） */
  closeEditAddress() {
    if (!this.data.selectedRoom) {
      wx.showToast({ title: '请选择门牌', icon: 'none' })
      return
    }
    this.setData({
      editingAddress: false,
      addressLabel: this.data.selectedRoom.label,
      searchKeyword: '',
      searchResults: []
    })
  },

  /** 恢复为默认地址 */
  resetToDefault() {
    const pref = this.defaultPref || communityPref.getPref()
    if (!pref) {
      return
    }
    this.applyDefaultRoom(pref)
    this.setData({
      searchKeyword: '',
      searchResults: []
    })
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
    // 搜索结果只改本次登记地址
    this.setData({
      selectedRoom: room,
      addressLabel: room.label,
      searchResults: [],
      searchKeyword: ''
    })
  },

  onNameInput(e) {
    this.setData({ userName: e.detail.value })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  changeQuantity(e) {
    const delta = Number(e.currentTarget.dataset.delta)
    let quantity = this.data.quantity + delta
    const max = this.data.publication ? this.data.publication.remainBags : 99
    if (quantity < 1) {
      quantity = 1
    }
    if (quantity > max) {
      quantity = max
    }
    this.setData({ quantity })
  },

  submitOrder() {
    const { publicationId, selectedRoom, userName, remark, quantity, publication } = this.data
    if (!selectedRoom) {
      wx.showToast({ title: '请选择门牌', icon: 'none' })
      return
    }
    if (!userName.trim()) {
      wx.showToast({ title: '请填写称呼', icon: 'none' })
      return
    }
    if (!publication || quantity > publication.remainBags) {
      wx.showToast({ title: '数量超出剩余', icon: 'none' })
      return
    }

    const userSubscribe = require('../../../../services/userSubscribe')
    userSubscribe.requestUserOrderSubscribe().then(() => {
      wx.showLoading({ title: '提交中' })
      return api.createOrder({
        publicationId,
        roomId: selectedRoom.id,
        quantity,
        userName: userName.trim(),
        remark: (remark || '').trim()
      })
    }).then(res => {
      wx.hideLoading()
      if (res.code === 0) {
        wx.showToast({ title: '提交成功', icon: 'success' })
        setTimeout(() => {
          wx.redirectTo({ url: '/pages/hyc/user/mine/mine' })
        }, 800)
      } else {
        wx.showToast({ title: res.message || '提交失败', icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: err.message || '提交失败', icon: 'none' })
    })
  }
})
