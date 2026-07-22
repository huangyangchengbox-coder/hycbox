/**
 * 村村送：本地缓存联系人与上次选点，减少重复填写。
 */
const KEY = 'hyc_village_pref'

function getPref() {
  try {
    return wx.getStorageSync(KEY) || null
  } catch (e) {
    return null
  }
}

function savePref(partial) {
  const prev = getPref() || {}
  const next = Object.assign({}, prev, partial || {})
  try {
    wx.setStorageSync(KEY, next)
  } catch (e) {
    console.warn('[villagePref] save fail', e)
  }
  return next
}

module.exports = {
  getPref,
  savePref
}
