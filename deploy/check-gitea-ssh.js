const { Client } = require('ssh2')
const { PASSWORD: PASS } = require('./ssh-env')
const conn = new Client()

conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASS)))
conn.on('ready', () => {
  const cmd = [
    'grep -E "^(START_SSH|SSH_PORT|DISABLE_SSH|SSH_LISTEN|ROOT_URL|DOMAIN|SSH_DOMAIN)" /opt/gitea/custom/conf/app.ini 2>/dev/null || true',
    'ss -lntp | grep -E ":22|:2222|:3000" || true',
    'cat /opt/gitea/custom/conf/app.ini 2>/dev/null | head -80'
  ].join('\n')
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error(err)
      conn.end()
      return
    }
    stream.on('data', (d) => process.stdout.write(d))
    stream.stderr.on('data', (d) => process.stderr.write(d))
    stream.on('close', () => conn.end())
  })
})
conn.on('error', (e) => {
  console.error(e.message)
  process.exit(1)
})
conn.connect({ host: 'hychyr.top', username: 'root', password: PASS, tryKeyboard: true })
