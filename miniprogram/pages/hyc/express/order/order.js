const api = require('../../../../services/api')
const provinces = require('../../../../data/provinces')

Page({
  data: {
    publicationId: '',
    publication: null,
    provinces,
    provinceIndex: 0,
    nickname: '',
    phone: '',
    address: '',
    remark: '',
    quantity: 1
  },

  onLoad(options) {
    this.setData({ publicationId: (options && options.publicationId) || '' })
    this.loadPublication()
  },

  loadPublication() {
    api.listPublications({ scope: 'nationwide' }).then(res => {
      if (res.code === 0) {
        const publication = (res.data || []).find(item => item.id === this.data.publicationId)
        this.setData({ publication: publication || null })
      }
    })
  },

  onProvinceChange(e) {
    this.setData({ provinceIndex: Number(e.detail.value) })
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onAddressInput(e) {
    this.setData({ address: e.detail.value })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  changeQuantity(e) {
    const delta = Number(e.currentTarget.dataset.delta)
    let quantity = this.data.quantity + delta
    const max = this.data.publication ? this.data.publication.remainBags : 99
    if (quantity < 1) quantity = 1
    if (quantity > max) quantity = max
    this.setData({ quantity })
  },

  submitOrder() {
    const { publicationId, publication, provinces, provinceIndex, nickname, phone, address, remark, quantity } = this.data
    if (!nickname.trim()) {
      wx.showToast({ title: '请填写昵称', icon: 'none' })
      return
    }
    if (!/^1\d{10}$/.test((phone || '').trim())) {
      wx.showToast({ title: '请填写正确手机号', icon: 'none' })
      return
    }
    if (!address.trim()) {
      wx.showToast({ title: '请填写收货地址', icon: 'none' })
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
        quantity,
        userName: nickname.trim(),
        phone: phone.trim(),
        address: address.trim(),
        province: provinces[provinceIndex],
        remark: (remark || '').trim()
      })
    }).then(res => {
      wx.hideLoading()
      if (res.code === 0) {
        wx.showToast({ title: '登记成功', icon: 'success' })
        setTimeout(() => {
          wx.redirectTo({ url: '/pages/hyc/express/mine/mine' })
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
