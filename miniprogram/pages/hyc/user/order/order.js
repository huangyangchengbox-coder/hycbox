const api = require('../../../../services/api')
const communityPref = require('../../../../services/communityPref')

Page({
  data: {
    publicationId: '',
    publication: null,
    communityId: '',
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
    const pref = communityPref.getPref() || communityPref.getDefault()
    this.setData({
      publicationId: options.publicationId || '',
      communityId: pref.communityId
    })
    this.prefPhaseId = pref.phaseId || ''
    this.loadPublication()
    this.loadPhases()
  },

  loadPublication() {
    const pref = communityPref.getPref() || communityPref.getDefault()
    api.listPublications({
      communityId: pref.communityId,
      phaseId: pref.phaseId || undefined
    }).then(res => {
      if (res.code === 0) {
        const publication = (res.data || []).find(item => item.id === this.data.publicationId)
        this.setData({ publication: publication || null })
      }
    })
  },

  loadPhases() {
    api.getPhases(this.data.communityId).then(res => {
      if (res.code === 0) {
        const phases = res.data || []
        let phaseIndex = 0
        if (this.prefPhaseId) {
          const idx = phases.findIndex(p => p.id === this.prefPhaseId)
          if (idx >= 0) {
            phaseIndex = idx
          }
        }
        this.setData({
          phases,
          phaseNames: phases.map(item => item.name)
        })
        if (phases.length > 0) {
          this.refreshBuildings(phaseIndex)
        }
      }
    })
  },

  refreshBuildings(phaseIndex) {
    const phase = this.data.phases[phaseIndex]
    if (!phase) {
      return
    }
    const buildingNames = phase.buildings.map(item => item.name)
    this.setData({
      phaseIndex,
      buildingNames,
      buildingIndex: 0
    })
    this.refreshUnits(0)
  },

  refreshUnits(buildingIndex) {
    const phase = this.data.phases[this.data.phaseIndex]
    const building = phase && phase.buildings[buildingIndex]
    if (!building) {
      return
    }
    const unitOptions = []
    for (let i = 1; i <= building.units; i += 1) {
      unitOptions.push(`${i}单元`)
    }
    this.setData({
      buildingIndex,
      unitOptions,
      unitIndex: 0
    })
    this.loadRooms(building, 1)
  },

  loadRooms(building, unit) {
    const phase = this.data.phases[this.data.phaseIndex]
    api.getRooms({
      communityId: this.data.communityId,
      phaseId: phase.id,
      buildingId: building.id,
      unit
    }).then(res => {
      if (res.code === 0) {
        const rooms = res.data || []
        this.setData({
          rooms,
          roomLabels: rooms.map(item => item.roomNo || ''),
          roomIndex: 0,
          selectedRoom: rooms[0] || null
        })
      }
    })
  },

  onPhaseChange(e) {
    this.refreshBuildings(Number(e.detail.value))
  },

  onBuildingChange(e) {
    this.refreshUnits(Number(e.detail.value))
  },

  onUnitChange(e) {
    const unitIndex = Number(e.detail.value)
    const phase = this.data.phases[this.data.phaseIndex]
    const building = phase.buildings[this.data.buildingIndex]
    const unit = unitIndex + 1
    this.setData({ unitIndex })
    this.loadRooms(building, unit)
  },

  onRoomChange(e) {
    const roomIndex = Number(e.detail.value)
    this.setData({
      roomIndex,
      selectedRoom: this.data.rooms[roomIndex] || null
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
    this.setData({
      selectedRoom: room,
      searchResults: []
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

    wx.showLoading({ title: '提交中' })
    api.createOrder({
      publicationId,
      roomId: selectedRoom.id,
      quantity,
      userName: userName.trim(),
      remark: (remark || '').trim()
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
