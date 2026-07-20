/**
 * 服务配置
 * 本地调试：连本机 8090；上线改回公网 IP 或域名
 */
module.exports = {
  useMock: false,
  // 本地：'http://127.0.0.1:8090/api'
  // 线上：'http://8.152.99.189/api'
  baseUrl: 'http://8.152.99.189/api',
  timeout: 20000
}
