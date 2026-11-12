const { Client } = require('ssh2')
const { PASSWORD: PASS } = require('./ssh-env')
const conn = new Client()

conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASS)))
conn.on('ready', () => {
  const cmd = `
set -e
INI=/opt/gitea/custom/conf/app.ini
cp -a "$INI" "$INI.bak.rooturl.$(date +%Y%m%d%H%M%S)"
sed -i 's|^DOMAIN = .*|DOMAIN = hychyr.top|' "$INI"
sed -i 's|^ROOT_URL = .*|ROOT_URL = https://hychyr.top/git/|' "$INI"
chown git:git "$INI"
grep -E "^(DOMAIN|ROOT_URL|DISABLE_SSH|START_SSH|SSH_)" "$INI"
systemctl restart gitea
sleep 3
systemctl is-active gitea
curl -sI http://127.0.0.1/git/user/login -H "Host: hychyr.top" | head -15
`
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
