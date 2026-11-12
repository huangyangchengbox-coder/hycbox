const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { PASSWORD: PASSWORD } = require('./ssh-env')
const USER = 'hyc'
const PASS = 'HycGit@2026'

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => code === 0 ? resolve(out) : reject(new Error(out || 'exit ' + code)))
        .on('data', (d) => { out += d.toString(); process.stdout.write(d) })
        .stderr.on('data', (d) => process.stderr.write(d))
    })
  })
}

async function main() {
  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n,i,l,p,f)=>f(p.map(()=>PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host:'hychyr.top', username:'root', password:PASSWORD, tryKeyboard:true })
  })

  const out = await exec(conn, `
RAW=$(su - git -c "/opt/gitea/gitea admin user generate-access-token --config /opt/gitea/custom/conf/app.ini --username ${USER} --token-name cli-$(date +%s) --scopes write:repository,write:user,write:admin")
TOKEN=$(echo "$RAW" | grep -oE '[0-9a-f]{40}' | tail -1)
echo "TOKEN=$TOKEN"
curl -s -w "\\nHTTP:%{http_code}\\n" -X POST "http://127.0.0.1:3000/api/v1/user/repos" \\
  -u "${USER}:${PASS}" -H "Content-Type: application/json" \\
  -d '{"name":"hycBox","private":true,"auto_init":false,"description":"fruit miniprogram"}'
curl -s -w "\\nHTTP:%{http_code}\\n" -X POST "http://127.0.0.1:3000/api/v1/user/repos" \\
  -u "${USER}:${PASS}" -H "Content-Type: application/json" \\
  -d '{"name":"hycBoxServer","private":true,"auto_init":false,"description":"fruit backend"}'
echo "$TOKEN" > /opt/gitea/push-token.txt
chmod 600 /opt/gitea/push-token.txt
`)
  conn.end()
  const m = out.match(/TOKEN=([0-9a-f]{40})/)
  if (m) {
    fs.writeFileSync(path.join(__dirname, 'gitea-token.local'), m[1])
    console.log('token ok')
  }
}
main().catch(e => { console.error(e.message); process.exit(1) })
