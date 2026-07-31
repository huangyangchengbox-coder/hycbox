/**
 * 服务配置
 * 正式版 → 生产库 API
 * 体验版 / 开发版 → 体验库 API（与生产数据隔离）
 *
 * 注意：小程序合法域名 + HTTPS 证书目前仅覆盖 hychyr.top，
 * 体验库走同域路径 /api-trial，不要用 trial.hychyr.top（证书不含该子域会报 -200）。
 */
const PROD_API = 'https://hychyr.top/api'
const TRIAL_API = 'https://hychyr.top/api-trial'

function resolveBaseUrl() {
  try {
    const info = wx.getAccountInfoSync()
    const env = info && info.miniProgram && info.miniProgram.envVersion
    // release=正式版；trial=体验版；develop=开发者工具
    if (env === 'release') {
      return PROD_API
    }
    return TRIAL_API
  } catch (e) {
    return TRIAL_API
  }
}

module.exports = {
  useMock: false,
  baseUrl: resolveBaseUrl(),
  timeout: 20000,
  prodApi: PROD_API,
  trialApi: TRIAL_API,
  /** 仙途游戏图：走后台 uploads，不进小程序主包 */
  gameAssetBase: 'https://hychyr.top/uploads/game/xian',
  /**
   * 开发版 / 体验版：true；正式版：false。
   * 用于仙途跳境调试等仅非生产可用的能力。
   */
  isDevOrTrialEnv() {
    try {
      const info = wx.getAccountInfoSync()
      const env = info && info.miniProgram && info.miniProgram.envVersion
      return env !== 'release'
    } catch (e) {
      return true
    }
  }
}
