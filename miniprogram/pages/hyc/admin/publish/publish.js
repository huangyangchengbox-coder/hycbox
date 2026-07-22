const api = require('../../../../services/api')
const adminSession = require('../../../../services/adminSession')
const communityPref = require('../../../../services/communityPref')

Page({
  data: {
    showForm: false,
    title: '',
    totalBags: '',
    unitPrice: '',
    imageUrls: [],
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
    /** 各期勾选：{ id, name, checked } */
    phaseChecks: [],
    hasPhases: false,
    /** community | nationwide | village */
    scope: 'community',
    scopeOptions: ['小区闪送', '物流中国（全国）', '村村送'],
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
      phaseChecks: phases.map(p => ({ id: p.id, name: p.name, checked: true })),
      hasPhases
    })
  },

  onCommunityChange(e) {
    this.applyCommunity(Number(e.detail.value))
  },

  onPhaseChecksChange(e) {
    const selected = {}
    ;(e.detail.value || []).forEach(id => { selected[id] = true })
    const phaseChecks = (this.data.phaseChecks || []).map(item => Object.assign({}, item, {
      checked: !!selected[item.id]
    }))
    this.setData({ phaseChecks })
  },

  onScopeChange(e) {
    const scopeIndex = Number(e.detail.value)
    let scope = 'community'
    if (scopeIndex === 1) scope = 'nationwide'
    if (scopeIndex === 2) scope = 'village'
    this.setData({
      scopeIndex,
      scope
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
      imageUrls: showForm ? this.data.imageUrls : [],
      unitIndex: showForm ? this.data.unitIndex : 0,
      customUnit: showForm ? this.data.customUnit : '',
      currentUnit: showForm ? this.data.currentUnit : '袋'
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
    const remain = 9 - (this.data.imageUrls || []).length
    if (remain <= 0) {
      wx.showToast({ title: '最多 9 张图', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      success: (res) => {
        const files = (res.tempFiles || []).map(f => f.tempFilePath).filter(Boolean)
        if (!files.length) return
        wx.showLoading({ title: '上传中' })
        Promise.all(files.map(path => api.uploadImage(path))).then(results => {
          wx.hideLoading()
          const urls = results
            .filter(r => r && r.code === 0 && r.data && r.data.url)
            .map(r => r.data.url)
          if (!urls.length) {
            wx.showToast({ title: '上传失败', icon: 'none' })
            return
          }
          const imageUrls = (this.data.imageUrls || []).concat(urls).slice(0, 9)
          this.setData({ imageUrls })
          wx.showToast({
            title: urls.length < files.length ? `已上传 ${urls.length} 张` : '上传成功',
            icon: 'success'
          })
        }).catch(err => {
          wx.hideLoading()
          console.error('uploadImage failed', err)
          wx.showToast({ title: (err && err.message) || '上传失败', icon: 'none' })
        })
      }
    })
  },

  removeImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    const imageUrls = (this.data.imageUrls || []).slice()
    if (index < 0 || index >= imageUrls.length) return
    imageUrls.splice(index, 1)
    this.setData({ imageUrls })
  },

  previewImages(e) {
    const current = e.currentTarget.dataset.url
    const urls = this.data.imageUrls || []
    if (!urls.length) return
    wx.previewImage({ urls, current: current || urls[0] })
  },

  submitPublish() {
    const {
      title, totalBags, unitPrice, imageUrls, communities, communityIndex,
      hasPhases, phaseChecks, scope
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

    const basePayload = {
      title: title.trim(),
      totalBags: bags,
      unit: unit,
      unitPrice: price,
      imageUrls: imageUrls || [],
      imageUrl: (imageUrls && imageUrls[0]) || '',
      scope: scope || 'community'
    }

    /** 按勾选期组装发布请求：全选=一期不限；多选=各期各发一条 */
    const payloads = []
    if (scope === 'community') {
      const community = communities[communityIndex]
      if (!community) {
        wx.showToast({ title: '请选择小区', icon: 'none' })
        return
      }
      const selected = (phaseChecks || []).filter(p => p.checked)
      if (hasPhases && selected.length === 0) {
        wx.showToast({ title: '请至少勾选一期', icon: 'none' })
        return
      }
      const allSelected = hasPhases && selected.length === phaseChecks.length
      if (!hasPhases || allSelected) {
        payloads.push(Object.assign({}, basePayload, {
          communityId: community.id,
          communityName: community.name
        }))
      } else {
        selected.forEach(phase => {
          payloads.push(Object.assign({}, basePayload, {
            communityId: community.id,
            communityName: community.name,
            phaseId: phase.id,
            phaseName: phase.name
          }))
        })
      }
    } else {
      payloads.push(basePayload)
    }

    wx.showLoading({ title: '发布中' })
    Promise.all(payloads.map(p => api.createPublication(p))).then(results => {
      wx.hideLoading()
      const fail = results.find(res => !res || res.code !== 0)
      if (fail) {
        wx.showToast({ title: (fail && fail.message) || '发布失败', icon: 'none' })
        return
      }
      wx.showToast({ title: payloads.length > 1 ? `已发布 ${payloads.length} 期` : '发布成功', icon: 'success' })
      const phaseChecksReset = (this.data.phaseChecks || []).map(p => Object.assign({}, p, { checked: true }))
      this.setData({
        showForm: false,
        title: '',
        totalBags: '',
        unitPrice: '',
        imageUrl: '',
        unitIndex: 0,
        customUnit: '',
        currentUnit: '袋',
        imageUrls: [],
        phaseChecks: phaseChecksReset,
        scope: 'community',
        scopeIndex: 0
      })
      this.loadPublications()
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
    if (scope === 'village') {
      wx.navigateTo({
        url: `/pages/hyc/admin/village-delivery/village-delivery?publicationId=${id}&title=${encodeURIComponent(title)}&unit=${encodeURIComponent(unit)}`
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

  editPublication(e) {
    const id = e.currentTarget.dataset.id
    const title = e.currentTarget.dataset.title || ''
    const price = e.currentTarget.dataset.price
    const total = e.currentTarget.dataset.total
    const remain = e.currentTarget.dataset.remain
    if (!id) return
    wx.showModal({
      title: '修改单价',
      editable: true,
      placeholderText: String(price != null ? price : ''),
      success: (priceRes) => {
        if (!priceRes.confirm) return
        const unitPrice = (priceRes.content || '').trim()
        wx.showModal({
          title: '修改总库存',
          content: `当前剩余 ${remain}/${total}。新总量不能小于已售。`,
          editable: true,
          placeholderText: String(total != null ? total : ''),
          success: (stockRes) => {
            if (!stockRes.confirm) return
            const totalBags = (stockRes.content || '').trim()
            const payload = {}
            if (unitPrice !== '') payload.unitPrice = Number(unitPrice)
            if (totalBags !== '') payload.totalBags = Number(totalBags)
            if (!Object.keys(payload).length) {
              wx.showToast({ title: '未修改', icon: 'none' })
              return
            }
            wx.showLoading({ title: '保存中' })
            api.updatePublication(id, payload).then(res => {
              wx.hideLoading()
              if (res.code === 0) {
                wx.showToast({ title: '已更新', icon: 'success' })
                this.loadPublications()
              } else {
                wx.showToast({ title: res.message || '更新失败', icon: 'none' })
              }
            }).catch(err => {
              wx.hideLoading()
              wx.showToast({ title: err.message || '更新失败', icon: 'none' })
            })
          }
        })
      }
    })
  },

  goMine() {
    wx.redirectTo({ url: '/pages/hyc/admin/mine/mine' })
  }
})
