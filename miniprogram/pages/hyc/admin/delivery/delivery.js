const config = require('../../../../services/config')
const adminSession = require('../../../../services/adminSession')

function getToken() {
  try {
    return adminSession.getToken() || wx.getStorageSync('hyc_admin_token') || ''
  } catch (e) {
    return wx.getStorageSync('hyc_admin_token') || ''
  }
}

function requestGet(path, data, timeoutMs) {
  let url = config.baseUrl + path
  if (data) {
    const keys = Object.keys(data)
    const parts = []
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]
      const v = data[k]
      if (v !== undefined && v !== null && v !== '') {
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v))
      }
    }
    if (parts.length) {
      url += (url.indexOf('?') >= 0 ? '&' : '?') + parts.join('&')
    }
  }
  const header = {}
  const token = getToken()
  if (token) {
    header['X-Admin-Token'] = token
  }
  return new Promise(function (resolve, reject) {
    wx.request({
      url: url,
      method: 'GET',
      header: header,
      timeout: timeoutMs || 20000,
      success: function (res) {
        console.log('[delivery]', path, res.statusCode, res.data)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data || {})
        } else {
          reject(new Error((res.data && res.data.message) || ('HTTP ' + res.statusCode)))
        }
      },
      fail: function (err) {
        console.error('[delivery] fail', path, err)
        reject(new Error((err && err.errMsg) || '网络失败'))
      }
    })
  })
}

Page({
  data: {
    ready: true,
    loading: true,
    statusText: '正在加载配送数据…',
    emptyHint: '',
    hasGroups: false,
    buildingGroups: [],
    pubTitles: ['全部待配送'],
    pubIndex: 0,
    publications: [],
    currentPubId: 'all',
    qtyUnit: '份',
    selectedCount: 0,
    selectedBags: 0,
    showConfirm: false,
    confirmList: [],
    confirmCount: 0,
    confirmBags: 0,
    remarkTip: {
      show: false,
      roomNo: '',
      userName: '',
      content: ''
    },
    stats: {
      pendingCount: 0,
      pendingBags: 0,
      completedCount: 0,
      completedBags: 0,
      extraCount: 0,
      extraBags: 0
    }
  },

  noop: function () {},

  onLoad: function () {
    console.log('[delivery] onLoad')
  },

  onShow: function () {
    console.log('[delivery] onShow token=', !!getToken())
    let loggedIn = false
    try {
      loggedIn = adminSession.isLoggedIn()
    } catch (e) {
      loggedIn = !!getToken()
    }
    if (!loggedIn) {
      this.setData({
        loading: false,
        statusText: '未登录，请先登录管理员',
        emptyHint: '未登录'
      })
      wx.redirectTo({ url: '/pages/hyc/admin/login/login' })
      return
    }
    this.loadAll()
  },

  loadAll: function () {
    const that = this
    this.setData({
      loading: true,
      statusText: '正在加载配送数据…',
      emptyHint: '',
      showConfirm: false,
      confirmList: []
    })
    Promise.all([
      requestGet('/admin/publications', null, 15000).catch(function (err) {
        return { code: -1, message: err.message }
      }),
      requestGet('/admin/stats', null, 15000).catch(function (err) {
        return { code: -1, message: err.message }
      })
    ]).then(function (results) {
      const pubRes = results[0] || {}
      const statsRes = results[1] || {}
      if (that.needRelogin(pubRes) || that.needRelogin(statsRes)) {
        return
      }
      const publications = (pubRes.code === 0 && pubRes.data) ? pubRes.data : []
      const pubTitles = ['全部待配送']
      for (let i = 0; i < publications.length; i++) {
        const p = publications[i]
        const u = p.unit || '袋'
        pubTitles.push((p.title || '未命名') + '（剩余' + (p.remainBags || 0) + u + '）')
      }
      const stats = (statsRes.code === 0 && statsRes.data) ? statsRes.data : that.data.stats
      that.setData({
        publications: publications,
        pubTitles: pubTitles,
        pubIndex: 0,
        currentPubId: 'all',
        qtyUnit: '份',
        stats: {
          pendingCount: stats.pendingCount || 0,
          pendingBags: stats.pendingBags || 0,
          completedCount: stats.completedCount || 0,
          completedBags: stats.completedBags || 0,
          extraCount: stats.extraCount || 0,
          extraBags: stats.extraBags || 0
        },
        statusText: '正在加载楼栋配送列表…'
      })
      that.loadGroups('all')
    }).catch(function (err) {
      const msg = (err && err.message) || '加载失败'
      that.setData({
        loading: false,
        statusText: msg,
        emptyHint: msg,
        hasGroups: false,
        buildingGroups: []
      })
    })
  },

  loadGroups: function (publicationId) {
    const that = this
    const data = (!publicationId || publicationId === 'all') ? null : { publicationId: publicationId }
    requestGet('/admin/orders/group-by-building', data, 30000).then(function (groupRes) {
      if (that.needRelogin(groupRes)) {
        return
      }
      const groups = []
      if (groupRes.code === 0 && groupRes.data && groupRes.data.length) {
        for (let idx = 0; idx < groupRes.data.length; idx++) {
          const item = groupRes.data[idx]
          const orders = []
          const rawOrders = item.orders || []
          for (let j = 0; j < rawOrders.length; j++) {
            const o = rawOrders[j]
            const qty = o.quantity || 0
            orders.push({
              id: o.id,
              roomNo: o.roomNo || '',
              roomLabel: o.roomLabel || '',
              userName: o.userName || '',
              quantity: qty,
              deliverQty: qty,
              qtyUnit: o.qtyUnit || '袋',
              remark: o.remark || '',
              selected: false
            })
          }
          groups.push({
            groupKey: 'g' + idx,
            phaseName: item.phaseName || '',
            buildingName: item.buildingName || '',
            unit: item.unit || 1,
            orderCount: item.orderCount || 0,
            totalBags: item.totalBags || 0,
            expanded: true,
            orders: orders
          })
        }
      }
      let pendingUsers = 0
      for (let i = 0; i < groups.length; i++) {
        pendingUsers += groups[i].orderCount
      }
      // 全部批次时，若订单单位一致则用该单位，否则用「份」
      let qtyUnit = that.data.qtyUnit || '份'
      if (that.data.currentPubId === 'all') {
        let firstUnit = ''
        let same = true
        for (let g = 0; g < groups.length && same; g++) {
          const orders = groups[g].orders || []
          for (let j = 0; j < orders.length; j++) {
            const u = orders[j].qtyUnit || '袋'
            if (!firstUnit) {
              firstUnit = u
            } else if (firstUnit !== u) {
              same = false
              break
            }
          }
        }
        qtyUnit = same && firstUnit ? firstUnit : '份'
      }
      let statusText = ''
      let emptyHint = ''
      if (groupRes.code !== 0) {
        statusText = groupRes.message || '楼栋列表加载失败'
        emptyHint = statusText
      } else if (!groups.length) {
        statusText = '暂无待配送订单'
        emptyHint = '暂无待配送订单（用户下单后会出现在这里）'
      } else {
        statusText = '共 ' + groups.length + ' 个单元 · ' + pendingUsers + ' 户'
      }
      that.setData({
        loading: false,
        buildingGroups: groups,
        hasGroups: groups.length > 0,
        selectedCount: 0,
        selectedBags: 0,
        qtyUnit: qtyUnit,
        showConfirm: false,
        confirmList: [],
        statusText: statusText,
        emptyHint: emptyHint
      })
    }).catch(function (err) {
      const msg = (err && err.message) || '楼栋列表加载失败'
      that.setData({
        loading: false,
        hasGroups: false,
        buildingGroups: [],
        selectedCount: 0,
        selectedBags: 0,
        statusText: msg,
        emptyHint: msg + '（可下拉或切换批次重试）'
      })
    })
  },

  needRelogin: function (res) {
    if (!res || res.code === 0) {
      return false
    }
    const msg = res.message || ''
    if (msg.indexOf('登录') >= 0 || msg.indexOf('失效') >= 0) {
      try {
        adminSession.clear()
      } catch (e) {}
      this.setData({
        loading: false,
        statusText: msg,
        emptyHint: msg
      })
      wx.showToast({ title: '请重新登录', icon: 'none' })
      setTimeout(function () {
        wx.redirectTo({ url: '/pages/hyc/admin/login/login' })
      }, 400)
      return true
    }
    return false
  },

  onPubChange: function (e) {
    const that = this
    const pubIndex = Number(e.detail.value)
    let currentPubId = 'all'
    let qtyUnit = '份'
    if (pubIndex > 0 && this.data.publications[pubIndex - 1]) {
      currentPubId = this.data.publications[pubIndex - 1].id
      qtyUnit = this.data.publications[pubIndex - 1].unit || '袋'
    }
    this.setData({
      pubIndex: pubIndex,
      currentPubId: currentPubId,
      qtyUnit: qtyUnit,
      loading: true,
      statusText: '加载中…'
    })
    const data = currentPubId === 'all' ? null : { publicationId: currentPubId }
    requestGet('/admin/stats', data, 15000).then(function (statsRes) {
      if (statsRes.code === 0 && statsRes.data) {
        that.setData({
          stats: {
            pendingCount: statsRes.data.pendingCount || 0,
            pendingBags: statsRes.data.pendingBags || 0,
            completedCount: statsRes.data.completedCount || 0,
            completedBags: statsRes.data.completedBags || 0,
            extraCount: statsRes.data.extraCount || 0,
            extraBags: statsRes.data.extraBags || 0
          }
        })
      }
    }).catch(function () {})
    this.loadGroups(currentPubId)
  },

  toggleGroup: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    const group = this.data.buildingGroups[index]
    if (!group) {
      return
    }
    const patch = {}
    patch['buildingGroups[' + index + '].expanded'] = !group.expanded
    this.setData(patch)
  },

  toggleSelect: function (e) {
    const gid = Number(e.currentTarget.dataset.gid)
    const oindex = Number(e.currentTarget.dataset.oindex)
    const group = this.data.buildingGroups[gid]
    if (!group || !group.orders || !group.orders[oindex]) {
      return
    }
    const order = group.orders[oindex]
    const selected = !order.selected
    const qty = Number(order.quantity) || 0
    const patch = {}
    patch['buildingGroups[' + gid + '].orders[' + oindex + '].selected'] = selected
    patch.selectedCount = this.data.selectedCount + (selected ? 1 : -1)
    patch.selectedBags = this.data.selectedBags + (selected ? qty : -qty)
    this.setData(patch)
  },

  showRemark: function (e) {
    const gid = Number(e.currentTarget.dataset.gid)
    const oindex = Number(e.currentTarget.dataset.oindex)
    const group = this.data.buildingGroups[gid]
    if (!group || !group.orders || !group.orders[oindex]) {
      return
    }
    const order = group.orders[oindex]
    if (!order.remark) {
      return
    }
    this.setData({
      remarkTip: {
        show: true,
        roomNo: order.roomNo || '',
        userName: order.userName || '',
        content: order.remark
      }
    })
  },

  hideRemark: function () {
    this.setData({
      remarkTip: {
        show: false,
        roomNo: '',
        userName: '',
        content: ''
      }
    })
  },

  getSelectedOrders: function () {
    const list = []
    const groups = this.data.buildingGroups || []
    for (let g = 0; g < groups.length; g++) {
      const orders = groups[g].orders || []
      for (let i = 0; i < orders.length; i++) {
        if (orders[i].selected) {
          list.push(orders[i])
        }
      }
    }
    return list
  },

  clearSelection: function () {
    const groups = this.data.buildingGroups || []
    const patch = {
      selectedCount: 0,
      selectedBags: 0
    }
    let has = false
    for (let g = 0; g < groups.length; g++) {
      const orders = groups[g].orders || []
      for (let i = 0; i < orders.length; i++) {
        if (orders[i].selected) {
          patch['buildingGroups[' + g + '].orders[' + i + '].selected'] = false
          has = true
        }
      }
    }
    if (!has && this.data.selectedCount === 0) {
      return
    }
    this.setData(patch)
  },

  /** 整单元：全选并打开确认面板 */
  deliverUnit: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    const groups = this.data.buildingGroups || []
    const group = groups[index]
    if (!group || !group.orders || !group.orders.length) {
      wx.showToast({ title: '本单元暂无待配送', icon: 'none' })
      return
    }
    const patch = {}
    let selectedCount = 0
    let selectedBags = 0
    for (let g = 0; g < groups.length; g++) {
      const orders = groups[g].orders || []
      const shouldSelect = g === index
      for (let i = 0; i < orders.length; i++) {
        if (orders[i].selected !== shouldSelect) {
          patch['buildingGroups[' + g + '].orders[' + i + '].selected'] = shouldSelect
        }
        if (shouldSelect) {
          selectedCount += 1
          selectedBags += Number(orders[i].quantity) || 0
        }
      }
    }
    if (!group.expanded) {
      patch['buildingGroups[' + index + '].expanded'] = true
    }
    patch.selectedCount = selectedCount
    patch.selectedBags = selectedBags
    const that = this
    this.setData(patch, function () {
      that.openConfirm()
    })
  },

  openConfirm: function () {
    const selected = this.getSelectedOrders()
    if (!selected.length) {
      wx.showToast({ title: '请先选择门牌', icon: 'none' })
      return
    }
    const confirmList = []
    let confirmBags = 0
    for (let i = 0; i < selected.length; i++) {
      const o = selected[i]
      const qty = Number(o.quantity) || 0
      const deliverQty = qty
      confirmBags += deliverQty
      confirmList.push({
        id: o.id,
        roomNo: o.roomNo || '',
        userName: o.userName || '',
        remark: o.remark || '',
        quantity: qty,
        deliverQty: deliverQty,
        qtyUnit: o.qtyUnit || this.data.qtyUnit || '袋'
      })
    }
    this.setData({
      showConfirm: true,
      confirmList: confirmList,
      confirmCount: confirmList.length,
      confirmBags: confirmBags
    })
  },

  closeConfirm: function () {
    this.setData({ showConfirm: false })
  },

  decDeliverQty: function (e) {
    this.changeDeliverQty(Number(e.currentTarget.dataset.index), -1)
  },

  incDeliverQty: function (e) {
    this.changeDeliverQty(Number(e.currentTarget.dataset.index), 1)
  },

  changeDeliverQty: function (index, delta) {
    const list = this.data.confirmList || []
    if (!list[index]) {
      return
    }
    const item = list[index]
    const ordered = Number(item.quantity) || 0
    const cur = Number(item.deliverQty) || 0
    const next = cur + delta
    const unit = item.qtyUnit || this.data.qtyUnit || '袋'
    if (next < 0) {
      wx.showToast({ title: '最少 0 ' + unit, icon: 'none' })
      return
    }
    if (next > 99) {
      wx.showToast({ title: '请核对数量', icon: 'none' })
      return
    }
    if (delta > 0 && next > ordered) {
      wx.showToast({
        title: '超出申请 ' + (next - ordered) + ' ' + unit,
        icon: 'none',
        duration: 1200
      })
    }
    const patch = {}
    patch['confirmList[' + index + '].deliverQty'] = next
    patch.confirmBags = this.data.confirmBags - cur + next
    this.setData(patch)
  },

  submitConfirm: function () {
    const list = this.data.confirmList || []
    if (!list.length) {
      return
    }
    const that = this
    const unit = this.data.qtyUnit || '份'
    wx.showModal({
      title: '提交送达',
      content: '确认送达 ' + list.length + ' 户，共 ' + this.data.confirmBags + ' ' + unit + '？',
      success: function (modalRes) {
        if (!modalRes.confirm) {
          return
        }
        that.batchComplete(list)
      }
    })
  },

  batchComplete: function (orders) {
    const that = this
    wx.showLoading({ title: '提交中' })
    let index = 0
    let ok = 0
    let failMsg = ''
    function next() {
      if (index >= orders.length) {
        wx.hideLoading()
        that.setData({ showConfirm: false })
        if (ok === orders.length) {
          wx.showToast({ title: '已完成 ' + ok + ' 户', icon: 'success' })
        } else {
          wx.showToast({
            title: '完成 ' + ok + '/' + orders.length + (failMsg ? ('：' + failMsg) : ''),
            icon: 'none'
          })
        }
        that.loadAll()
        return
      }
      const order = orders[index]
      index += 1
      const delivered = order.deliverQty !== undefined ? Number(order.deliverQty) : (Number(order.quantity) || 1)
      that.requestComplete(order.id, delivered).then(function () {
        ok += 1
        next()
      }).catch(function (err) {
        failMsg = (err && err.message) || '失败'
        next()
      })
    }
    next()
  },

  requestComplete: function (orderId, deliveredQuantity) {
    const token = getToken()
    return new Promise(function (resolve, reject) {
      wx.request({
        url: config.baseUrl + '/orders/' + orderId + '/complete',
        method: 'PUT',
        header: {
          'Content-Type': 'application/json',
          'X-Admin-Token': token
        },
        data: { deliveredQuantity: deliveredQuantity },
        success: function (res) {
          const body = res.data || {}
          if (body.code === 0) {
            resolve(body)
          } else {
            reject(new Error(body.message || '失败'))
          }
        },
        fail: function () {
          reject(new Error('网络失败'))
        }
      })
    })
  },

  goPublish: function () {
    wx.redirectTo({ url: '/pages/hyc/admin/publish/publish' })
  },

  goMine: function () {
    wx.redirectTo({ url: '/pages/hyc/admin/mine/mine' })
  }
})
