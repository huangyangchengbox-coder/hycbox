/**
 * 生产环境：server.env / Gitea ROOT_URL 切到域名，并重启服务
 */
const { Client } = require('ssh2')
const { HOST, USER, PASSWORD } = require('./ssh-env')

const conn = new Client()
conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
conn.on('ready', () => {
  const cmd = `
set -e
ENV=/opt/hycbox/server.env
if [ -f "$ENV" ]; then
  cp -a "$ENV" "$ENV.bak.domain.$(date +%Y%m%d%H%M%S)"
  sed -i 's|http://8.152.99.189|https://hychyr.top|g' "$ENV"
  sed -i 's|https://hychyr.top:8080|https://hychyr.top|g' "$ENV"
  grep -E 'PUBLIC_BASE|UPLOAD_PUBLIC' "$ENV" || true
else
  echo MISSING_SERVER_ENV
fi
INI=/opt/gitea/custom/conf/app.ini
if [ -f "$INI" ]; then
  sed -i 's|^DOMAIN = .*|DOMAIN = hychyr.top|' "$INI"
  sed -i 's|^ROOT_URL = .*|ROOT_URL = https://hychyr.top/git/|' "$INI"
  grep -E '^(DOMAIN|ROOT_URL)=' "$INI" || true
  systemctl restart gitea || true
fi
systemctl restart hycbox || true
systemctl is-active hycbox || true
sleep 2
curl -s -m 8 https://hychyr.top/api/health || curl -sk -m 8 https://127.0.0.1/api/health -H 'Host: hychyr.top' || true
echo
`
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error(err)
      conn.end()
      process.exit(1)
    }
    stream.on('data', (d) => process.stdout.write(d))
    stream.stderr.on('data', (d) => process.stderr.write(d))
    stream.on('close', (code) => {
      conn.end()
      process.exit(code || 0)
    })
  })
})
conn.on('error', (e) => {
  console.error(e.message)
  process.exit(1)
})
conn.connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true })
