/**
 * 用户小区/期数偏好：首次选择后本地记住，可在「我的」修改。
 */
const STORAGE_KEY = 'hyc_community_pref'

const DEFAULT = {
  communityId: 'hengda_mingdu',
  communityName: '宜昌·恒大名都',
  phaseId: '',
  phaseName: '',
  hasPhases: true
}

function getPref() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY)
    if (!raw || typeof raw !== 'object' || !raw.communityId) {
      return null
    }
    return {
      communityId: raw.communityId,
      communityName: raw.communityName || '',
      phaseId: raw.phaseId || '',
      phaseName: raw.phaseName || '',
      hasPhases: !!raw.hasPhases
    }
  } catch (e) {
    return null
  }
}

function hasPref() {
  return !!getPref()
}

function savePref(pref) {
  const data = {
    communityId: pref.communityId || DEFAULT.communityId,
    communityName: pref.communityName || DEFAULT.communityName,
    phaseId: pref.phaseId || '',
    phaseName: pref.phaseName || '',
    hasPhases: !!pref.hasPhases
  }
  wx.setStorageSync(STORAGE_KEY, data)
  return data
}

function clearPref() {
  wx.removeStorageSync(STORAGE_KEY)
}

function getDefault() {
  return Object.assign({}, DEFAULT)
}

/** 展示文案：宜昌·恒大名都 · 一期 */
function formatLabel(pref) {
  if (!pref) {
    return ''
  }
  if (pref.phaseName) {
    return pref.communityName + ' · ' + pref.phaseName
  }
  return pref.communityName || ''
}

module.exports = {
  STORAGE_KEY,
  getPref,
  hasPref,
  savePref,
  clearPref,
  getDefault,
  formatLabel
}
