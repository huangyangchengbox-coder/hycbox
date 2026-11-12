const { Client } = require('ssh2')
const { PASSWORD: PASSWORD } = require('./ssh-env')

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => {
        if (code !== 0) reject(new Error(`exit ${code}\n${out}`))
        else resolve(out)
      }).on('data', (d) => { out += d.toString(); process.stdout.write(d) })
        .stderr.on('data', (d) => process.stderr.write(d))
    })
  })
}

async function main() {
  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host: 'hychyr.top', username: 'root', password: PASSWORD, tryKeyboard: true })
  })

  const script = `
set -e
cd /opt/hycbox
if [ ! -f cloudflared ]; then
  curl -L -o cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  chmod +x cloudflared
fi
pkill -f 'cloudflared tunnel --url http://127.0.0.1:8080' 2>/dev/null || true
sleep 1
nohup ./cloudflared tunnel --url http://127.0.0.1:8080 > /opt/hycbox/logs/tunnel.log 2>&1 &
sleep 8
grep -o 'https://[^ ]*trycloudflare.com' /opt/hycbox/logs/tunnel.log | head -1 || cat /opt/hycbox/logs/tunnel.log | tail -20
`
  const out = await exec(conn, script)
  conn.end()
  const match = out.match(/https:\/\/[^\s]+trycloudflare\.com/)
  if (match) {
    console.log('\nTUNNEL_URL=' + match[0])
  }
}

main().catch(e => { console.error(e.message); process.exit(1) })
