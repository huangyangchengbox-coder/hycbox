# hycBox · 社区水果领取小程序

微信小程序前端：小区闪送 + 物流中国，对接后端 [hycBoxServer](../hycBoxServer)。小区与门牌由配置/数据文件维护，不绑定单一社区。

## 功能概览

| 端 | 能力 |
|----|------|
| **入口 Hub** | 小区闪送 / 物流中国 分流 |
| **用户 · 闪送** | 选小区门牌、登记领取、待配送改地址、取消订单、订单进度订阅 |
| **用户 · 物流** | 全国下单（手机/地址/省）、查发货凭证、取消待核实单、进度订阅 |
| **管理端** | 登录、发布/改价改库存/结束活动、按楼栋配送、物流核款发货售后、管理员账号、订阅通知条 |

## 目录结构

```
miniprogram/
├── pages/hyc/
│   ├── hub/                 # 入口
│   ├── user/                # 小区闪送
│   ├── express/             # 物流中国
│   └── admin/               # 管理端
├── components/
│   └── admin-notice-bar/    # 管理端未读通知 + 订阅引导
├── services/
│   ├── api.js               # 统一 API
│   ├── config.js            # baseUrl 等
│   ├── wxSession.js         # 微信登录
│   ├── adminSession.js      # 管理员 token
│   ├── adminSubscribe.js    # 管理员订阅消息
│   └── userSubscribe.js     # 用户订单进度订阅
└── data/                    # 楼栋/省份等静态数据
```

## 本地运行

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入本仓库根目录（或 `miniprogram` 所在工程）
3. 修改接口地址：`miniprogram/services/config.js`

```js
module.exports = {
  useMock: false,
  // 本地后端：http://127.0.0.1:8090/api
  // 线上 IP（备案前）：https://hychyr.top/api
  // 备案后域名：https://hychyr.top/api
  baseUrl: 'https://hychyr.top/api',
  timeout: 20000
}
```

4. 开发阶段如需 HTTP / IP：开发者工具勾选「不校验合法域名」
5. 确保后端已启动（见 hycBoxServer README）

## 与后端约定（摘要）

- 用户身份：微信 `openid`（禁止伪造 `user_*`）
- 管理员：请求头 `X-Admin-Token`
- 列表接口返回分页 `{ list, total, page, pageSize }`，`api.js` 已兼容解包为数组
- 下单前会拉起一次性订阅授权，便于推送配送/发货进度

## 发布小程序

1. 确认 `config.js` 指向正式 API
2. 公众平台配置 request / uploadFile 合法域名（正式版需 HTTPS 域名备案通过后）
3. **方式 A（推荐）**：微信开发者工具 → 上传 → 公众平台设体验版 / 提交审核
4. **方式 B（命令行）**：
   ```bash
   npm i -D miniprogram-ci
   # 公众平台下载「代码上传密钥」，本地保存
   copy deploy\upload-weixin.example.env deploy\upload-weixin.env
   # 编辑 upload-weixin.env，填写 WEIXIN_PRIVATE_KEY_PATH
   npm run upload:weixin
   # 或：node deploy/upload-weixin.js --version=1.0.1 --desc=仙途更新
   ```
   私钥与 `upload-weixin.env` 已 gitignore，勿提交仓库。

## 相关仓库

| 仓库 | 说明 |
|------|------|
| **hycBox**（本仓库） | 微信小程序 |
| **hycBoxServer** | Spring Boot 后端、部署与运维脚本 |
