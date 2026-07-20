const api = require('../../../../services/api')
const adminSession = require('../../../../services/adminSession')

function statusText(status) {
  if (status === 'shipped') return '已发货'
  if (status === 'paid') return '待发货'
  if (status === 'pending') return '待核实'
  return status || '未知'
}

Page({
  data: {
    publicationId: '',
    title: '',
    qtyUnit: '袋',
    /** register=登记列表 / shipped=已发货列表 */
    tab: 'register',
    allOrders: [],
    registerOrders: [],
    shippedOrders: [],
    loading: true
  },

  onLoad(options) {
    const tab = options && options.tab === 'shipped' ? 'shipped' : 'register'
    this.setData({
      publicationId: (options && options.publicationId) || '',
      title: options && options.title ? decodeURIComponent(options.title) : '登记明细',
      qtyUnit: options && options.unit ? decodeURIComponent(options.unit) : '袋',
      tab
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
    this.loadOrders()
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab || tab === this.data.tab) return
    this.setData({ tab })
  },

  loadOrders() {
    const { publicationId } = this.data
    if (!publicationId) return
    this.setData({ loading: true })
    api.listAdminOrders(publicationId).then(res => {
      if (res.code === 0) {
        const allOrders = (res.data || []).map(item => Object.assign({}, item, {
          statusText: statusText(item.status)
        }))
        const registerOrders = allOrders
        const shippedOrders = allOrders.filter(item => item.status === 'shipped')
        this.setData({
          allOrders,
          registerOrders,
          shippedOrders,
          loading: false
        })
        return
      }
      wx.showToast({ title: res.message || '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      this.setData({ loading: false })
    })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/hyc/admin/express-detail/express-detail?orderId=${id}` })
  }
})
