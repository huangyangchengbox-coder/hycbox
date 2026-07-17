/**
 * 服务配置：切换 Mock / 真实后端
 * 部署后端后，将 useMock 改为 false 并填写 baseUrl
 */
module.exports = {
  useMock: false,
  baseUrl: 'https://hychyr.top/api',
  timeout: 10000,
  /** 管理者口令（Mock 模式简单鉴权，正式环境走后端） */
  adminPasscode: '888888'
}
