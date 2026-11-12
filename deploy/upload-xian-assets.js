/**
 * 上传仙途静态图到 https://hychyr.top/uploads/game/xian/
 * 用法：set HYC_SSH_PASSWORD=xxx && node deploy/upload-xian-assets.js
 */
const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { HOST, USER, PASSWORD } = require('./ssh-env')

const LOCAL_ROOT = path.resolve(__dirname, '..', '..', 'hycBox', 'game-assets', 'xian')
const REMOTE_ROOT = '/opt/hycbox/uploads/game/xian'

function walk(dir, base = dir) {
  let out = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) out = out.concat(walk(p, base))
    else out.push({ local: p, rel: path.relative(base, p).split(path.sep).join('/') })
  }
  return out
}

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
  if (!fs.existsSync(LOCAL_ROOT)) {
    throw new Error('找不到本地资源目录: ' + LOCAL_ROOT)
  }
  const files = walk(LOCAL_ROOT)
  console.log('本地文件', files.length, LOCAL_ROOT)

  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
  })
  console.log('SSH OK')

  await exec(conn, `mkdir -p ${REMOTE_ROOT}/{idle,walk,attack,hurt,dead,heroes,tombs}`)

  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => (err ? reject(err) : resolve(s)))
  })

  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const remote = REMOTE_ROOT + '/' + f.rel
    await fastPut(sftp, f.local, remote)
    process.stdout.write(`[${i + 1}/${files.length}] ${f.rel}\n`)
  }

  // 抽检
  const sample = await exec(conn, `ls -la ${REMOTE_ROOT}/grass.png ${REMOTE_ROOT}/heroes/player_fixed.png | awk '{print $5,$9}'`)
  console.log('抽检:\n' + sample)
  console.log('完成 → https://hychyr.top/uploads/game/xian/')
  conn.end()
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
