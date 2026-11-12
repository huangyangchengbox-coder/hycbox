const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')

const { PASSWORD, requireEnv } = require('./ssh-env')
const NGINX_CONF = fs.readFileSync(path.join(__dirname, 'nginx-hychyr.top.conf'), 'utf8')

const GITEA_ADMIN_USER = process.env.HYC_GITEA_ADMIN_USER || 'hyc'
const GITEA_ADMIN_PASS = requireEnv('HYC_GITEA_ADMIN_PASS')
const GITEA_ADMIN_EMAIL = process.env.HYC_GITEA_ADMIN_EMAIL || 'admin@example.com'
const GITEA_SECRET_KEY = requireEnv('HYC_GITEA_SECRET_KEY')

function exec(conn, cmd, allowFail = false) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => {
        if (code !== 0 && !allowFail) reject(new Error(`exit ${code}: ${out}`))
        else resolve(out)
      }).on('data', (d) => { out += d.toString(); process.stdout.write(d) })
        .stderr.on('data', (d) => process.stderr.write(d))
    })
  })
}

function uploadContent(conn, content, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err)
      const ws = sftp.createWriteStream(remotePath)
      ws.on('close', resolve)
      ws.on('error', reject)
      ws.end(content)
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

  console.log('1) Update nginx...')
  await uploadContent(conn, NGINX_CONF, '/etc/nginx/conf.d/hychyr.top.conf')
  await exec(conn, 'mkdir -p /opt/hycbox/uploads && nginx -t && systemctl reload nginx')

  console.log('\n2) Install Gitea...')
  const installScript = `
set -e
mkdir -p /opt/gitea/{data,custom/conf,log}
cd /opt/gitea
if [ ! -f gitea ]; then
  curl -L -o gitea https://dl.gitea.com/gitea/1.22.6/gitea-1.22.6-linux-amd64
  chmod +x gitea
fi
id git >/dev/null 2>&1 || useradd --system --shell /bin/bash --home /opt/gitea --create-home git
chown -R git:git /opt/gitea

cat > /opt/gitea/custom/conf/app.ini << 'EOF'
APP_NAME = Hyc Git
RUN_USER = git
WORKDIR = /opt/gitea
RUN_MODE = prod

[database]
DB_TYPE = sqlite3
PATH = /opt/gitea/data/gitea.db

[repository]
ROOT = /opt/gitea/data/gitea-repositories

[server]
DOMAIN = hychyr.top
HTTP_ADDR = 127.0.0.1
HTTP_PORT = 3000
ROOT_URL = https://hychyr.top/git/
DISABLE_SSH = true
START_SSH_SERVER = false
OFFLINE_MODE = false
LFS_START_SERVER = false

[security]
INSTALL_LOCK = true
SECRET_KEY = ${GITEA_SECRET_KEY}
INTERNAL_TOKEN = 

[service]
DISABLE_REGISTRATION = true
REQUIRE_SIGNIN_VIEW = false
ENABLE_NOTIFY_MAIL = false

[log]
MODE = file
LEVEL = Info
ROOT_PATH = /opt/gitea/log
EOF
chown -R git:git /opt/gitea

cat > /etc/systemd/system/gitea.service << 'EOF'
[Unit]
Description=Gitea
After=network.target

[Service]
Type=simple
User=git
Group=git
WorkingDirectory=/opt/gitea
ExecStart=/opt/gitea/gitea web --config /opt/gitea/custom/conf/app.ini
Restart=always
RestartSec=3
Environment=USER=git HOME=/opt/gitea GITEA_WORK_DIR=/opt/gitea

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable gitea
systemctl restart gitea
sleep 4
systemctl is-active gitea
`
  await exec(conn, installScript)

  console.log('\n3) Create admin user if missing...')
  await exec(conn, `
su - git -c "/opt/gitea/gitea admin user list --config /opt/gitea/custom/conf/app.ini" | grep -q "${GITEA_ADMIN_USER}" \\
  || su - git -c "/opt/gitea/gitea admin user create --config /opt/gitea/custom/conf/app.ini --admin --username ${GITEA_ADMIN_USER} --password '${GITEA_ADMIN_PASS}' --email ${GITEA_ADMIN_EMAIL} --must-change-password=false"
`, true)

  console.log('\n4) Create repositories...')
  await exec(conn, `
TOKEN=$(su - git -c "/opt/gitea/gitea admin user generate-access-token --config /opt/gitea/custom/conf/app.ini --username ${GITEA_ADMIN_USER} --token-name deploy-$(date +%s) --scopes all 2>/dev/null | tail -1")
echo "TOKEN_LEN=\${#TOKEN}"
curl -s -X POST "http://127.0.0.1:3000/api/v1/user/repos" \\
  -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \\
  -d '{"name":"hycBox","private":true,"auto_init":false,"description":"恒大名都水果领取小程序"}' || true
echo
curl -s -X POST "http://127.0.0.1:3000/api/v1/user/repos" \\
  -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \\
  -d '{"name":"hycBoxServer","private":true,"auto_init":false,"description":"恒大名都水果领取后端"}' || true
echo
# save token for push
echo "$TOKEN" > /opt/gitea/deploy-token.txt
chmod 600 /opt/gitea/deploy-token.txt
chown git:git /opt/gitea/deploy-token.txt
echo TOKEN_SAVED
`, true)

  await exec(conn, 'curl -s -o /dev/null -w "git:%{http_code}\\n" http://127.0.0.1:3000/; curl -s -o /dev/null -w "nginx-git:%{http_code}\\n" -H "Host: hychyr.top" https://127.0.0.1/git/ -k || true', true)

  conn.end()
  console.log('\nGitea ready: https://hychyr.top/git/')
  console.log(`Admin user: ${GITEA_ADMIN_USER}`)
}

main().catch((e) => { console.error('Failed:', e.message); process.exit(1) })
