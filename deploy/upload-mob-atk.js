/**
 * 上传仙途怪物立绘（含攻击姿）到 /uploads/game/xian/mobs/
 * 用法：set HYC_SSH_PASSWORD=xxx && node deploy/upload-mob-atk.js
 */
const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { HOST, USER, PASSWORD } = require('./ssh-env')

const LOCAL = path.resolve(__dirname, '..', '..', 'hycBox', 'game-assets', 'xian', 'mobs')
const REMOTE = '/opt/hycbox/uploads/game/xian/mobs'

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(out || `exit ${code}`))))
        .on('data', (d) => { out += d })
        .stderr.on('data', (d) => { out += d })
    })
  })
}

function fastPut(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(local, remote, (err) => (err ? reject(err) : resolve()))
  })
}

async function main() {
  if (!fs.existsSync(LOCAL)) throw new Error('找不到目录: ' + LOCAL)
  const files = fs.readdirSync(LOCAL).filter((f) => f.endsWith('.png'))
  console.log('本地', files.length, LOCAL)

  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
  })
  console.log('SSH OK')
  await exec(conn, `mkdir -p ${REMOTE}`)
  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => (err ? reject(err) : resolve(s)))
  })
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    await fastPut(sftp, path.join(LOCAL, f), REMOTE + '/' + f)
    console.log(`[${i + 1}/${files.length}] ${f}`)
  }
  const sample = await exec(conn, `ls -la ${REMOTE}/*_atk.png | awk '{print $5,$9}'`)
  console.log('抽检:\n' + sample)
  conn.end()
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
