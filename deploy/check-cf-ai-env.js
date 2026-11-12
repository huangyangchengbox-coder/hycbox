/**
 * 校验远端是否已写入 Cloudflare Workers AI 环境变量（不打印明文 Token）
 */
const { Client } = require('ssh2')
const { HOST, USER, PASSWORD } = require('./ssh-env')

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => resolve({ code, out }))
        .on('data', (d) => { out += d })
        .stderr.on('data', (d) => { out += d })
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
  const { out } = await exec(conn, `
set +e
echo '--- CF keys ---'
grep -E '^HYCBOX_CF_' /opt/hycbox/server.env | sed 's/=\\(.*\\)/=***/' || true
echo '--- service ---'
systemctl is-active hycbox 2>/dev/null || docker ps --filter name=hycbox --format '{{.Names}} {{.Status}}'
echo '--- health ---'
curl -s -o /tmp/hyc_health.txt -w '%{http_code}' http://127.0.0.1:8080/api/health
echo
head -c 200 /tmp/hyc_health.txt; echo
`)
  console.log(out)
  conn.end()
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
