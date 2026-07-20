const api = require('../../../../services/api')
const adminSession = require('../../../../services/adminSession')

Page({
  data: {
    publicationId: '',
    title: '',
    qtyUnit: '袋',
    orders: [],
    loading: true,
    pendingCount: 0,
    completedCount: 0,
    totalNeed: 0,
    totalDelivered: 0
  },

  onLoad(options) {
    const publicationId = (options && options.publicationId) || ''
    const title = options && options.title ? decodeURIComponent(options.title) : '登记订单'
    const qtyUnit = options && options.unit ? decodeURIComponent(options.unit) : '袋'
    this.setData({ publicationId, title, qtyUnit })
    if (title) {
      wx.setNavigationBarTitle({ title })
    }
  },

  onShow() {
    if (!adminSession.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/hyc/admin/login/login' })
      return
    }
    this.loadOrders()
  },

  loadOrders() {
    const { publicationId } = this.data
    if (!publicationId) {
      this.setData({ loading: false, orders: [] })
      return
    }
    this.setData({ loading: true })
    api.listAdminOrders(publicationId).then(res => {
      if (res.code === 0) {
        const orders = (res.data || []).map(item => this.decorateOrder(item))
        this.setData({
          orders,
          ...this.summarize(orders),
          loading: false
        })
        return
      }
      if (adminSession.isLoginExpiredError(res.message)) {
        adminSession.clear()
        wx.redirectTo({ url: '/pages/hyc/admin/login/login' })
        return
      }
      wx.showToast({ title: res.message || '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }).catch(err => {
      const msg = (err && (err.message || err.errMsg)) || '加载失败'
      wx.showToast({ title: msg, icon: 'none' })
      if (adminSession.isLoginExpiredError(msg)) {
        adminSession.clear()
        wx.redirectTo({ url: '/pages/hyc/admin/login/login' })
      }
      this.setData({ loading: false })
    })
  },

  /** 拼楼栋单元门牌展示文案，并补最终数目展示 */
  decorateOrder(item) {
    const building = (item.phaseName || '') + (item.buildingName || '')
    const unit = item.unit != null ? item.unit + '单元' : ''
    const addressParts = [building, unit, item.roomNo || ''].filter(Boolean)
    const address = addressParts.length
      ? addressParts.join(' ')
      : (item.roomLabel || '未知门牌')
    const done = item.status === 'completed'
    const finalQty = done
      ? (item.deliveredQuantity != null ? item.deliveredQuantity : item.quantity)
      : null
    return Object.assign({}, item, {
      address,
      finalQtyText: finalQty != null ? String(finalQty) : '-',
      statusText: done ? '已送达' : '待配送',
      createdAtText: item.createdAt || '-',
      deliveredAtText: item.deliveredAt || '-'
    })
  },

  summarize(orders) {
    let pendingCount = 0
    let completedCount = 0
    let totalNeed = 0
    let totalDelivered = 0
    orders.forEach(item => {
      const need = item.quantity || 0
      totalNeed += need
      if (item.status === 'completed') {
        completedCount += 1
        totalDelivered += item.deliveredQuantity != null ? item.deliveredQuantity : need
      } else {
        pendingCount += 1
      }
    })
    return { pendingCount, completedCount, totalNeed, totalDelivered }
  }
})
