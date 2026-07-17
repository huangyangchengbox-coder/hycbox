const api = require('../../../../services/api')
const adminSession = require('../../../../services/adminSession')

const DELETE_WIDTH = 70

Page({
  data: {
    showForm: false,
    username: '',
    password: '',
    displayName: '',
    admins: [],
    loading: true,
    saving: false
  },

  onShow() {
    if (!adminSession.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/hyc/admin/login/login' })
      return
    }
    if (wx.getStorageSync('hyc_is_super_admin') !== '1') {
      wx.showToast({ title: '无超级管理员权限', icon: 'none' })
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/hyc/admin/publish/publish' })
      }, 800)
      return
    }
    this.loadAdmins()
  },

  toggleForm() {
    const showForm = !this.data.showForm
    this.setData({
      showForm,
      username: showForm ? this.data.username : '',
      password: showForm ? this.data.password : '',
      displayName: showForm ? this.data.displayName : ''
    })
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  onDisplayNameInput(e) {
    this.setData({ displayName: e.detail.value })
  },

  loadAdmins() {
    this.setData({ loading: true })
    api.listAdminUsers().then(res => {
      if (res.code === 0) {
        const admins = (res.data || []).map(item => Object.assign({}, item, { offsetX: 0 }))
        this.setData({ admins })
      } else {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' })
        if (adminSession.isLoginExpiredError(res.message)) {
          adminSession.clear()
          wx.redirectTo({ url: '/pages/hyc/admin/login/login' })
        }
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  closeAllSwipe(exceptIndex) {
    const admins = this.data.admins.map((item, idx) => {
      if (idx === exceptIndex) {
        return item
      }
      return Object.assign({}, item, { offsetX: 0 })
    })
    this.setData({ admins })
  },

  onTouchStart(e) {
    const index = e.currentTarget.dataset.index
    const touch = e.touches[0]
    this._swipe = {
      index,
      startX: touch.clientX,
      startY: touch.clientY,
      startOffset: this.data.admins[index] ? (this.data.admins[index].offsetX || 0) : 0,
      locked: false
    }
    this.closeAllSwipe(index)
  },

  onTouchMove(e) {
    if (!this._swipe) {
      return
    }
    const touch = e.touches[0]
    const dx = touch.clientX - this._swipe.startX
    const dy = touch.clientY - this._swipe.startY
    if (!this._swipe.locked) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        this._swipe = null
        return
      }
      if (Math.abs(dx) > 8) {
        this._swipe.locked = true
      }
    }
    if (!this._swipe.locked) {
      return
    }
    let offsetX = this._swipe.startOffset + dx
    if (offsetX > 0) {
      offsetX = 0
    }
    if (offsetX < -DELETE_WIDTH) {
      offsetX = -DELETE_WIDTH
    }
    const admins = this.data.admins.slice()
    const idx = this._swipe.index
    if (!admins[idx]) {
      return
    }
    admins[idx] = Object.assign({}, admins[idx], { offsetX: offsetX })
    this.setData({ admins: admins })
  },

  onTouchEnd() {
    if (!this._swipe) {
      return
    }
    const index = this._swipe.index
    const current = this.data.admins[index] ? (this.data.admins[index].offsetX || 0) : 0
    const finalOffset = current < -DELETE_WIDTH / 2 ? -DELETE_WIDTH : 0
    const admins = this.data.admins.slice()
    if (admins[index]) {
      admins[index] = Object.assign({}, admins[index], { offsetX: finalOffset })
      this.setData({ admins: admins })
    }
    this._swipe = null
  },

  confirmDelete(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name || '该管理员'
    wx.showModal({
      title: '删除管理员',
      content: `确定删除「${name}」？删除后无法登录。`,
      success: (modalRes) => {
        if (!modalRes.confirm) {
          return
        }
        api.deleteAdminUser(id).then(res => {
          if (res.code === 0) {
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadAdmins()
          } else {
            wx.showToast({ title: res.message || '删除失败', icon: 'none' })
          }
        }).catch(err => {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' })
        })
      }
    })
  },

  submitCreate() {
    const username = (this.data.username || '').trim()
    const password = (this.data.password || '').trim()
    const displayName = (this.data.displayName || '').trim()
    if (!username || !password) {
      wx.showToast({ title: '请填写账号和密码', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    api.createAdminUser({ username, password, displayName }).then(res => {
      if (res.code === 0) {
        wx.showToast({ title: '添加成功', icon: 'success' })
        this.setData({
          username: '',
          password: '',
          displayName: '',
          showForm: false
        })
        this.loadAdmins()
      } else {
        wx.showToast({ title: res.message || '添加失败', icon: 'none' })
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '添加失败', icon: 'none' })
    }).finally(() => {
      this.setData({ saving: false })
    })
  },

  goPublish() {
    wx.redirectTo({ url: '/pages/hyc/admin/publish/publish' })
  },

  goDelivery() {
    wx.redirectTo({ url: '/pages/hyc/admin/delivery/delivery' })
  },

  goMine() {
    wx.redirectTo({ url: '/pages/hyc/admin/mine/mine' })
  }
})
