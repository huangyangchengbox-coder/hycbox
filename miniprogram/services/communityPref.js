/**
 * 用户默认地址偏好：首次选完整门牌后本地记住。
 * 「我的地址」修改会更新默认；登记页临时改地址不写这里。
 */
const STORAGE_KEY = 'hyc_community_pref'

const DEFAULT = {
  communityId: 'hengda_mingdu',
  communityName: '宜昌·恒大名都',
  phaseId: '',
  phaseName: '',
  hasPhases: true,
  buildingId: '',
  buildingName: '',
  unit: 0,
  roomId: '',
  roomNo: '',
  roomLabel: ''
}

function normalize(raw) {
  if (!raw || typeof raw !== 'object' || !raw.communityId) {
    return null
  }
  return {
    communityId: raw.communityId,
    communityName: raw.communityName || '',
    phaseId: raw.phaseId || '',
    phaseName: raw.phaseName || '',
    hasPhases: !!raw.hasPhases,
    buildingId: raw.buildingId || '',
    buildingName: raw.buildingName || '',
    unit: Number(raw.unit) || 0,
    roomId: raw.roomId || '',
    roomNo: raw.roomNo || '',
    roomLabel: raw.roomLabel || ''
  }
}

function getPref() {
  try {
    return normalize(wx.getStorageSync(STORAGE_KEY))
  } catch (e) {
    return null
  }
}

/** 需已选到门牌号，才算完成首次选址 */
function hasPref() {
  const pref = getPref()
  return !!(pref && pref.roomId)
}

function savePref(pref) {
  const data = {
    communityId: pref.communityId || DEFAULT.communityId,
    communityName: pref.communityName || DEFAULT.communityName,
    phaseId: pref.phaseId || '',
    phaseName: pref.phaseName || '',
    hasPhases: !!pref.hasPhases,
    buildingId: pref.buildingId || '',
    buildingName: pref.buildingName || '',
    unit: Number(pref.unit) || 0,
    roomId: pref.roomId || '',
    roomNo: pref.roomNo || '',
    roomLabel: pref.roomLabel || ''
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

/** 小区 · 期数（首页筛选展示） */
function formatCommunityLabel(pref) {
  if (!pref) {
    return ''
  }
  if (pref.phaseName) {
    return pref.communityName + ' · ' + pref.phaseName
  }
  return pref.communityName || ''
}

/** 完整门牌：宜昌·恒大名都 · 一期2号楼 1单元 1501 */
function formatLabel(pref) {
  if (!pref) {
    return ''
  }
  if (pref.roomLabel) {
    return pref.roomLabel
  }
  const parts = [pref.communityName]
  let detail = ''
  if (pref.phaseName) {
    detail += pref.phaseName
  }
  if (pref.buildingName) {
    detail += pref.buildingName
  }
  if (pref.unit) {
    detail += (detail ? ' ' : '') + pref.unit + '单元'
  }
  if (pref.roomNo) {
    detail += (detail ? ' ' : '') + pref.roomNo
  }
  if (detail) {
    parts.push(detail)
  }
  return parts.filter(Boolean).join(' · ')
}

module.exports = {
  STORAGE_KEY,
  getPref,
  hasPref,
  savePref,
  clearPref,
  getDefault,
  formatLabel,
  formatCommunityLabel
}
