/**
 * 仅发布体验环境：package → 上传 jar 到 /opt/hycbox-trial → 重启 hycbox-trial
 * 用法：set HYC_SSH_PASSWORD=xxx && node deploy/release-trial.js
 */
const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { HOST, USER, PASSWORD } = require('./ssh-env')

const TRIAL_DIR = '/opt/hycbox-trial'
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
  console.log('mvn package …')
  execSync('mvn -q -DskipTests package', { cwd: path.join(__dirname, '..'), stdio: 'inherit' })
  if (!fs.existsSync(LOCAL_JAR)) {
    throw new Error(`找不到 ${LOCAL_JAR}`)
  }

  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
  })
  console.log('SSH OK（仅体验）\n')

  await exec(conn, `
set -e
if [ ! -d ${TRIAL_DIR} ] || [ ! -f /etc/systemd/system/hycbox-trial.service ]; then
  echo "体验环境未搭建，请先 node deploy/setup-trial-env.js"
  exit 1
fi
`)

  console.log('上传 JAR → trial …')
  await upload(conn, LOCAL_JAR, `${TRIAL_DIR}/${JAR_NAME}`)

  await exec(conn, `
set -e
ENVF=${TRIAL_DIR}/server.env
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
sleep 8
systemctl is-active hycbox-trial
curl -s http://127.0.0.1:8081/api/health || true
echo
curl -s http://127.0.0.1:8081/api/hub/entries || true
echo
journalctl -u hycbox-trial -n 40 --no-pager || true
`)

  conn.end()
  console.log('\n体验发布完成: https://hychyr.top/api-trial/health')
  console.log('入口配置: https://hychyr.top/api-trial/hub/entries')
}

main().catch((e) => {
  console.error('体验发布失败:', e.message)
  process.exit(1)
})
