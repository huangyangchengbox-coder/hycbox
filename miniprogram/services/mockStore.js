/**
 * Mock 内存数据存储，模拟后端数据库
 */
const { getRoomById } = require('../data/buildingHelper')

function nowStr() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

let idSeq = 1000
function nextId(prefix) {
  idSeq += 1
  return `${prefix}_${idSeq}`
}

const store = {
  publications: [
    {
      id: 'pub_1',
      title: '新鲜苹果',
      imageUrl: 'https://img.yzcdn.cn/vant/cat.jpeg',
      totalBags: 50,
      remainBags: 38,
      unit: '袋',
      status: 'active',
      createdAt: '2026-07-17 09:00:00'
    }
  ],
  orders: [
    {
      id: 'ord_1',
      publicationId: 'pub_1',
      userId: 'user_demo',
      userName: '张先生',
      roomId: 'phase1_2_1_1501',
      roomLabel: '一期2号楼 1单元 1501',
      buildingName: '2号楼',
      phaseName: '一期',
      quantity: 2,
      status: 'pending',
      createdAt: '2026-07-17 09:30:00',
      deliveredAt: null
    },
    {
      id: 'ord_2',
      publicationId: 'pub_1',
      userId: 'user_demo2',
      userName: '李女士',
      roomId: 'phase2_19_1_0802',
      roomLabel: '二期19号楼 1单元 0802',
      buildingName: '19号楼',
      phaseName: '二期',
      quantity: 1,
      status: 'pending',
      createdAt: '2026-07-17 10:00:00',
      deliveredAt: null
    }
  ]
}

function listPublications() {
  return store.publications
    .filter(item => item.status === 'active')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

function getPublication(id) {
  return store.publications.find(item => item.id === id) || null
}

function createPublication(payload) {
  const item = {
    id: nextId('pub'),
    title: payload.title || '水果',
    imageUrl: payload.imageUrl || '',
    totalBags: payload.totalBags,
    remainBags: payload.totalBags,
    unit: payload.unit || '袋',
    status: 'active',
    createdAt: nowStr()
  }
  store.publications.unshift(item)
  return item
}

function createOrder(payload) {
  const publication = getPublication(payload.publicationId)
  if (!publication) {
    throw new Error('发布不存在')
  }
  if (payload.quantity > publication.remainBags) {
    throw new Error('剩余数量不足')
  }
  const room = getRoomById(payload.roomId)
  if (!room) {
    throw new Error('门牌不存在')
  }
  publication.remainBags -= payload.quantity
  const order = {
    id: nextId('ord'),
    publicationId: payload.publicationId,
    userId: payload.userId || 'user_local',
    userName: payload.userName || '邻居',
    roomId: room.id,
    roomLabel: room.label,
    buildingName: room.buildingName,
    phaseName: room.phaseName,
    quantity: payload.quantity,
    qtyUnit: publication.unit || '袋',
    remark: payload.remark || '',
    status: 'pending',
    createdAt: nowStr(),
    deliveredAt: null
  }
  store.orders.unshift(order)
  return order
}

function listOrders(filter) {
  let list = store.orders.slice()
  if (filter && filter.publicationId) {
    list = list.filter(item => item.publicationId === filter.publicationId)
  }
  if (filter && filter.userId) {
    list = list.filter(item => item.userId === filter.userId)
  }
  if (filter && filter.status) {
    list = list.filter(item => item.status === filter.status)
  }
  return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

function completeOrder(orderId, deliveredQuantity) {
  const order = store.orders.find(item => item.id === orderId)
  if (!order) {
    throw new Error('订单不存在')
  }
  if (order.status === 'completed') {
    throw new Error('订单已完成')
  }
  const ordered = order.quantity
  const actual = deliveredQuantity == null ? ordered : Number(deliveredQuantity)
  if (actual < 0) {
    throw new Error('实际领取数量无效')
  }
  const diff = ordered - actual
  const publication = getPublication(order.publicationId)
  if (diff > 0 && publication) {
    publication.remainBags += diff
  } else if (diff < 0 && publication) {
    publication.remainBags -= (actual - ordered)
  }
  order.deliveredQuantity = actual
  order.extraQuantity = Math.max(0, actual - ordered)
  order.status = 'completed'
  order.deliveredAt = nowStr()
  return order
}

function groupPendingByBuilding(publicationId) {
  const pending = listOrders({ publicationId, status: 'pending' })
  const map = {}
  pending.forEach(order => {
    const key = `${order.phaseName}_${order.buildingName}`
    if (!map[key]) {
      map[key] = {
        phaseName: order.phaseName,
        buildingName: order.buildingName,
        totalBags: 0,
        orderCount: 0,
        orders: []
      }
    }
    map[key].totalBags += order.quantity
    map[key].orderCount += 1
    map[key].orders.push(order)
  })
  return Object.keys(map)
    .sort()
    .map(key => map[key])
}

function getAdminStats(publicationId) {
  const all = listOrders({ publicationId })
  const pending = all.filter(item => item.status === 'pending')
  const completed = all.filter(item => item.status === 'completed')
  return {
    pendingCount: pending.length,
    pendingBags: pending.reduce((sum, item) => sum + item.quantity, 0),
    completedCount: completed.length,
    completedBags: completed.reduce((sum, item) => sum + (item.deliveredQuantity != null ? item.deliveredQuantity : item.quantity), 0)
  }
}

module.exports = {
  listPublications,
  getPublication,
  createPublication,
  createOrder,
  listOrders,
  completeOrder,
  groupPendingByBuilding,
  getAdminStats
}
