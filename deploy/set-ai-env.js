/**
 * 写入 Agnes AI 配置到 /opt/hycbox/server.env（不覆盖其他项）
 * 用法：set HYC_SSH_PASSWORD=xxx && node deploy/set-ai-env.js
 */
const { Client } = require('ssh2')
const { HOST, USER, PASSWORD } = require('./ssh-env')

const AI_KEY = process.env.HYCBOX_AI_API_KEY || ''
const AI_BASE = process.env.HYCBOX_AI_BASE_URL || 'https://apihub.agnes-ai.com/v1'
const AI_MODEL = process.env.HYCBOX_AI_MODEL || 'agnes-2.0-flash'

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => {
        if (code === 0) resolve(out)
        else reject(new Error(out.slice(-800) || `exit ${code}`))
      }).on('data', (d) => { out += d; process.stdout.write(d) })
        .stderr.on('data', (d) => { out += d; process.stderr.write(d) })
    })
  })
}

async function main() {
  if (!AI_KEY) throw new Error('缺少 HYCBOX_AI_API_KEY')
  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
  })
  // 用 heredoc 写入临时片段再合并，避免密钥出现在进程列表参数过长问题仍存在但可接受
  const script = `
set -e
ENV=/opt/hycbox/server.env
touch "$ENV"
chmod 600 "$ENV"
grep -v '^HYCBOX_AI_API_KEY=' "$ENV" | grep -v '^HYCBOX_AI_BASE_URL=' | grep -v '^HYCBOX_AI_MODEL=' > /tmp/server.env.new || true
cat >> /tmp/server.env.new << 'EOF'
HYCBOX_AI_API_KEY=${AI_KEY}
HYCBOX_AI_BASE_URL=${AI_BASE}
HYCBOX_AI_MODEL=${AI_MODEL}
EOF
mv /tmp/server.env.new "$ENV"
chmod 600 "$ENV"
echo AI_ENV_UPDATED
# 若 docker 在跑则重启容器以加载新 env；否则重启 systemd
if docker ps --format '{{.Names}}' | grep -qx hycbox; then
  # compose 的 EnvironmentFile 可能不随 restart 重读，尽量 recreate
  cd /opt/hycbox/ci/hycBoxServer 2>/dev/null || true
  if [ -f docker-compose.yml ]; then
    docker compose up -d --force-recreate hycbox 2>/dev/null || docker restart hycbox
  else
    docker restart hycbox
  fi
  sleep 8
  docker ps --filter name=hycbox --format '{{.Names}} {{.Status}}'
else
  systemctl restart hycbox
  sleep 5
  systemctl is-active hycbox
fi
curl -s http://127.0.0.1:8080/api/health; echo
`
  await exec(conn, script)
  conn.end()
  console.log('\nAI env ready')
}

main().catch((e) => {
  console.error('失败:', e.message)
  process.exit(1)
})
