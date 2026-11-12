const { Client } = require('ssh2')
const { PASSWORD: PASSWORD } = require('./ssh-env')

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', () => resolve(out))
        .on('data', (d) => { out += d.toString(); process.stdout.write(d) })
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

  const script = `
REGION=cn-beijing
INSTANCE_ID=i-2ze7j5laqp665hy93kdu
aliyun configure list 2>&1 || true
echo '---'
aliyun ecs DescribeInstanceAttribute --RegionId $REGION --InstanceId $INSTANCE_ID 2>&1 | head -80 || true
echo '---'
aliyun ecs DescribeSecurityGroupAttribute --RegionId $REGION --SecurityGroupId $(aliyun ecs DescribeInstanceAttribute --RegionId $REGION --InstanceId $INSTANCE_ID 2>/dev/null | grep -o 'sg-[a-z0-9]*' | head -1) 2>&1 | head -100 || true
`
  await exec(conn, script)
  conn.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
