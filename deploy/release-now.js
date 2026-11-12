/**
 * 一键发布：确保 server.env → 上传 jar → 停掉冲突 docker → 重启 systemd
 * 用法：set HYC_SSH_PASSWORD=xxx && node deploy/release-now.js
 */
const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { HOST, USER, PASSWORD } = require('./ssh-env')

const REMOTE_DIR = '/opt/hycbox'
const JAR_NAME = 'hyc-box-server-1.0.0.jar'
const LOCAL_JAR = path.join(__dirname, '..', 'target', JAR_NAME)

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => {
        if (code === 0) resolve(out)
        else reject(new Error(out.slice(-1200) || `exit ${code}`))
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

async function main() {
  // 避免只 compile 不 package 导致上传旧 jar
  const { execSync } = require('child_process')
  console.log('mvn package …')
  execSync('mvn -q -DskipTests package', { cwd: path.join(__dirname, '..'), stdio: 'inherit' })

  if (!fs.existsSync(LOCAL_JAR)) {
    throw new Error(`找不到 ${LOCAL_JAR}，请先 mvn package`)
  }
  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
  })
  console.log('SSH OK\n')

  // 若无 server.env，用历史生产值初始化一次（已存在则不覆盖）
  await exec(conn, `
set -e
mkdir -p ${REMOTE_DIR}/{uploads,logs,data}
if [ ! -f ${REMOTE_DIR}/server.env ]; then
  cat > ${REMOTE_DIR}/server.env << 'EOF'
HYCBOX_DB_URL=jdbc:mysql://127.0.0.1:3306/hycbox?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true
HYCBOX_DB_USER=hycbox
HYCBOX_DB_PASSWORD=******
HYCBOX_ADMIN_PASSWORD=******
HYCBOX_WX_APP_ID=wxd67a23406d6c3174
HYCBOX_WX_APP_SECRET=******
HYCBOX_WX_SUBSCRIBE_TEMPLATE_ID=******
HYCBOX_PUBLIC_BASE_URL=https://hychyr.top/api
HYCBOX_UPLOAD_PUBLIC_URL=https://hychyr.top/uploads
HYCBOX_STORAGE_TYPE=local
HYCBOX_SEAWEEDFS_FILER_URL=http://127.0.0.1:8888
EOF
  chmod 600 ${REMOTE_DIR}/server.env
  echo CREATED_SERVER_ENV
else
  echo SERVER_ENV_EXISTS
fi
`)

  console.log('\n上传 JAR...')
  await upload(conn, LOCAL_JAR, `${REMOTE_DIR}/${JAR_NAME}`)

  const serviceContent = `[Unit]
Description=HycBox Fruit Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${REMOTE_DIR}
ExecStart=/usr/bin/java -Dfile.encoding=UTF-8 -jar ${REMOTE_DIR}/${JAR_NAME}
Restart=always
RestartSec=5
SuccessExitStatus=143
Environment=LOG_PATH=${REMOTE_DIR}/logs
EnvironmentFile=-${REMOTE_DIR}/server.env

[Install]
WantedBy=multi-user.target
`

  await exec(conn, `cat > /etc/systemd/system/hycbox.service << 'EOF'\n${serviceContent}EOF`)
  await exec(conn, `
set -e
# 避免 docker 占用 8080
docker stop hycbox 2>/dev/null || true
docker rm hycbox 2>/dev/null || true
systemctl daemon-reload
systemctl enable hycbox
systemctl restart hycbox
sleep 5
systemctl is-active hycbox
curl -s http://127.0.0.1:8080/api/health || true
echo
# 若已搭建体验环境，同步 jar 并重启，避免体验版代码落后
if [ -d /opt/hycbox-trial ] && [ -f /etc/systemd/system/hycbox-trial.service ]; then
  cp -f ${REMOTE_DIR}/${JAR_NAME} /opt/hycbox-trial/${JAR_NAME}
  ENVF=/opt/hycbox-trial/server.env
  if [ -f "$ENVF" ]; then
    grep -q '^HYCBOX_PUBLIC_BASE_URL=' "$ENVF" \\
      && sed -i 's|^HYCBOX_PUBLIC_BASE_URL=.*|HYCBOX_PUBLIC_BASE_URL=https://hychyr.top/api-trial|' "$ENVF" \\
      || echo 'HYCBOX_PUBLIC_BASE_URL=https://hychyr.top/api-trial' >> "$ENVF"
    grep -q '^HYCBOX_UPLOAD_PUBLIC_URL=' "$ENVF" \\
      && sed -i 's|^HYCBOX_UPLOAD_PUBLIC_URL=.*|HYCBOX_UPLOAD_PUBLIC_URL=https://hychyr.top/uploads-trial|' "$ENVF" \\
      || echo 'HYCBOX_UPLOAD_PUBLIC_URL=https://hychyr.top/uploads-trial' >> "$ENVF"
    grep -q '^HYCBOX_WX_MP_ENV_VERSION=' "$ENVF" \\
      && sed -i 's|^HYCBOX_WX_MP_ENV_VERSION=.*|HYCBOX_WX_MP_ENV_VERSION=trial|' "$ENVF" \\
      || echo 'HYCBOX_WX_MP_ENV_VERSION=trial' >> "$ENVF"
  fi
  systemctl restart hycbox-trial
  sleep 3
  systemctl is-active hycbox-trial || true
  curl -s http://127.0.0.1:8081/api/health || true
  echo
fi
journalctl -u hycbox -n 30 --no-pager || true
`)

  conn.end()
  console.log('\n发布完成: https://hychyr.top/api/health')
  console.log('体验 Web: https://trial.hychyr.top/web/')
}

main().catch((e) => {
  console.error('发布失败:', e.message)
  process.exit(1)
})
