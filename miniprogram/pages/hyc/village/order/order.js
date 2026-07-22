const api = require('../../../../services/api')
const villagePref = require('../../../../services/villagePref')

Page({
  data: {
    publicationId: '',
    publication: null,
    contactName: '',
    phone: '',
    locationLat: null,
    locationLng: null,
    locationName: '',
    locationAddress: '',
    remark: '',
    quantity: 1
  },

  onLoad(options) {
    this.setData({ publicationId: (options && options.publicationId) || '' })
    const pref = villagePref.getPref() || {}
    this.setData({
      contactName: pref.contactName || '',
      phone: pref.phone || '',
      locationLat: pref.locationLat != null ? pref.locationLat : null,
      locationLng: pref.locationLng != null ? pref.locationLng : null,
      locationName: pref.locationName || '',
      locationAddress: pref.locationAddress || ''
    })
    this.loadPublication()
  },

  loadPublication() {
    api.listPublications({ scope: 'village' }).then(res => {
      if (res.code === 0) {
        const publication = (res.data || []).find(item =>
          item.id === this.data.publicationId && item.scope === 'village')
        this.setData({ publication: publication || null })
        if (!publication) {
          wx.showToast({ title: '仅可登记村村送发布', icon: 'none' })
        }
      }
    })
  },

  onContactInput(e) {
    this.setData({ contactName: e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
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

  /** 地图选点：得到收货坐标供管理员导航 */
  chooseLocation() {
    const that = this
    wx.chooseLocation({
      success(res) {
        that.setData({
          locationLat: res.latitude,
          locationLng: res.longitude,
          locationName: res.name || '选中位置',
          locationAddress: res.address || ''
        })
      },
      fail(err) {
        const msg = (err && err.errMsg) || ''
        if (msg.indexOf('auth deny') >= 0 || msg.indexOf('authorize') >= 0) {
          wx.showModal({
            title: '需要位置权限',
            content: '请允许使用位置，以便选择收货点',
            confirmText: '去设置',
            success(r) {
              if (r.confirm) wx.openSetting({})
            }
          })
          return
        }
        if (msg.indexOf('cancel') < 0) {
          wx.showToast({ title: '选点失败', icon: 'none' })
        }
      }
    })
  },

  submitOrder() {
    const {
      publicationId, publication, contactName, phone,
      locationLat, locationLng, locationName, locationAddress,
      remark, quantity
    } = this.data
    if (!contactName.trim()) {
      wx.showToast({ title: '请填写联系人', icon: 'none' })
      return
    }
    if (!/^1\d{10}$/.test((phone || '').trim())) {
      wx.showToast({ title: '请填写正确手机号', icon: 'none' })
      return
    }
    if (locationLat == null || locationLng == null) {
      wx.showToast({ title: '请选择收货位置', icon: 'none' })
      return
    }
    if (!publication || publication.scope !== 'village') {
      wx.showToast({ title: '仅可登记村村送发布', icon: 'none' })
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
        userName: contactName.trim(),
        phone: phone.trim(),
        locationLat,
        locationLng,
        locationName: locationName || '选中位置',
        address: locationAddress || locationName || '',
        remark: (remark || '').trim()
      })
    }).then(res => {
      wx.hideLoading()
      if (res.code === 0) {
        villagePref.savePref({
          contactName: contactName.trim(),
          phone: phone.trim(),
          locationLat,
          locationLng,
          locationName,
          locationAddress
        })
        wx.showToast({ title: '登记成功', icon: 'success' })
        setTimeout(() => {
          wx.redirectTo({ url: '/pages/hyc/village/mine/mine' })
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
