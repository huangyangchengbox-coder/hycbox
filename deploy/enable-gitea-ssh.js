const { Client } = require('ssh2')

const { PASSWORD: PASSWORD } = require('./ssh-env')
const SSH_PORT = 2222
const SSH_DOMAIN = 'hychyr.top'

function exec(conn, cmd, allowFail = false) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => {
        if (code !== 0 && !allowFail) reject(new Error(`exit ${code}: ${out}`))
        else resolve(out)
      }).on('data', (d) => {
        out += d.toString()
        process.stdout.write(d)
      }).stderr.on('data', (d) => process.stderr.write(d))
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

  console.log('1) Enable Gitea built-in SSH on port', SSH_PORT)
  // 用 sed 改现有配置，避免覆盖其他字段
  await exec(conn, `
set -e
INI=/opt/gitea/custom/conf/app.ini
cp -a "$INI" "$INI.bak.$(date +%Y%m%d%H%M%S)"

# 开关与域名/端口
sed -i 's/^DISABLE_SSH.*/DISABLE_SSH = false/' "$INI"
sed -i 's/^START_SSH_SERVER.*/START_SSH_SERVER = true/' "$INI"

# 若没有相关键则追加到 [server]
grep -q '^SSH_DOMAIN' "$INI" || sed -i '/^\\[server\\]/a SSH_DOMAIN = ${SSH_DOMAIN}' "$INI"
grep -q '^SSH_PORT' "$INI" || sed -i '/^\\[server\\]/a SSH_PORT = ${SSH_PORT}' "$INI"
grep -q '^SSH_LISTEN_PORT' "$INI" || sed -i '/^\\[server\\]/a SSH_LISTEN_PORT = ${SSH_PORT}' "$INI"
grep -q '^SSH_LISTEN_HOST' "$INI" || sed -i '/^\\[server\\]/a SSH_LISTEN_HOST = 0.0.0.0' "$INI"

sed -i 's/^SSH_DOMAIN.*/SSH_DOMAIN = ${SSH_DOMAIN}/' "$INI"
sed -i 's/^SSH_PORT.*/SSH_PORT = ${SSH_PORT}/' "$INI"
sed -i 's/^SSH_LISTEN_PORT.*/SSH_LISTEN_PORT = ${SSH_PORT}/' "$INI"
sed -i 's/^SSH_LISTEN_HOST.*/SSH_LISTEN_HOST = 0.0.0.0/' "$INI"

chown git:git "$INI"
echo '--- server section ---'
awk '/^\\[server\\]/{p=1} p&&/^\\[/{if(!/^\\[server\\]/) exit} p' "$INI"
`)

  console.log('\n2) Restart Gitea...')
  await exec(conn, 'systemctl restart gitea && sleep 3 && systemctl is-active gitea')

  console.log('\n3) Open firewall port', SSH_PORT)
  await exec(conn, `
if systemctl is-active firewalld >/dev/null 2>&1; then
  firewall-cmd --permanent --add-port=${SSH_PORT}/tcp
  firewall-cmd --reload
  firewall-cmd --list-ports || true
fi
iptables -C INPUT -p tcp --dport ${SSH_PORT} -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport ${SSH_PORT} -j ACCEPT
`, true)

  console.log('\n4) Verify listen...')
  await exec(conn, `
ss -lntp | grep ${SSH_PORT} || true
systemctl status gitea --no-pager -l | head -40
`, true)

  conn.end()
  console.log(`
Done.
SSH clone examples:
  git clone ssh://git@${SSH_DOMAIN}:${SSH_PORT}/hyc/hycBox.git
  git clone ssh://git@${SSH_DOMAIN}:${SSH_PORT}/hyc/hycBoxServer.git

先在 Gitea 添加 SSH 公钥：
  http://${SSH_DOMAIN}/git/user/settings/keys
账号: hyc

若仍连不上，请在阿里云安全组放行 TCP ${SSH_PORT}。
`)
}

main().catch((e) => {
  console.error('失败:', e.message)
  process.exit(1)
})
