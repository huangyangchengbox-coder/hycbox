/**
 * 把生产 server.env 中的 Cloudflare Workers AI 配置同步到体验环境
 */
const { Client } = require('ssh2')
const { HOST, USER, PASSWORD } = require('./ssh-env')

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => {
        if (code === 0) resolve(out)
        else reject(new Error(out.slice(-800) || `exit ${code}`))
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

async function main() {
  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
  })

  await exec(conn, `
set -e
PROD=/opt/hycbox/server.env
TRIAL=/opt/hycbox-trial/server.env
test -f "$PROD"
test -f "$TRIAL"
TMP=/tmp/trial.env.cf.$$
cp "$TRIAL" "$TMP"
for k in HYCBOX_CF_ACCOUNT_ID HYCBOX_CF_API_TOKEN HYCBOX_CF_DEFAULT_MODEL; do
  v=$(grep -E "^$k=" "$PROD" | head -1 || true)
  if [ -n "$v" ]; then
    grep -v "^$k=" "$TMP" > "$TMP.new" || true
    echo "$v" >> "$TMP.new"
    mv "$TMP.new" "$TMP"
  fi
done
mv "$TMP" "$TRIAL"
chmod 600 "$TRIAL"
echo CF_TRIAL_SYNCED
grep -E '^HYCBOX_CF_' "$TRIAL" | sed 's/=.*/=***/'
`)

  conn.end()
  console.log('\ntrial CF env synced')
}

main().catch((e) => {
  console.error('失败:', e.message)
  process.exit(1)
})
