/**
 * 检查服务器是否具备本地部署 AI 模型的基本条件
 */
const { Client } = require('ssh2')
const { HOST, USER, PASSWORD } = require('./ssh-env')

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', () => resolve(out))
        .on('data', (d) => { out += d })
        .stderr.on('data', (d) => { out += d })
    })
  })
}

async function main() {
  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
  })

  const cmd = `
set +e
echo '=== HOST ==='
hostname
uname -r
echo
echo '=== CPU ==='
nproc
lscpu | egrep 'Model name|CPU\\(s\\)|Thread|Core|Architecture|Socket' | head -20
echo
echo '=== MEM ==='
free -h
echo
echo '=== DISK ==='
df -h / /opt
echo
echo '=== GPU ==='
if command -v nvidia-smi >/dev/null 2>&1; then
  nvidia-smi -L
  nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv
else
  echo 'nvidia-smi: NOT_FOUND'
fi
lspci 2>/dev/null | egrep -i 'VGA|3D|NVIDIA' || echo 'lspci: no GPU line'
echo
echo '=== DOCKER ==='
docker --version 2>/dev/null || echo 'docker: NOT_FOUND'
echo
echo '=== ALIYUN META ==='
TOK=$(curl -s -m 2 -X PUT -H 'X-aliyun-ecs-metadata-token-ttl-seconds: 10' http://10.10.0.1/latest/api/token)
curl -s -m 2 -H "X-aliyun-ecs-metadata-token: $TOK" http://10.10.0.1/latest/meta-data/instance-type
echo
curl -s -m 2 -H "X-aliyun-ecs-metadata-token: $TOK" http://10.10.0.1/latest/meta-data/instance/instance-type
echo
`
  const out = await exec(conn, cmd)
  console.log(out)
  conn.end()
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
