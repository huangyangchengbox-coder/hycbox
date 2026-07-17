const api = require('../../../../services/api')
const communityPref = require('../../../../services/communityPref')
const buildingHelper = require('../../../../data/buildingHelper')

Page({
  data: {
    communities: [],
    communityNames: [],
    communityIndex: 0,
    phases: [],
    phaseNames: [],
    phaseIndex: 0,
    hasPhases: false,
    loading: true,
    fromChange: false
  },

  onLoad(options) {
    this.fromChange = !!(options && options.change === '1')
    this.setData({ fromChange: this.fromChange })
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
      // 极端兜底：硬编码宜昌·恒大名都
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
    this.applyCommunity(communityIndex, pref.phaseId, list)
  },

  applyCommunity(communityIndex, preferPhaseId, listOverride) {
    const list = listOverride || this.data.communities
    const community = list[communityIndex]
    if (!community) {
      return
    }
    const phases = community.phases || []
    const hasPhases = !!community.hasPhases && phases.length > 0
    let phaseIndex = 0
    if (hasPhases && preferPhaseId) {
      const idx = phases.findIndex(p => p.id === preferPhaseId)
      if (idx >= 0) {
        phaseIndex = idx
      }
    }
    this.setData({
      communityIndex,
      phases,
      phaseNames: phases.map(p => p.name),
      phaseIndex,
      hasPhases
    })
  },

  onCommunityChange(e) {
    const communityIndex = Number(e.detail.value)
    this.applyCommunity(communityIndex, '')
  },

  onPhaseChange(e) {
    this.setData({ phaseIndex: Number(e.detail.value) })
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
    let phaseId = ''
    let phaseName = ''
    if (this.data.hasPhases) {
      const phase = this.data.phases[this.data.phaseIndex]
      if (!phase) {
        wx.showToast({ title: '请选择期数', icon: 'none' })
        return
      }
      phaseId = phase.id
      phaseName = phase.name
    }
    communityPref.savePref({
      communityId: community.id,
      communityName: community.name,
      phaseId,
      phaseName,
      hasPhases: this.data.hasPhases
    })
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => {
      if (this.fromChange) {
        wx.navigateBack({ fail: () => {
          wx.redirectTo({ url: '/pages/hyc/user/home/home?stay=1' })
        }})
      } else {
        wx.redirectTo({ url: '/pages/hyc/user/home/home?stay=1' })
      }
    }, 400)
  }
})
