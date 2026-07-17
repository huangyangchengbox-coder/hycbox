const config = require('./config')
const mockStore = require('./mockStore')
const buildingHelper = require('../data/buildingHelper')

function getAdminToken() {
  const app = getApp()
  return (app && app.globalData && app.globalData.adminToken) || wx.getStorageSync('hyc_admin_token') || ''
}

function adminHeader(extra) {
  const header = Object.assign({ 'Content-Type': 'application/json' }, extra || {})
  const token = getAdminToken()
  if (token) {
    header['X-Admin-Token'] = token
  }
  return header
}

function request(options) {
  const method = (options.method || 'GET').toUpperCase()
  let url = `${config.baseUrl}${options.url}`
  let data = options.data || {}

  // GET：参数拼到 URL；不要带 json Content-Type，避免部分基础库异常
  const header = {}
  if (options.admin) {
    const token = getAdminToken()
    if (token) {
      header['X-Admin-Token'] = token
    }
  }
  if (method !== 'GET') {
    header['Content-Type'] = 'application/json'
  }
  if (options.header) {
    Object.assign(header, options.header)
  }

  if (method === 'GET' && data && typeof data === 'object') {
    const qs = Object.keys(data)
      .filter((k) => data[k] !== undefined && data[k] !== null && data[k] !== '')
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(data[k])}`)
      .join('&')
    if (qs) {
      url += (url.indexOf('?') >= 0 ? '&' : '?') + qs
    }
    data = {}
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      data,
      header,
      timeout: config.timeout,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const body = res.data
          if (typeof body === 'string') {
            try {
              resolve(JSON.parse(body))
            } catch (e) {
              reject(new Error('响应解析失败'))
            }
            return
          }
          resolve(body || {})
        } else {
          reject(new Error((res.data && res.data.message) || ('请求失败 ' + res.statusCode)))
        }
      },
      fail(err) {
        const msg = (err && (err.errMsg || err.message)) || '网络请求失败'
        reject(new Error(msg))
      }
    })
  })
}

function wrapMock(promiseFn) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(promiseFn())
      } catch (err) {
        reject(err)
      }
    }, 200)
  })
}

function getUserId() {
  const app = getApp()
  if (app && app.globalData && app.globalData.userId) {
    return app.globalData.userId
  }
  // 优先微信 openid
  let userId = wx.getStorageSync('hyc_openid') || wx.getStorageSync('hyc_user_id')
  if (!userId) {
    userId = `user_${Date.now()}`
    wx.setStorageSync('hyc_user_id', userId)
  }
  if (app && app.globalData) {
    app.globalData.userId = userId
  }
  return userId
}

const api = {
  /** POST /admin/login  body: { username, password } */
  adminLogin(username, password) {
    if (config.useMock) {
      return wrapMock(() => {
        if ((username || '').trim() !== 'hyc' || (password || '').trim() !== '@Hyc314') {
          throw new Error('账号或密码错误')
        }
        return {
          code: 0,
          data: {
            token: 'mock_admin_' + Date.now(),
            role: 'super',
            adminId: 'adm_hyc',
            username: 'hyc',
            displayName: '超级管理员',
            superAdmin: true,
            expireAt: Date.now() + 30 * 24 * 60 * 60 * 1000
          }
        }
      })
    }
    return request({ url: '/admin/login', method: 'POST', data: { username, password } })
  },

  /** GET /admin/users 超级管理员 */
  listAdminUsers() {
    return request({ url: '/admin/users', admin: true })
  },

  /** POST /admin/users 超级管理员添加管理员 */
  createAdminUser(data) {
    return request({ url: '/admin/users', method: 'POST', data, admin: true })
  },

  deleteAdminUser(id) {
    return request({ url: `/admin/users/${id}`, method: 'DELETE', data: {}, admin: true })
  },

  getCommunityInfo() {
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: buildingHelper.getCommunityInfo() }))
    }
    return request({ url: '/community/info' })
  },

  /** 小区列表（支持多小区扩展）；失败时回退内置宜昌·恒大名都 */
  listCommunities() {
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: buildingHelper.listCommunities() }))
    }
    return request({ url: '/community/list' }).then(res => {
      if (res && res.code === 0 && res.data && res.data.length) {
        return res
      }
      return { code: 0, data: buildingHelper.listCommunities() }
    }).catch(() => ({ code: 0, data: buildingHelper.listCommunities() }))
  },

  getPhases(communityId) {
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: buildingHelper.getPhases(communityId) }))
    }
    return request({ url: '/community/phases', data: communityId ? { communityId } : {} })
  },

  getRooms(params) {
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: buildingHelper.getRoomsByBuilding(
          params.communityId,
          params.phaseId,
          params.buildingId,
          params.unit
        )
      }))
    }
    return request({ url: '/community/rooms', data: params })
  },

  searchRooms(keyword, communityId) {
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: buildingHelper.searchRooms(keyword, 30, communityId) }))
    }
    return request({
      url: '/community/rooms/search',
      data: { keyword, communityId: communityId || undefined }
    })
  },

  /** 用户端：按小区/期数筛选发布 */
  listPublications(params) {
    const query = params || {}
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: mockStore.listPublications(query) }))
    }
    return request({ url: '/publications', data: query })
  },

  /** 管理者端：仅自己的发布 */
  listAdminPublications() {
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: mockStore.listPublications() }))
    }
    return request({ url: '/admin/publications', admin: true })
  },

  createPublication(data) {
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: mockStore.createPublication(data) }))
    }
    return request({ url: '/publications', method: 'POST', data, admin: true })
  },

  /** 结束活动 */
  endPublication(id) {
    return request({ url: `/publications/${id}/end`, method: 'PUT', data: {}, admin: true })
  },

  createOrder(data) {
    const payload = Object.assign({}, data, { userId: getUserId() })
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: mockStore.createOrder(payload) }))
    }
    return request({ url: '/orders', method: 'POST', data: payload })
  },

  listOrders(params) {
    const query = Object.assign({}, params || {})
    if (!query.userId && getApp().globalData.role === 'user') {
      query.userId = getUserId()
    }
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: mockStore.listOrders(query) }))
    }
    return request({ url: '/orders', data: query })
  },

  completeOrder(orderId, deliveredQuantity) {
    const data = { deliveredQuantity }
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: mockStore.completeOrder(orderId, deliveredQuantity)
      }))
    }
    return request({ url: `/orders/${orderId}/complete`, method: 'PUT', data, admin: true })
  },

  groupPendingByBuilding(publicationId) {
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: mockStore.groupPendingByBuilding(publicationId)
      }))
    }
    const data = {}
    if (publicationId && publicationId !== 'all') {
      data.publicationId = publicationId
    }
    return request({ url: '/admin/orders/group-by-building', data, admin: true })
  },

  getAdminStats(publicationId) {
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: mockStore.getAdminStats(publicationId) }))
    }
    const data = {}
    if (publicationId && publicationId !== 'all') {
      data.publicationId = publicationId
    }
    return request({ url: '/admin/stats', data, admin: true })
  },

  uploadImage(filePath) {
    if (config.useMock) {
      return wrapMock(() => ({ code: 0, data: { url: filePath } }))
    }
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${config.baseUrl}/upload`,
        filePath,
        name: 'file',
        header: {
          'X-Admin-Token': getAdminToken()
        },
        success(res) {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error('上传失败: HTTP ' + res.statusCode))
            return
          }
          try {
            const data = JSON.parse(res.data)
            if (data.code !== 0) {
              reject(new Error(data.message || '上传失败'))
              return
            }
            resolve(data)
          } catch (e) {
            reject(new Error('上传响应解析失败'))
          }
        },
        fail: reject
      })
    })
  }
}

module.exports = api
