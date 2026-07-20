const api = require('../../../../services/api')
const adminSession = require('../../../../services/adminSession')
const exportTxt = require('../../../../services/exportTxt')

Page({
  data: {
    publicationId: '',
    title: '',
    qtyUnit: '袋',
    /** verify=收款核实 / ship=待发货 */
    tab: 'verify',
    verifyGroups: [],
    shipGroups: [],
    loading: true,
    shippingId: '',
    verifyingId: ''
  },

  onLoad(options) {
    this.setData({
      publicationId: (options && options.publicationId) || '',
      title: options && options.title ? decodeURIComponent(options.title) : '物流发货',
      qtyUnit: options && options.unit ? decodeURIComponent(options.unit) : '袋'
    })
    if (this.data.title) {
      wx.setNavigationBarTitle({ title: this.data.title })
    }
  },

  onShow() {
    if (!adminSession.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/hyc/admin/login/login' })
      return
    }
    this.loadGroups()
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab || tab === this.data.tab) return
    this.setData({ tab })
  },

  /** 应收金额 = 单价 × 数量 */
  calcPayAmount(unitPrice, qty) {
    const p = Number(unitPrice) || 0
    const q = Number(qty) || 0
    return (Math.round(p * q * 100) / 100).toFixed(2)
  },

  enrichVerifyGroups(groups) {
    return (groups || []).map(g => ({
      ...g,
      orders: (g.orders || []).map(o => {
        const expectAmount = this.calcPayAmount(o.unitPrice, o.quantity)
        return {
          ...o,
          expectAmount,
          payAmount: expectAmount,
          payMethod: o.payMethod || 'wechat'
        }
      })
    }))
  },

  loadGroups() {
    const { publicationId } = this.data
    if (!publicationId) return
    this.setData({ loading: true })
    Promise.all([
      api.groupPayVerifyByProvince(publicationId),
      api.groupPendingByProvince(publicationId)
    ]).then(([verifyRes, shipRes]) => {
      if (verifyRes.code !== 0) {
        throw new Error(verifyRes.message || '待核实加载失败')
      }
      if (shipRes.code !== 0) {
        throw new Error(shipRes.message || '待发货加载失败')
      }
      this.setData({
        verifyGroups: this.enrichVerifyGroups(verifyRes.data || []),
        shipGroups: shipRes.data || [],
        loading: false
      })
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      this.setData({ loading: false })
    })
  },

  onVerifyPayMethod(e) {
    const { province, id, method } = e.currentTarget.dataset
    if (!province || !id || !method) return
    const groups = this.data.verifyGroups || []
    const next = groups.map(g => {
      if (g.province !== province) return g
      return {
        ...g,
        orders: (g.orders || []).map(o => (
          o.id === id ? { ...o, payMethod: method } : o
        ))
      }
    })
    this.setData({ verifyGroups: next })
  },

  /** 手动调整核实金额 */
  onVerifyPayAmount(e) {
    const { province, id } = e.currentTarget.dataset
    if (!province || !id) return
    const value = (e.detail.value || '').trim()
    this.patchVerifyOrder(province, id, { payAmount: value })
  },

  /** 点击加减调整核实金额（步进 1 元） */
  changeVerifyPayAmount(e) {
    const { province, id } = e.currentTarget.dataset
    const delta = Number(e.currentTarget.dataset.delta) || 0
    if (!province || !id || !delta) return
    const group = (this.data.verifyGroups || []).find(g => g.province === province)
    const order = group && (group.orders || []).find(o => o.id === id)
    if (!order) return
    const cur = Number(order.payAmount)
    const base = Number.isNaN(cur) ? 0 : cur
    let next = Math.round((base + delta) * 100) / 100
    if (next < 0) next = 0
    this.patchVerifyOrder(province, id, { payAmount: next.toFixed(2) })
  },

  patchVerifyOrder(province, id, fields) {
    const groups = this.data.verifyGroups || []
    const next = groups.map(g => {
      if (g.province !== province) return g
      return {
        ...g,
        orders: (g.orders || []).map(o => (
          o.id === id ? { ...o, ...fields } : o
        ))
      }
    })
    this.setData({ verifyGroups: next })
  },

  verifyPay(e) {
    const orderId = e.currentTarget.dataset.id
    const province = e.currentTarget.dataset.province
    if (!orderId || this.data.verifyingId) return
    const group = (this.data.verifyGroups || []).find(g => g.province === province)
    const order = group && (group.orders || []).find(o => o.id === orderId)
    if (!order) return
    const payAmount = Number(order.payAmount)
    if (order.payAmount === '' || Number.isNaN(payAmount) || payAmount < 0) {
      wx.showToast({ title: '请填写有效核实金额', icon: 'none' })
      return
    }
    const payMethod = order.payMethod || 'wechat'
    const methodLabel = payMethod === 'alipay' ? '支付宝' : '微信'
    wx.showModal({
      title: '核实收款',
      content: `确认已收到 ¥${order.payAmount}（${methodLabel}）？核实后进入待发货`,
      success: (modalRes) => {
        if (!modalRes.confirm) return
        this.setData({ verifyingId: orderId })
        wx.showLoading({ title: '核实中' })
        api.verifyPay(orderId, payAmount, payMethod).then(res => {
          wx.hideLoading()
          this.setData({ verifyingId: '' })
          if (res.code === 0) {
            wx.showToast({ title: '已核实', icon: 'success' })
            this.loadGroups()
          } else {
            wx.showToast({ title: res.message || '核实失败', icon: 'none' })
          }
        }).catch(err => {
          wx.hideLoading()
          this.setData({ verifyingId: '' })
          wx.showToast({ title: err.message || '核实失败', icon: 'none' })
        })
      }
    })
  },

  goShipped() {
    const { publicationId, title, qtyUnit } = this.data
    wx.navigateTo({
      url: `/pages/hyc/admin/express-shipped/express-shipped?publicationId=${publicationId}&title=${encodeURIComponent(title)}&unit=${encodeURIComponent(qtyUnit)}&tab=shipped`
    })
  },

  /** 导出待发货：每行「地址 手机号 昵称」 */
  exportShipTxt() {
    const groups = this.data.shipGroups || []
    const orders = []
    for (let i = 0; i < groups.length; i++) {
      const list = groups[i].orders || []
      for (let j = 0; j < list.length; j++) {
        orders.push(list[j])
      }
    }
    if (!orders.length) {
      wx.showToast({ title: '暂无待发货可导出', icon: 'none' })
      return
    }
    const content = exportTxt.buildPendingShipTxt(orders)
    const fileName = `待发货_${this.data.title || '物流'}`
    wx.showLoading({ title: '导出中' })
    exportTxt.exportTxt(fileName, content).then((result) => {
      wx.hideLoading()
      if (result.mode === 'clipboard') {
        wx.showModal({
          title: '已复制到剪贴板',
          content: `共 ${orders.length} 条，可粘贴到记事本保存为 txt`,
          showCancel: false
        })
        return
      }
      wx.showToast({ title: `已导出 ${orders.length} 条`, icon: 'success' })
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: err.message || '导出失败', icon: 'none' })
    })
  },

  shipOrder(e) {
    const orderId = e.currentTarget.dataset.id
    if (!orderId || this.data.shippingId) return
    // 一人可多件快递：一次选多张凭证
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = res.tempFiles || []
        if (!files.length) {
          wx.showToast({ title: '请选择发货照片', icon: 'none' })
          return
        }
        this.setData({ shippingId: orderId })
        wx.showLoading({ title: '发货中' })
        Promise.all(files.map(f => api.uploadImage(f.tempFilePath))).then(results => {
          const urls = results
            .filter(r => r && r.code === 0 && r.data && r.data.url)
            .map(r => r.data.url)
          if (!urls.length) {
            throw new Error('上传失败')
          }
          return api.shipOrder(orderId, urls)
        }).then(shipRes => {
          wx.hideLoading()
          this.setData({ shippingId: '' })
          if (shipRes.code === 0) {
            wx.showToast({ title: '发货成功', icon: 'success' })
            this.loadGroups()
          } else {
            wx.showToast({ title: shipRes.message || '发货失败', icon: 'none' })
          }
        }).catch(err => {
          wx.hideLoading()
          this.setData({ shippingId: '' })
          wx.showToast({ title: err.message || '发货失败', icon: 'none' })
        })
      }
    })
  }
})
