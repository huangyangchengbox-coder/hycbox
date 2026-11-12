/**
 * 搭建体验环境：独立库 hycbox_trial + 独立进程(8081) + nginx /api-trial/
 * 并清理生产库业务测试数据（保留管理员与行政区划）。
 *
 * 用法：set HYC_SSH_PASSWORD=xxx && node deploy/setup-trial-env.js
 * 前置：已有生产 jar（/opt/hycbox/hyc-box-server-1.0.0.jar）与 server.env
 */
const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { HOST, USER, PASSWORD } = require('./ssh-env')

const PROD_DIR = '/opt/hycbox'
const TRIAL_DIR = '/opt/hycbox-trial'
const JAR_NAME = 'hyc-box-server-1.0.0.jar'
const LOCAL_PURGE = path.join(__dirname, 'purge-biz-data.sql')
const LOCAL_NGINX = path.join(__dirname, 'nginx-hychyr.top.conf')

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => {
        if (code === 0) resolve(out)
        else reject(new Error(out.slice(-1500) || `exit ${code}`))
      }).on('data', (d) => {
        out += d
        process.stdout.write(d)
      }).stderr.on('data', (d) => {
        out += d
        process.stderr.write(d)
      })
    })
  })
}

function upload(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err)
      const rs = fs.createReadStream(localPath)
      const ws = sftp.createWriteStream(remotePath)
      ws.on('close', resolve)
      ws.on('error', reject)
      rs.pipe(ws)
    })
  })
}

function buildRemoteScript() {
  return `
set -e
PROD_DIR=${PROD_DIR}
TRIAL_DIR=${TRIAL_DIR}
JAR_NAME=${JAR_NAME}

DB_PASS=$(grep -E '^HYCBOX_DB_PASSWORD=' $PROD_DIR/server.env | head -1 | cut -d= -f2-)
ADMIN_PASS=$(grep -E '^HYCBOX_ADMIN_PASSWORD=' $PROD_DIR/server.env | head -1 | cut -d= -f2-)
WX_APP_ID=$(grep -E '^HYCBOX_WX_APP_ID=' $PROD_DIR/server.env | head -1 | cut -d= -f2-)
WX_APP_SECRET=$(grep -E '^HYCBOX_WX_APP_SECRET=' $PROD_DIR/server.env | head -1 | cut -d= -f2-)
WX_TPL=$(grep -E '^HYCBOX_WX_SUBSCRIBE_TEMPLATE_ID=' $PROD_DIR/server.env | head -1 | cut -d= -f2- || true)
AI_KEY=$(grep -E '^HYCBOX_AI_API_KEY=' $PROD_DIR/server.env | head -1 | cut -d= -f2- || true)
AI_BASE=$(grep -E '^HYCBOX_AI_BASE_URL=' $PROD_DIR/server.env | head -1 | cut -d= -f2- || true)
AI_MODEL=$(grep -E '^HYCBOX_AI_MODEL=' $PROD_DIR/server.env | head -1 | cut -d= -f2- || true)

if [ -z "$DB_PASS" ]; then echo missing DB_PASS; exit 1; fi
if [ ! -f $PROD_DIR/$JAR_NAME ]; then echo missing jar; exit 1; fi

echo "== 1) create trial db =="
mysql -e "CREATE DATABASE IF NOT EXISTS hycbox_trial DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "GRANT ALL PRIVILEGES ON hycbox_trial.* TO 'hycbox'@'localhost'; FLUSH PRIVILEGES;"
mysql -e "SHOW DATABASES LIKE 'hycbox%';"

echo "== 2) purge prod biz data =="
mysql hycbox < /tmp/hycbox-purge-biz-data.sql
mysql -N -e "SELECT CONCAT('prod_orders=',COUNT(*)) FROM hycbox.fruit_order; SELECT CONCAT('prod_pubs=',COUNT(*)) FROM hycbox.publication; SELECT CONCAT('prod_admins=',COUNT(*)) FROM hycbox.admin_user;"

echo "== 2b) copy region dictionary to trial (optional schema bootstrap) =="
mysqldump hycbox admin_region 2>/dev/null | mysql hycbox_trial || echo "skip region dump (table may not exist yet)"

echo "== 3) trial dirs + env =="
mkdir -p $TRIAL_DIR/uploads $TRIAL_DIR/logs
cp -f $PROD_DIR/$JAR_NAME $TRIAL_DIR/$JAR_NAME
umask 077
{
  echo "SERVER_PORT=8081"
  echo "HYCBOX_DB_URL=jdbc:mysql://127.0.0.1:3306/hycbox_trial?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true"
  echo "HYCBOX_DB_USER=hycbox"
  echo "HYCBOX_DB_PASSWORD=$DB_PASS"
  echo "HYCBOX_ADMIN_PASSWORD=$ADMIN_PASS"
  echo "HYCBOX_WX_APP_ID=$WX_APP_ID"
  echo "HYCBOX_WX_APP_SECRET=$WX_APP_SECRET"
  echo "HYCBOX_WX_SUBSCRIBE_TEMPLATE_ID=$WX_TPL"
  echo "HYCBOX_WX_MP_ENV_VERSION=trial"
  echo "HYCBOX_PUBLIC_BASE_URL=https://hychyr.top/api-trial"
  echo "HYCBOX_UPLOAD_PUBLIC_URL=https://hychyr.top/uploads-trial"
  echo "HYCBOX_STORAGE_TYPE=local"
  echo "HYCBOX_SEAWEEDFS_FILER_URL=http://127.0.0.1:8888"
  echo "HYCBOX_AI_API_KEY=$AI_KEY"
  echo "HYCBOX_AI_BASE_URL=$AI_BASE"
  echo "HYCBOX_AI_MODEL=$AI_MODEL"
} > $TRIAL_DIR/server.env
chmod 600 $TRIAL_DIR/server.env

echo "== 4) systemd =="
cat > /etc/systemd/system/hycbox-trial.service << 'EOF'
[Unit]
Description=HycBox Trial Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/hycbox-trial
ExecStart=/usr/bin/java -Dfile.encoding=UTF-8 -jar /opt/hycbox-trial/hyc-box-server-1.0.0.jar
Restart=always
RestartSec=5
SuccessExitStatus=143
Environment=LOG_PATH=/opt/hycbox-trial/logs
EnvironmentFile=-/opt/hycbox-trial/server.env

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable hycbox-trial
systemctl restart hycbox-trial
sleep 12
systemctl is-active hycbox-trial
curl -s -o /dev/null -w "trial_local:%{http_code}\\n" http://127.0.0.1:8081/api/health || true

echo "== 5) nginx =="
if [ -f /tmp/nginx-hychyr.top.conf ]; then
  cp /tmp/nginx-hychyr.top.conf /etc/nginx/conf.d/hychyr.top.conf
fi
nginx -t
systemctl reload nginx
curl -s -o /dev/null -w "trial_ext:%{http_code}\\n" http://127.0.0.1/api-trial/health || true
curl -s -o /dev/null -w "prod_ext:%{http_code}\\n" http://127.0.0.1/api/health || true
echo DONE
`
}

async function main() {
  if (!fs.existsSync(LOCAL_PURGE)) {
    throw new Error(`缺少 ${LOCAL_PURGE}`)
  }
  if (!fs.existsSync(LOCAL_NGINX)) {
    throw new Error(`缺少 ${LOCAL_NGINX}`)
  }
  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
  })
  console.log('SSH OK\n')

  await upload(conn, LOCAL_PURGE, '/tmp/hycbox-purge-biz-data.sql')
  await upload(conn, LOCAL_NGINX, '/tmp/nginx-hychyr.top.conf')
  await exec(conn, buildRemoteScript())

  conn.end()
  console.log('\n体验环境就绪:')
  console.log('  生产 Web: https://hychyr.top/web/')
  console.log('  体验 Web: https://trial.hychyr.top/web/')
  console.log('  生产 API: https://hychyr.top/api/health  (库 hycbox)')
  console.log('  体验 API: https://trial.hychyr.top/api/health  (库 hycbox_trial，兼容 /api-trial/)')
}

main().catch((e) => {
  console.error('setup-trial-env failed:', e.message)
  process.exit(1)
})
