/**
 * 写入 NVIDIA NIM 配置到 /opt/hycbox/server.env（不覆盖其他项）
 * 用法：
 *   set HYCBOX_NVIDIA_NIM_API_KEY=nvapi-xxx
 *   set HYC_SSH_PASSWORD=xxx
 *   node deploy/set-nvidia-nim-env.js
 */
const { Client } = require('ssh2')
const { HOST, USER, PASSWORD } = require('./ssh-env')

const NIM_KEY = process.env.HYCBOX_NVIDIA_NIM_API_KEY || ''
const NIM_BASE = process.env.HYCBOX_NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1'
const NIM_MODEL = process.env.HYCBOX_NVIDIA_NIM_DEFAULT_MODEL || 'meta/llama-3.1-8b-instruct'
const ALSO_TRIAL = process.argv.includes('--trial')

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

function patchEnvScript(envPath) {
  return `
ENV=${envPath}
touch "$ENV"
chmod 600 "$ENV"
grep -v '^HYCBOX_NVIDIA_NIM_API_KEY=' "$ENV" \\
  | grep -v '^HYCBOX_NVIDIA_NIM_BASE_URL=' \\
  | grep -v '^HYCBOX_NVIDIA_NIM_DEFAULT_MODEL=' > /tmp/server.env.nim || true
cat >> /tmp/server.env.nim << 'EOF'
HYCBOX_NVIDIA_NIM_API_KEY=${NIM_KEY}
HYCBOX_NVIDIA_NIM_BASE_URL=${NIM_BASE}
HYCBOX_NVIDIA_NIM_DEFAULT_MODEL=${NIM_MODEL}
EOF
mv /tmp/server.env.nim "$ENV"
chmod 600 "$ENV"
echo NIM_ENV_UPDATED:$ENV
`
}

async function main() {
  if (!NIM_KEY) throw new Error('缺少 HYCBOX_NVIDIA_NIM_API_KEY')
  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
  })

  let script = `set -e\n${patchEnvScript('/opt/hycbox/server.env')}`
  if (ALSO_TRIAL) {
    script += patchEnvScript('/opt/hycbox-trial/server.env')
  }
  script += `
if systemctl is-active --quiet hycbox; then
  systemctl restart hycbox
  sleep 6
  systemctl is-active hycbox
fi
`
  if (ALSO_TRIAL) {
    script += `
if systemctl is-active --quiet hycbox-trial; then
  systemctl restart hycbox-trial
  sleep 6
  systemctl is-active hycbox-trial
fi
`
  }
  script += `
curl -sf http://127.0.0.1:8080/api/health || true
echo
`
  await exec(conn, script)
  conn.end()
  console.log('\nNVIDIA NIM env ready')
}

main().catch((e) => {
  console.error('失败:', e.message)
  process.exit(1)
})
