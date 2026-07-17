const config = require('./config')
const mockStore = require('./mockStore')
const buildingHelper = require('../data/buildingHelper')

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.baseUrl}${options.url}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: options.header || { 'Content-Type': 'application/json' },
      timeout: config.timeout,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error((res.data && res.data.message) || '请求失败'))
        }
      },
      fail(err) {
        reject(err)
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
  if (app.globalData.userId) {
    return app.globalData.userId
  }
  let userId = wx.getStorageSync('hyc_user_id')
  if (!userId) {
    userId = `user_${Date.now()}`
    wx.setStorageSync('hyc_user_id', userId)
  }
  app.globalData.userId = userId
  return userId
}

const api = {
  /** GET /community/info */
  getCommunityInfo() {
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: buildingHelper.getCommunityInfo()
      }))
    }
    return request({ url: '/community/info' })
  },

  /** GET /community/phases */
  getPhases() {
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: buildingHelper.getPhases()
      }))
    }
    return request({ url: '/community/phases' })
  },

  /** GET /community/rooms?phaseId=&buildingId=&unit= */
  getRooms(params) {
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: buildingHelper.getRoomsByBuilding(params.phaseId, params.buildingId, params.unit)
      }))
    }
    return request({ url: '/community/rooms', data: params })
  },

  /** GET /community/rooms/search?keyword= */
  searchRooms(keyword) {
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: buildingHelper.searchRooms(keyword)
      }))
    }
    return request({ url: '/community/rooms/search', data: { keyword } })
  },

  /** GET /publications */
  listPublications() {
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: mockStore.listPublications()
      }))
    }
    return request({ url: '/publications' })
  },

  /** POST /publications  body: { title, imageUrl, totalBags } */
  createPublication(data) {
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: mockStore.createPublication(data)
      }))
    }
    return request({ url: '/publications', method: 'POST', data })
  },

  /** POST /orders  body: { publicationId, roomId, quantity, userName } */
  createOrder(data) {
    const payload = Object.assign({}, data, { userId: getUserId() })
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: mockStore.createOrder(payload)
      }))
    }
    return request({ url: '/orders', method: 'POST', data: payload })
  },

  /** GET /orders?status=&publicationId= */
  listOrders(params) {
    const query = Object.assign({}, params || {})
    if (!query.userId && getApp().globalData.role === 'user') {
      query.userId = getUserId()
    }
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: mockStore.listOrders(query)
      }))
    }
    return request({ url: '/orders', data: query })
  },

  /** PUT /orders/:id/complete */
  completeOrder(orderId) {
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: mockStore.completeOrder(orderId)
      }))
    }
    return request({ url: `/orders/${orderId}/complete`, method: 'PUT' })
  },

  /** GET /admin/orders/group-by-building?publicationId= */
  groupPendingByBuilding(publicationId) {
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: mockStore.groupPendingByBuilding(publicationId)
      }))
    }
    return request({ url: '/admin/orders/group-by-building', data: { publicationId } })
  },

  /** GET /admin/stats?publicationId= */
  getAdminStats(publicationId) {
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: mockStore.getAdminStats(publicationId)
      }))
    }
    return request({ url: '/admin/stats', data: { publicationId } })
  },

  /** POST /upload  上传图片到服务器，返回公网 URL */
  uploadImage(filePath) {
    if (config.useMock) {
      return wrapMock(() => ({
        code: 0,
        data: { url: filePath }
      }))
    }
    return new Promise((resolve, reject) => {
      console.log('uploadImage ->', `${config.baseUrl}/upload`, filePath)
      wx.uploadFile({
        url: `${config.baseUrl}/upload`,
        filePath,
        name: 'file',
        success(res) {
          console.log('uploadImage response', res.statusCode, res.data)
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
        fail(err) {
          console.error('uploadImage fail', err)
          reject(err)
        }
      })
    })
  }
}

module.exports = api
