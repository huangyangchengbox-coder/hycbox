const api = require('../../../../services/api')

Page({
  data: {
    title: '',
    totalBags: '',
    imageUrl: '',
    publications: []
  },

  onShow() {
    this.loadPublications()
  },

  loadPublications() {
    api.listPublications().then(res => {
      if (res.code === 0) {
        this.setData({ publications: res.data || [] })
      }
    })
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onBagsInput(e) {
    this.setData({ totalBags: e.detail.value })
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
    if (!title.trim()) {
      wx.showToast({ title: '请填写名称', icon: 'none' })
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
      imageUrl
    }).then(res => {
      wx.hideLoading()
      if (res.code === 0) {
        wx.showToast({ title: '发布成功', icon: 'success' })
        this.setData({ title: '', totalBags: '', imageUrl: '' })
        this.loadPublications()
      }
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: err.message || '发布失败', icon: 'none' })
    })
  },

  goDelivery() {
    wx.redirectTo({ url: '/pages/hyc/admin/delivery/delivery' })
  },

  switchRole() {
    wx.redirectTo({ url: '/pages/hyc/index' })
  }
})
