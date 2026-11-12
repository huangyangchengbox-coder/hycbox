/**
 * 启用 Gitea Actions，安装本机 act_runner（标签 hyc-online），并安装 Maven。
 * 合并到 online 分支后由 .gitea/workflows/deploy-online.yml 自动发布。
 *
 * 用法：node deploy/setup-gitea-actions.js
 */
const { Client } = require('ssh2')

const { PASSWORD: PASSWORD } = require('./ssh-env')
const GITEA_ADMIN = 'hyc'
const RUNNER_NAME = 'hyc-online-runner'
const RUNNER_LABEL = 'hyc-online:host'
const RUNNER_DIR = '/opt/act_runner'

function exec(conn, cmd, allowFail = false) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => {
        if (code !== 0 && !allowFail) {
          reject(new Error(`exit ${code}: ${out}`))
          return
        }
        resolve(out)
      }).on('data', (d) => {
        out += d.toString()
        process.stdout.write(d)
      }).stderr.on('data', (d) => {
        out += d.toString()
        process.stderr.write(d)
      })
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

  console.log('1) Enable Gitea Actions in app.ini...')
  await exec(conn, `
set -e
INI=/opt/gitea/custom/conf/app.ini
if ! grep -q '^\\[actions\\]' "$INI"; then
  cat >> "$INI" << 'EOF'

[actions]
ENABLED = true
DEFAULT_ACTIONS_URL = github
EOF
else
  # 确保 ENABLED=true，并修正 DEFAULT_ACTIONS_URL
  sed -i '/^\\[actions\\]/,/^\\[/ s/^ENABLED.*/ENABLED = true/' "$INI"
  sed -i '/^\\[actions\\]/,/^\\[/ s|^DEFAULT_ACTIONS_URL.*|DEFAULT_ACTIONS_URL = github|' "$INI"
  if ! awk '/^\\[actions\\]/{f=1} f&&/^ENABLED/{found=1} /^\\[/{if(f&&!/^\\[actions\\]/)exit} END{exit !found}' "$INI"; then
    sed -i '/^\\[actions\\]//a ENABLED = true' "$INI"
  fi
fi
chown git:git "$INI"
systemctl restart gitea
sleep 4
systemctl is-active gitea
grep -A5 '^\\[actions\\]' "$INI" || true
`)

  console.log('\n2) Install JDK + Maven if missing...')
  await exec(conn, `
set -e
if ! command -v java >/dev/null 2>&1; then
  yum install -y java-17-openjdk-devel || apt-get install -y openjdk-17-jdk
fi
if ! command -v mvn >/dev/null 2>&1; then
  if command -v yum >/dev/null 2>&1; then
    yum install -y maven || true
  fi
fi
if ! command -v mvn >/dev/null 2>&1; then
  mkdir -p /opt/maven
  cd /tmp
  if [ ! -f /opt/maven/bin/mvn ]; then
    curl -fsSL -o maven.tgz https://dlcdn.apache.org/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.tar.gz \\
      || curl -fsSL -o maven.tgz https://archive.apache.org/dist/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.tar.gz
    tar -xzf maven.tgz -C /opt/maven --strip-components=1
    ln -sfn /opt/maven/bin/mvn /usr/local/bin/mvn
  fi
fi
java -version
mvn -v | head -3
`, true)

  console.log('\n3) Install act_runner binary...')
  await exec(conn, `
set -e
mkdir -p ${RUNNER_DIR}
cd ${RUNNER_DIR}
if [ ! -x ${RUNNER_DIR}/act_runner ]; then
  curl -fsSL -o act_runner https://dl.gitea.com/act_runner/0.2.11/act_runner-0.2.11-linux-amd64 \\
    || curl -fsSL -o act_runner https://gitea.com/gitea/act_runner/releases/download/v0.2.11/act_runner-0.2.11-linux-amd64
  chmod +x act_runner
fi
./act_runner --version
`)

  console.log('\n4) Register runner (idempotent if .runner exists)...')
  await exec(conn, `
set -e
cd ${RUNNER_DIR}
if [ -f .runner ]; then
  echo "runner already registered"
  cat .runner | head -c 200; echo
  exit 0
fi

# 生成实例级 runner registration token
TOKEN=$(su - git -c "/opt/gitea/gitea actions generate-runner-token --config /opt/gitea/custom/conf/app.ini" 2>/dev/null | grep -E '^[A-Za-z0-9]+$' | tail -1)
echo "TOKEN_LEN=\${#TOKEN}"
if [ -z "\$TOKEN" ]; then
  echo "failed to get runner token" >&2
  exit 1
fi

./act_runner register \\
  --instance http://127.0.0.1:3000 \\
  --token "\$TOKEN" \\
  --name ${RUNNER_NAME} \\
  --labels ${RUNNER_LABEL} \\
  --no-interactive

ls -la ${RUNNER_DIR}
`)

  console.log('\n5) Systemd unit for act_runner...')
  await exec(conn, `
set -e
JAVA17=$(ls -d /usr/lib/jvm/java-17-openjdk-* 2>/dev/null | head -1)
cat > /etc/systemd/system/act_runner.service << ENDOFF
[Unit]
Description=Gitea Act Runner (hyc-online)
After=network.target gitea.service
Wants=gitea.service

[Service]
Type=simple
User=root
WorkingDirectory=${RUNNER_DIR}
ExecStart=${RUNNER_DIR}/act_runner daemon
Restart=always
RestartSec=5
Environment=HOME=/root
Environment=JAVA_HOME=$JAVA17

[Install]
WantedBy=multi-user.target
ENDOFF
systemctl daemon-reload
systemctl enable act_runner
systemctl restart act_runner
sleep 3
systemctl --no-pager --full status act_runner || true
`)

  console.log('\n6) Enable Actions on hycBoxServer repo via API...')
  await exec(conn, `
set -e
RAW=$(su - git -c "/opt/gitea/gitea admin user generate-access-token --config /opt/gitea/custom/conf/app.ini --username ${GITEA_ADMIN} --token-name actions-$(date +%s) --scopes all" 2>/dev/null)
API_TOKEN=$(echo "\$RAW" | grep -oE '[0-9a-f]{40}' | tail -1)
if [ -z "\$API_TOKEN" ]; then
  API_TOKEN=$(echo "\$RAW" | grep -vE '\\[E\\]|\\[W\\]|loadActions' | tail -1 | tr -d '\\r\\n ')
fi
echo "API_TOKEN_LEN=\${#API_TOKEN}"
for path in hyc/hycBoxServer; do
  CODE=$(curl -s -o /tmp/gitea-repo.json -w "%{http_code}" \\
    -X PATCH "http://127.0.0.1:3000/api/v1/repos/\$path" \\
    -H "Authorization: token \$API_TOKEN" \\
    -H "Content-Type: application/json" \\
    -d '{"has_actions":true}')
  echo "PATCH \$path -> \$CODE"
  head -c 300 /tmp/gitea-repo.json; echo
done
`, true)

  console.log('\nDone. Push to branch online to trigger deploy.')
  conn.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
