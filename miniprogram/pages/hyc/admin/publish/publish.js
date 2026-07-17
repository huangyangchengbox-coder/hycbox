const api = require('../../../../services/api')
const adminSession = require('../../../../services/adminSession')

Page({
  data: {
    showForm: false,
    title: '',
    totalBags: '',
    imageUrl: '',
    unitOptions: ['袋', '箱', '个', '份', '件', '其他'],
    unitIndex: 0,
    unitOtherIndex: 5,
    customUnit: '',
    currentUnit: '袋',
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
    this.loadPublications()
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
      imageUrl: showForm ? this.data.imageUrl : '',
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
    const { title, totalBags, imageUrl } = this.data
    const bags = Number(totalBags)
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

    wx.showLoading({ title: '发布中' })
    api.createPublication({
      title: title.trim(),
      totalBags: bags,
      unit: unit,
      imageUrl
    }).then(res => {
      wx.hideLoading()
      if (res.code === 0) {
        wx.showToast({ title: '发布成功', icon: 'success' })
        this.setData({
          showForm: false,
          title: '',
          totalBags: '',
          imageUrl: '',
          unitIndex: 0,
          customUnit: '',
          currentUnit: '袋'
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

  goDelivery() {
    wx.redirectTo({ url: '/pages/hyc/admin/delivery/delivery' })
  },

  goMine() {
    wx.redirectTo({ url: '/pages/hyc/admin/mine/mine' })
  }
})
