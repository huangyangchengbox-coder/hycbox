const { Client } = require('ssh2')

const { PASSWORD: PASSWORD } = require('./ssh-env')

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => code === 0 ? resolve(out) : reject(new Error(`exit ${code}`)))
        .on('data', (d) => { out += d; process.stdout.write(d) })
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
    'curl -s http://127.0.0.1:8080/api/health || true',
    'echo',
    'systemctl is-active hycbox || true',
    'if systemctl is-active firewalld >/dev/null 2>&1; then',
    '  firewall-cmd --permanent --add-port=8080/tcp',
    '  firewall-cmd --reload',
    '  firewall-cmd --list-ports || true',
    'fi',
    'iptables -I INPUT -p tcp --dport 8080 -j ACCEPT 2>/dev/null || true',
    'ss -lntp | grep 8080 || netstat -lntp | grep 8080 || true'
  ].join('\n'))

  conn.end()
}

main().catch((e) => { console.error(e.message); process.exit(1) })
