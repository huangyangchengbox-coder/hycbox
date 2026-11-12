/**
 * 安装 Docker（Alibaba Cloud Linux / CentOS），供 online 流水线发布用。
 * 用法：node deploy/setup-docker.js
 */
const { Client } = require('ssh2')

const { PASSWORD: PASSWORD } = require('./ssh-env')

function exec(conn, cmd, allowFail = false) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => {
        if (code !== 0 && !allowFail) reject(new Error(`exit ${code}: ${out.slice(-800)}`))
        else resolve(out)
      }).on('data', (d) => { out += d; process.stdout.write(d) })
        .stderr.on('data', (d) => { out += d; process.stderr.write(d) })
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

  console.log('1) Install Docker...')
  await exec(conn, `
set -e
if command -v docker >/dev/null 2>&1; then
  docker -v
  systemctl enable --now docker
  exit 0
fi

# Alibaba Cloud Linux 3 / CentOS 兼容安装
if command -v yum >/dev/null 2>&1; then
  yum install -y yum-utils device-mapper-persistent-data lvm2 || true
  # 优先阿里云镜像源
  yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo || true
  yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin || \\
    yum install -y docker || true
fi

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | bash
fi

systemctl enable --now docker
docker -v
docker compose version || docker-compose -v || true
`, true)

  console.log('\n2) Docker daemon mirror (Aliyun optional)...')
  await exec(conn, `
mkdir -p /etc/docker
if [ ! -f /etc/docker/daemon.json ]; then
  cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": ["https://docker.m.daocloud.io", "https://mirror.ccs.tencentyun.com"],
  "log-driver": "json-file",
  "log-opts": { "max-size": "20m", "max-file": "3" }
}
EOF
  systemctl restart docker
  sleep 2
fi
docker info 2>/dev/null | grep -E "Registry Mirrors|Server Version" || true
systemctl is-active docker
`, true)

  console.log('\n3) Ensure dirs + git safe.directory...')
  await exec(conn, `
mkdir -p /opt/hycbox/{uploads,logs,data,ci}
git config --global --add safe.directory /opt/gitea/data/gitea-repositories/hyc/hycboxserver.git || true
git config --global --add safe.directory /opt/hycbox/ci/hycBoxServer || true
# 取消卡住的旧 Actions 状态
sqlite3 /opt/gitea/data/gitea.db "UPDATE action_run SET status=5 WHERE status IN (1,2);" 2>/dev/null || true
sqlite3 /opt/gitea/data/gitea.db "UPDATE action_run_job SET status=5 WHERE status IN (1,2);" 2>/dev/null || true
sqlite3 /opt/gitea/data/gitea.db "UPDATE action_task SET status=5 WHERE status IN (1,2);" 2>/dev/null || true
systemctl is-active act_runner
`)

  console.log('\nDone. Push to online to deploy via Docker.')
  conn.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
