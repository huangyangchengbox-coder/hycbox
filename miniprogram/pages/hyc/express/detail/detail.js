const api = require('../../../../services/api')
const publicationImages = require('../../../../services/publicationImages')

function statusText(status) {
  if (status === 'shipped') return '已发货'
  if (status === 'paid') return '待发货'
  if (status === 'cancelled') return '已取消'
  return '待核实'
}

Page({
  data: {
    loading: true,
    order: null,
    canCancel: false
  },

  onLoad(options) {
    this.orderId = (options && options.id) || ''
  },

  onShow() {
    this.loadDetail()
  },

  loadDetail() {
    if (!this.orderId) {
      this.setData({ loading: false, order: null })
      return
    }
    this.setData({ loading: true })
    api.getOrderDetail(this.orderId).then(res => {
      if (res.code !== 0 || !res.data) {
        throw new Error(res.message || '加载失败')
      }
      const order = res.data
      order.statusText = statusText(order.status)
      order.payMethodText = order.payMethod === 'alipay' ? '支付宝' : (order.payMethod === 'wechat' ? '微信' : '')
      this.setData({
        order,
        canCancel: order.status === 'pending',
        loading: false
      })
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      this.setData({ loading: false })
    })
  },

  previewShip(e) {
    const current = (e && e.currentTarget && e.currentTarget.dataset.url)
      || (this.data.order && this.data.order.shipImageUrl)
    const urls = (this.data.order && this.data.order.shipImages)
      || (current ? [current] : [])
    if (!urls.length) return
    wx.previewImage({ urls, current: current || urls[0] })
  },

  previewPubImages(e) {
    const current = e.currentTarget.dataset.url
    publicationImages.previewUrls(
      (this.data.order && this.data.order.publicationImages) || [],
      current
    )
  },

  downloadShipImage(e) {
    const url = e && e.currentTarget && e.currentTarget.dataset.url
    if (!url) return
    this.saveImageToAlbum(url).then(() => {
      this.showScanTip(1)
    }).catch(err => {
      wx.showToast({ title: (err && err.message) || '下载失败', icon: 'none' })
    })
  },

  downloadAllShipImages() {
    const urls = (this.data.order && this.data.order.shipImages) || []
    if (!urls.length) return
    wx.showLoading({ title: '下载中' })
    let ok = 0
    const run = (i) => {
      if (i >= urls.length) {
        wx.hideLoading()
        if (ok > 0) {
          this.showScanTip(ok)
        } else {
          wx.showToast({ title: '下载失败', icon: 'none' })
        }
        return
      }
      this.saveImageToAlbum(urls[i]).then(() => {
        ok += 1
        run(i + 1)
      }).catch(() => {
        run(i + 1)
      })
    }
    run(0)
  },

  /** 下载网络图并写入系统相册（需相册权限） */
  saveImageToAlbum(url) {
    return this.ensureAlbumAuth().then(() => new Promise((resolve, reject) => {
      wx.downloadFile({
        url,
        success(res) {
          if (res.statusCode !== 200 || !res.tempFilePath) {
            reject(new Error('下载失败'))
            return
          }
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => resolve(),
            fail: (err) => reject(new Error((err && err.errMsg) || '保存失败'))
          })
        },
        fail: () => reject(new Error('下载失败'))
      })
    }))
  },

  ensureAlbumAuth() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success(setting) {
          if (setting.authSetting['scope.writePhotosAlbum']) {
            resolve()
            return
          }
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: () => resolve(),
            fail: () => {
              wx.showModal({
                title: '需要相册权限',
                content: '请允许保存到相册，以便下载发货凭证并用微信扫一扫识别物流。',
                confirmText: '去设置',
                success(modalRes) {
                  if (!modalRes.confirm) {
                    reject(new Error('未授权相册'))
                    return
                  }
                  wx.openSetting({
                    success(openRes) {
                      if (openRes.authSetting && openRes.authSetting['scope.writePhotosAlbum']) {
                        resolve()
                      } else {
                        reject(new Error('未授权相册'))
                      }
                    },
                    fail: () => reject(new Error('未授权相册'))
                  })
                }
              })
            }
          })
        },
        fail: () => reject(new Error('无法获取权限'))
      })
    })
  },

  showScanTip(count) {
    const n = count > 1 ? `${count} 张` : ''
    wx.showModal({
      title: '已保存到相册',
      content: `${n}发货凭证已下载。请打开微信「扫一扫」→ 点右下角「相册」选中该图识别，即可查看物流详情。`,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  cancelOrder() {
    if (!this.data.canCancel || !this.orderId) return
    wx.showModal({
      title: '取消订单',
      content: '确定取消该登记？库存将退回。',
      success: (modalRes) => {
        if (!modalRes.confirm) return
        wx.showLoading({ title: '取消中' })
        api.cancelOrder(this.orderId).then(res => {
          wx.hideLoading()
          if (res.code !== 0) {
            wx.showToast({ title: res.message || '取消失败', icon: 'none' })
            return
          }
          wx.showToast({ title: '已取消', icon: 'success' })
          this.loadDetail()
        }).catch(err => {
          wx.hideLoading()
          wx.showToast({ title: err.message || '取消失败', icon: 'none' })
        })
      }
    })
  }
})
