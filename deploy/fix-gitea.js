const { Client } = require('ssh2')
const { PASSWORD: PASSWORD } = require('./ssh-env')
const GITEA_ADMIN_USER = 'hyc'
const GITEA_ADMIN_PASS = 'HycGit@2026'
const GITEA_ADMIN_EMAIL = 'mingcheng90@163.com'

function exec(conn, cmd, allowFail = false) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => {
        if (code !== 0 && !allowFail) reject(new Error(`exit ${code}`))
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

  await exec(conn, 'yum install -y git && systemctl restart gitea && sleep 5 && systemctl is-active gitea')
  await exec(conn, `
su - git -c "/opt/gitea/gitea admin user list --config /opt/gitea/custom/conf/app.ini" | grep -q "${GITEA_ADMIN_USER}" \\
  || su - git -c "/opt/gitea/gitea admin user create --config /opt/gitea/custom/conf/app.ini --admin --username ${GITEA_ADMIN_USER} --password '${GITEA_ADMIN_PASS}' --email ${GITEA_ADMIN_EMAIL} --must-change-password=false"
`, true)

  const tokenOut = await exec(conn, `
TOKEN=$(su - git -c "/opt/gitea/gitea admin user generate-access-token --config /opt/gitea/custom/conf/app.ini --username ${GITEA_ADMIN_USER} --token-name push-$(date +%s) --scopes all" | tail -1)
echo "$TOKEN" > /tmp/gitea-token.txt
echo "TOKEN=$TOKEN"
curl -s -o /dev/null -w "create_hycBox:%{http_code}\\n" -X POST "http://127.0.0.1:3000/api/v1/user/repos" \\
  -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \\
  -d '{"name":"hycBox","private":true,"auto_init":false,"description":"恒大名都水果领取小程序"}'
curl -s -o /dev/null -w "create_server:%{http_code}\\n" -X POST "http://127.0.0.1:3000/api/v1/user/repos" \\
  -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \\
  -d '{"name":"hycBoxServer","private":true,"auto_init":false,"description":"恒大名都水果领取后端"}'
curl -s -o /dev/null -w "home:%{http_code}\\n" http://127.0.0.1:3000/
curl -sk -o /dev/null -w "proxy:%{http_code}\\n" https://127.0.0.1/git/
`)
  conn.end()
  const m = tokenOut.match(/TOKEN=([^\r\n]+)/)
  if (m) {
    require('fs').writeFileSync(require('path').join(__dirname, 'gitea-token.local'), m[1].trim())
    console.log('\nToken saved to deploy/gitea-token.local')
  }
}

main().catch((e) => { console.error(e.message); process.exit(1) })
