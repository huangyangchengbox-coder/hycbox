const api = require('../../../../services/api')
const communityPref = require('../../../../services/communityPref')
const buildingHelper = require('../../../../data/buildingHelper')
const addressCascade = require('../../../../services/addressCascade')

Page({
  data: {
    communities: [],
    communityNames: [],
    communityIndex: 0,
    phases: [],
    phaseNames: [],
    phaseIndex: 0,
    hasPhases: false,
    buildingNames: [],
    buildingIndex: 0,
    unitOptions: [],
    unitIndex: 0,
    rooms: [],
    roomLabels: [],
    roomIndex: 0,
    selectedRoom: null,
    loading: true,
    fromChange: false
  },

  onLoad(options) {
    this.fromChange = !!(options && options.change === '1')
    this.setData({ fromChange: this.fromChange })
    addressCascade.bindAddressCascade(this, {
      getCommunityId: () => {
        const community = this.data.communities[this.data.communityIndex]
        return community ? community.id : buildingHelper.getDefaultCommunityId()
      }
    })
    // 先用内置默认小区铺底，避免接口慢/失败时空白
    this.applyList(buildingHelper.listCommunities())
    this.loadCommunities()
  },

  loadCommunities() {
    this.setData({ loading: true })
    api.listCommunities().then(res => {
      const list = (res.code === 0 && res.data && res.data.length)
        ? res.data
        : buildingHelper.listCommunities()
      this.applyList(list)
    }).catch(() => {
      this.applyList(buildingHelper.listCommunities())
    })
  },

  applyList(list) {
    if (!list || list.length === 0) {
      list = [{
        id: 'hengda_mingdu',
        name: '宜昌·恒大名都',
        address: '夷陵区东城大道与东方大道交汇处',
        hasPhases: true,
        phases: [
          { id: 'phase1', name: '一期' },
          { id: 'phase2', name: '二期' },
          { id: 'phase3', name: '三期' }
        ]
      }]
    }
    const pref = communityPref.getPref() || communityPref.getDefault()
    let communityIndex = list.findIndex(c => c.id === pref.communityId)
    if (communityIndex < 0) {
      communityIndex = 0
    }
    this.setData({
      communities: list,
      communityNames: list.map(c => c.name),
      communityIndex,
      loading: false
    })
    this.applyCommunity(communityIndex, pref, list)
  },

  applyCommunity(communityIndex, prefer, listOverride) {
    const list = listOverride || this.data.communities
    const community = list[communityIndex]
    if (!community) {
      return
    }
    const phasesMeta = community.phases || []
    const hasPhases = !!community.hasPhases && phasesMeta.length > 0
    this.setData({
      communityIndex,
      hasPhases
    })
    // 拉完整楼栋数据并按偏好回填
    this.loadPhasesForAddress(prefer || {})
  },

  onCommunityChange(e) {
    const communityIndex = Number(e.detail.value)
    this.applyCommunity(communityIndex, {})
  },

  confirm() {
    const community = this.data.communities[this.data.communityIndex]
    if (!community) {
      wx.showToast({ title: '请选择小区', icon: 'none' })
      return
    }
    if (this.data.hasPhases && this.data.phases.length === 0) {
      wx.showToast({ title: '该小区暂无期数', icon: 'none' })
      return
    }
    if (!this.data.selectedRoom) {
      wx.showToast({ title: '请选择门牌号', icon: 'none' })
      return
    }
    const addressPref = this.buildAddressPref(community)
    communityPref.savePref(addressPref)
    console.log('[community] 默认地址已保存', addressPref.roomLabel || addressPref.roomId)
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => {
      if (this.fromChange) {
        wx.navigateBack({
          fail: () => {
            wx.redirectTo({ url: '/pages/hyc/user/mine/mine' })
          }
        })
      } else {
        wx.redirectTo({ url: '/pages/hyc/user/mine/mine' })
      }
    }, 400)
  }
})
