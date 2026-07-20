/**
 * 导出 TXT：写入本地后尝试转发文件；失败则复制到剪贴板。
 */

function safeName(name) {
  return String(name || 'export')
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 40)
}

/**
 * 待发货导出行：地址 手机号 昵称
 */
function buildPendingShipTxt(orders) {
  const lines = []
  for (let i = 0; i < (orders || []).length; i++) {
    const o = orders[i] || {}
    const address = String(o.address || '').trim()
    const phone = String(o.phone || '').trim()
    const nickname = String(o.userName || '').trim()
    lines.push(`${address} ${phone} ${nickname}`)
  }
  return lines.join('\n')
}

function writeTxtFile(fileName, content) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    const path = `${wx.env.USER_DATA_PATH}/${safeName(fileName)}.txt`
    fs.writeFile({
      filePath: path,
      data: content || '',
      encoding: 'utf8',
      success() {
        resolve(path)
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || '写入失败'))
      }
    })
  })
}

/**
 * 导出并尽量让用户拿到文件；不支持转发时复制全文。
 * @returns {Promise<{mode:'share'|'clipboard', path?:string}>}
 */
function exportTxt(fileName, content) {
  return writeTxtFile(fileName, content).then((path) => {
    return new Promise((resolve, reject) => {
      if (typeof wx.shareFileMessage === 'function') {
        wx.shareFileMessage({
          filePath: path,
          fileName: `${safeName(fileName)}.txt`,
          success() {
            resolve({ mode: 'share', path })
          },
          fail() {
            wx.setClipboardData({
              data: content,
              success() {
                resolve({ mode: 'clipboard', path })
              },
              fail(err) {
                reject(new Error((err && err.errMsg) || '导出失败'))
              }
            })
          }
        })
        return
      }
      wx.setClipboardData({
        data: content,
        success() {
          resolve({ mode: 'clipboard', path })
        },
        fail(err) {
          reject(new Error((err && err.errMsg) || '导出失败'))
        }
      })
    })
  })
}

module.exports = {
  buildPendingShipTxt,
  exportTxt
}
