/**
 * 写入 Cloudflare Workers AI 配置到 /opt/hycbox/server.env（不覆盖其他项）
 * 用法：
 *   set HYCBOX_CF_ACCOUNT_ID=xxx
 *   set HYCBOX_CF_API_TOKEN=xxx
 *   set HYC_SSH_PASSWORD=xxx
 *   node deploy/set-cf-ai-env.js
 */
const { Client } = require('ssh2')
const { HOST, USER, PASSWORD } = require('./ssh-env')

const CF_ACCOUNT = process.env.HYCBOX_CF_ACCOUNT_ID || ''
const CF_TOKEN = process.env.HYCBOX_CF_API_TOKEN || ''
const CF_MODEL = process.env.HYCBOX_CF_DEFAULT_MODEL || '@cf/meta/llama-3.1-8b-instruct'

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
  if (!CF_ACCOUNT) throw new Error('缺少 HYCBOX_CF_ACCOUNT_ID')
  if (!CF_TOKEN) throw new Error('缺少 HYCBOX_CF_API_TOKEN')
  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
  })
  const script = `
set -e
ENV=/opt/hycbox/server.env
touch "$ENV"
chmod 600 "$ENV"
grep -v '^HYCBOX_CF_ACCOUNT_ID=' "$ENV" \\
  | grep -v '^HYCBOX_CF_API_TOKEN=' \\
  | grep -v '^HYCBOX_CF_DEFAULT_MODEL=' > /tmp/server.env.new || true
cat >> /tmp/server.env.new << 'EOF'
HYCBOX_CF_ACCOUNT_ID=${CF_ACCOUNT}
HYCBOX_CF_API_TOKEN=${CF_TOKEN}
HYCBOX_CF_DEFAULT_MODEL=${CF_MODEL}
EOF
mv /tmp/server.env.new "$ENV"
chmod 600 "$ENV"
echo CF_AI_ENV_UPDATED
if docker ps --format '{{.Names}}' | grep -qx hycbox; then
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
curl -sf http://127.0.0.1:8080/api/health || curl -sf http://127.0.0.1:8080/actuator/health || true
echo
`
  await exec(conn, script)
  conn.end()
  console.log('\nCloudflare Workers AI env ready')
}

main().catch((e) => {
  console.error('失败:', e.message)
  process.exit(1)
})
