const { Client } = require('ssh2')
const { PASSWORD: PASSWORD } = require('./ssh-env')

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', () => resolve(out))
        .on('data', (d) => { out += d.toString(); process.stdout.write(d) })
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

  await exec(conn, [
    'echo === metadata ===',
    'curl -s http://100.100.100.200/latest/meta-data/instance-id || true',
    'echo',
    'curl -s http://100.100.100.200/latest/meta-data/region-id || true',
    'echo',
    'which aliyun 2>/dev/null || true',
    'which aliyun-cli 2>/dev/null || true',
    'echo === listening ===',
    'ss -lntp | head -20 || true',
    'echo === firewalld ===',
    'firewall-cmd --list-all 2>/dev/null || echo no-firewalld'
  ].join('\n'))
  conn.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
