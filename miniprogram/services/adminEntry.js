/**
 * 管理员入口：默认进入发布页（配送/发货从发布列表进入）
 */
function navigate(url, useReLaunch) {
  if (useReLaunch) {
    wx.reLaunch({ url: url })
  } else {
    wx.redirectTo({ url: url })
  }
}

function goAdminHome(useReLaunch) {
  const token = wx.getStorageSync('hyc_admin_token') || ''
  if (!token) {
    navigate('/pages/hyc/admin/login/login', useReLaunch)
    return
  }
  navigate('/pages/hyc/admin/publish/publish', useReLaunch)
}

function goUserHome(useReLaunch) {
  navigate('/pages/hyc/hub/hub', useReLaunch)
}

module.exports = {
  goAdminHome,
  goUserHome
}
