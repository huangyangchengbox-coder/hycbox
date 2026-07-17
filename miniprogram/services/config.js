/**
 * 服务配置：切换 Mock / 真实后端
 * 部署后端后，将 useMock 改为 false 并填写 baseUrl
 */
module.exports = {
  useMock: false,
  // 线上服务器
  baseUrl: 'http://8.152.99.189:8080/api',
  // 本地调试：'http://127.0.0.1:8080/api'
  timeout: 20000
}
