const api = require('../../../../services/api')
const adminSession = require('../../../../services/adminSession')
const communityPref = require('../../../../services/communityPref')

Page({
  data: {
    showForm: false,
    title: '',
    totalBags: '',
    unitPrice: '',
    imageUrl: '',
    unitOptions: ['袋', '箱', '个', '份', '件', '其他'],
    unitIndex: 0,
    unitOtherIndex: 5,
    customUnit: '',
    currentUnit: '袋',
    communities: [],
    communityNames: [],
    communityIndex: 0,
    phases: [],
    phaseNames: [],
    phaseIndex: 0,
    hasPhases: false,
    /** 面向全部期 */
    allPhases: true,
    /** community | nationwide */
    scope: 'community',
    scopeOptions: ['小区闪送', '物流中国（全国）'],
    scopeIndex: 0,
    publications: [],
    adminName: '',
    isSuperAdmin: false
  },

  onShow() {
    if (!adminSession.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/hyc/admin/login/login' })
      return
    }
    this.setData({
      adminName: wx.getStorageSync('hyc_admin_name') || '管理者',
      isSuperAdmin: wx.getStorageSync('hyc_is_super_admin') === '1'
    })
    this.loadCommunities()
    this.loadPublications()
  },

  loadCommunities() {
    api.listCommunities().then(res => {
      const list = (res.code === 0 && res.data && res.data.length)
        ? res.data
        : require('../../../../data/buildingHelper').listCommunities()
      if (list.length === 0) {
        return
      }
      const pref = communityPref.getPref() || communityPref.getDefault()
      let communityIndex = list.findIndex(c => c.id === pref.communityId)
      if (communityIndex < 0) {
        communityIndex = 0
      }
      this.setData({
        communities: list,
        communityNames: list.map(c => c.name),
        communityIndex
      })
      this.applyCommunity(communityIndex, list)
    }).catch(() => {
      const list = require('../../../../data/buildingHelper').listCommunities()
      if (!list.length) {
        return
      }
      this.setData({
        communities: list,
        communityNames: list.map(c => c.name),
        communityIndex: 0
      })
      this.applyCommunity(0, list)
    })
  },

  applyCommunity(communityIndex, listOverride) {
    const list = listOverride || this.data.communities
    const community = list[communityIndex]
    if (!community) {
      return
    }
    const phases = community.phases || []
    const hasPhases = !!community.hasPhases && phases.length > 0
    this.setData({
      communityIndex,
      phases,
      phaseNames: phases.map(p => p.name),
      phaseIndex: 0,
      hasPhases,
      allPhases: hasPhases
    })
  },

  onCommunityChange(e) {
    this.applyCommunity(Number(e.detail.value))
  },

  onPhaseChange(e) {
    this.setData({
      phaseIndex: Number(e.detail.value),
      allPhases: false
    })
  },

  onAllPhasesSwitch(e) {
    this.setData({ allPhases: !!e.detail.value })
  },

  onScopeChange(e) {
    const scopeIndex = Number(e.detail.value)
    this.setData({
      scopeIndex,
      scope: scopeIndex === 1 ? 'nationwide' : 'community'
    })
  },

  loadPublications() {
    api.listAdminPublications().then(res => {
      if (res.code === 0) {
        this.setData({ publications: res.data || [] })
      } else if (adminSession.isLoginExpiredError(res.message)) {
        adminSession.clear()
        wx.redirectTo({ url: '/pages/hyc/admin/login/login' })
      } else {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' })
      }
    }).catch(err => {
      const msg = (err && (err.message || err.errMsg)) || '加载失败'
      wx.showToast({ title: msg, icon: 'none' })
      if (adminSession.isLoginExpiredError(msg)) {
        adminSession.clear()
        wx.redirectTo({ url: '/pages/hyc/admin/login/login' })
      }
    })
  },

  toggleForm() {
    const showForm = !this.data.showForm
    this.setData({
      showForm,
      title: showForm ? this.data.title : '',
      totalBags: showForm ? this.data.totalBags : '',
      unitPrice: showForm ? this.data.unitPrice : '',
      imageUrl: showForm ? this.data.imageUrl : '',
      unitIndex: showForm ? this.data.unitIndex : 0,
      customUnit: showForm ? this.data.customUnit : '',
      currentUnit: showForm ? this.data.currentUnit : '袋',
      allPhases: showForm ? this.data.allPhases : true
    })
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onBagsInput(e) {
    this.setData({ totalBags: e.detail.value })
  },

  onUnitPriceInput(e) {
    this.setData({ unitPrice: e.detail.value })
  },

  onUnitChange(e) {
    const unitIndex = Number(e.detail.value)
    const currentUnit = unitIndex === this.data.unitOtherIndex
      ? ((this.data.customUnit || '').trim() || '其他')
      : this.data.unitOptions[unitIndex]
    this.setData({ unitIndex, currentUnit })
  },

  onCustomUnitInput(e) {
    const customUnit = e.detail.value
    this.setData({
      customUnit,
      currentUnit: (customUnit || '').trim() || '其他'
    })
  },

  resolveUnit() {
    if (this.data.unitIndex === this.data.unitOtherIndex) {
      const custom = (this.data.customUnit || '').trim()
      return custom || ''
    }
    return this.data.unitOptions[this.data.unitIndex] || '袋'
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const filePath = res.tempFiles[0].tempFilePath
        wx.showLoading({ title: '上传中' })
        api.uploadImage(filePath).then(uploadRes => {
          wx.hideLoading()
          if (uploadRes.code === 0 && uploadRes.data && uploadRes.data.url) {
            this.setData({ imageUrl: uploadRes.data.url })
            wx.showToast({ title: '上传成功', icon: 'success' })
          } else {
            wx.showToast({ title: (uploadRes && uploadRes.message) || '上传失败', icon: 'none' })
          }
        }).catch(err => {
          wx.hideLoading()
          console.error('uploadImage failed', err)
          wx.showToast({ title: (err && err.message) || '上传失败', icon: 'none' })
        })
      }
    })
  },

  submitPublish() {
    const {
      title, totalBags, unitPrice, imageUrl, communities, communityIndex,
      hasPhases, allPhases, phases, phaseIndex, scope
    } = this.data
    const bags = Number(totalBags)
    const price = Number(unitPrice)
    const unit = this.resolveUnit()
    if (!title.trim()) {
      wx.showToast({ title: '请填写名称', icon: 'none' })
      return
    }
    if (!unit) {
      wx.showToast({ title: '请填写计量单位', icon: 'none' })
      return
    }
    if (!bags || bags <= 0) {
      wx.showToast({ title: '请填写有效数量', icon: 'none' })
      return
    }
    if (unitPrice === '' || Number.isNaN(price) || price < 0) {
      wx.showToast({ title: '请填写单价', icon: 'none' })
      return
    }

    const payload = {
      title: title.trim(),
      totalBags: bags,
      unit: unit,
      unitPrice: price,
      imageUrl,
      scope: scope || 'community'
    }

    if (scope !== 'nationwide') {
      const community = communities[communityIndex]
      if (!community) {
        wx.showToast({ title: '请选择小区', icon: 'none' })
        return
      }
      let phaseId
      let phaseName = ''
      if (hasPhases && !allPhases) {
        const phase = phases[phaseIndex]
        if (!phase) {
          wx.showToast({ title: '请选择期数', icon: 'none' })
          return
        }
        phaseId = phase.id
        phaseName = phase.name
      }
      payload.communityId = community.id
      payload.communityName = community.name
      payload.phaseId = phaseId || undefined
      payload.phaseName = phaseName || undefined
    }

    wx.showLoading({ title: '发布中' })
    api.createPublication(payload).then(res => {
      wx.hideLoading()
      if (res.code === 0) {
        wx.showToast({ title: '发布成功', icon: 'success' })
        this.setData({
          showForm: false,
          title: '',
          totalBags: '',
          unitPrice: '',
          imageUrl: '',
          unitIndex: 0,
          customUnit: '',
          currentUnit: '袋',
          allPhases: true,
          scope: 'community',
          scopeIndex: 0
        })
        this.loadPublications()
      } else {
        wx.showToast({ title: res.message || '发布失败', icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: err.message || '发布失败', icon: 'none' })
    })
  },

  goDeliverOrShip(e) {
    const id = e.currentTarget.dataset.id
    const title = e.currentTarget.dataset.title || ''
    const unit = e.currentTarget.dataset.unit || '袋'
    const scope = e.currentTarget.dataset.scope || 'community'
    if (!id) {
      return
    }
    if (scope === 'nationwide') {
      wx.navigateTo({
        url: `/pages/hyc/admin/express-orders/express-orders?publicationId=${id}&title=${encodeURIComponent(title)}&unit=${encodeURIComponent(unit)}`
      })
      return
    }
    wx.navigateTo({
      url: `/pages/hyc/admin/delivery/delivery?publicationId=${id}&title=${encodeURIComponent(title)}&unit=${encodeURIComponent(unit)}`
    })
  },

  goPubOrders(e) {
    const id = e.currentTarget.dataset.id
    const title = e.currentTarget.dataset.title || ''
    const unit = e.currentTarget.dataset.unit || '袋'
    const scope = e.currentTarget.dataset.scope || 'community'
    if (!id) {
      return
    }
    // 全国：登记明细（登记列表 + 已发货列表）；小区：登记列表
    if (scope === 'nationwide') {
      wx.navigateTo({
        url: `/pages/hyc/admin/express-shipped/express-shipped?publicationId=${id}&title=${encodeURIComponent(title)}&unit=${encodeURIComponent(unit)}`
      })
      return
    }
    wx.navigateTo({
      url: `/pages/hyc/admin/pub-orders/pub-orders?publicationId=${id}&title=${encodeURIComponent(title)}&unit=${encodeURIComponent(unit)}`
    })
  },

  endActivity(e) {
    const id = e.currentTarget.dataset.id
    const title = e.currentTarget.dataset.title || '该活动'
    wx.showModal({
      title: '结束活动',
      content: `确定结束「${title}」？结束后用户将无法再登记派送，已登记订单仍可继续配送。`,
      success: (modalRes) => {
        if (!modalRes.confirm) {
          return
        }
        wx.showLoading({ title: '处理中' })
        api.endPublication(id).then(res => {
          wx.hideLoading()
          if (res.code === 0) {
            wx.showToast({ title: '已结束', icon: 'success' })
            this.loadPublications()
          } else {
            wx.showToast({ title: res.message || '操作失败', icon: 'none' })
          }
        }).catch(err => {
          wx.hideLoading()
          wx.showToast({ title: err.message || '操作失败', icon: 'none' })
        })
      }
    })
  },

  goMine() {
    wx.redirectTo({ url: '/pages/hyc/admin/mine/mine' })
  }
})
