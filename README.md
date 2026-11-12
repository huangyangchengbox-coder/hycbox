# hycBoxServer · 社区水果领取后端

Spring Boot 3 / Java 17 服务：小区闪送、物流中国、管理员运营、微信登录与订阅消息、图片上传。面向通用社区场景，不绑定单一小区。

配套小程序：[hycBox](../hycBox)。

## 技术栈

- Spring Boot 3.2、Spring Data JPA、MySQL
- 文件存储：本地盘 或 SeaweedFS Filer（`hycbox.storage-type`）
- 密码：BCrypt；敏感配置走环境变量 / `server.env`
- 部署：systemd jar 或 Docker；脚本在 `deploy/`

## 功能模块

| 模块 | 说明 |
|------|------|
| 发布 | 小区 / 全国；创建、改价改库存、结束；库存条件扣减防超卖 |
| 订单 · 闪送 | 登记、改地址、取消、配送完成（可记收款） |
| 订单 · 物流 | 待核实 → 已收款 → 已发货；售后；按省分组 |
| 社区 | 楼栋门牌数据（`buildings.json`） |
| 管理员 | 超管/管理员、token、订阅额度、站内通知 |
| 微信 | `jscode2session`、管理员/用户订阅消息 |
| 上传 | `/upload`（管理员）；本地或 SeaweedFS |

## 目录结构

```
src/main/java/com/hycbox/
├── controller/     # REST（context-path: /api）
├── service/        # 业务
├── storage/        # LocalFileStorage / SeaweedFsFileStorage
├── entity/         # JPA
├── repository/
├── dto/
└── config/
deploy/
├── server.env.example          # 生产环境变量模板
├── release-now.js              # 一键上传 jar + 重启
├── docker-compose.seaweedfs.yml
├── nginx-hychyr.top.conf
└── *.js                        # 运维辅助（需 HYC_SSH_PASSWORD）
```

## 本地启动

### 环境

- JDK 17+
- MySQL 8（或 5.7+）
- Maven 3.8+

### 配置

本地 profile：`src/main/resources/application-local.yml`（含本机库账号等）。

```bash
# 创建库（示例）
CREATE DATABASE hycbox DEFAULT CHARACTER SET utf8mb4;

mvn -DskipTests package
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

默认本地：`http://127.0.0.1:8090/api/health`

生产配置在 `application.yml`，密钥必须用环境变量注入，勿写入仓库。

### 常用环境变量

见 `deploy/server.env.example`：

| 变量 | 含义 |
|------|------|
| `HYCBOX_DB_*` | 数据源 |
| `HYCBOX_ADMIN_PASSWORD` | 超管初始/同步密码（会存 BCrypt） |
| `HYCBOX_WX_APP_ID` / `HYCBOX_WX_APP_SECRET` | 小程序 |
| `HYCBOX_WX_SUBSCRIBE_TEMPLATE_ID` | 管理员订阅模板 |
| `HYCBOX_WX_USER_ORDER_TEMPLATE_ID` | 用户订单进度模板（可选，不配则复用上者字段） |
| `HYCBOX_PUBLIC_BASE_URL` / `HYCBOX_UPLOAD_PUBLIC_URL` | 对外 API / 图片根地址 |
| `HYCBOX_STORAGE_TYPE` | `local` 或 `seaweedfs` |

演示数据：仅 `spring.profiles=local` 且 `hycbox.reset-demo-data=true` 时允许清空重建。

## 主要 API（前缀 `/api`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/wx/session` | 微信登录 |
| GET | `/publications` | 进行中发布（分页） |
| PUT | `/publications/{id}` | 改价/库存/标题（管理员） |
| PUT | `/publications/{id}/end` | 结束活动 |
| GET/POST | `/orders` | 列表（分页）/ 创建 |
| PUT | `/orders/{id}/cancel` | 用户取消 |
| PUT | `/orders/{id}/address` | 闪送改地址 |
| PUT | `/orders/{id}/complete` | 配送完成 |
| PUT | `/orders/{id}/verify-pay` | 核款 |
| PUT | `/orders/{id}/ship` | 发货 |
| POST | `/admin/login` | 管理员登录 |
| GET | `/admin/publications` | 我的发布（分页） |
| GET | `/admin/orders` | 某发布下订单（分页） |
| POST | `/upload` | 上传图片 |

用户接口需 `userId`（openid）；管理接口需请求头 `X-Admin-Token`。

## 生产部署

### 1. 环境文件

```bash
cp deploy/server.env.example /opt/hycbox/server.env
# 编辑填入真实密钥
chmod 600 /opt/hycbox/server.env
```

### 2. 一键发布 jar（本机）

```bash
mvn -DskipTests package
# Windows PowerShell
$env:HYC_SSH_PASSWORD="你的SSH密码"
node deploy/release-now.js
```

脚本会：上传 jar → 写入 systemd（`EnvironmentFile=server.env`）→ 重启 `hycbox`。

健康检查：`http://服务器IP/api/health` 或 `curl http://127.0.0.1:8080/api/health`。

### 3. SeaweedFS（可选）

```bash
docker compose -f deploy/docker-compose.seaweedfs.yml up -d
```

`server.env` 中设 `HYCBOX_STORAGE_TYPE=seaweedfs`，nginx `/uploads/` 反代 Filer（见 `deploy/nginx-hychyr.top.conf`）。

### 4. 域名

备案完成前可用公网 IP；备案通过后将 `HYCBOX_PUBLIC_*` 与小程序 `baseUrl` 改为 `https://hychyr.top`。

## 安全注意

- 勿把 `wx-app-secret`、数据库密码、SSH 口令提交到 Git
- `deploy/*.js` 依赖环境变量 `HYC_SSH_PASSWORD`，无默认口令
- 订单列表禁止匿名全表查询；用户仅能操作本人订单

## 开发约定（摘要）

- 返回时间：`@JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")`
- 文件 UTF-8 无 BOM
- 业务异常：`BizException` → 统一 `ApiResponse`（`code != 0`）
- 最小化改动；新增能力优先可复用封装（如 `FileStorage`、`PageResult`）

## 相关链接

| 项 | 地址 |
|----|------|
| 小程序仓库 | hycBox |
| 健康检查（示例） | `https://hychyr.top/api/health` |
