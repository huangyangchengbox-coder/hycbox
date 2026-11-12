/**
 * 上传凡人主角图 + 各境界突破配图
 * 用法：set HYC_SSH_PASSWORD=xxx && node deploy/upload-realm-fx.js
 */
const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { HOST, USER, PASSWORD } = require('./ssh-env')

const XIAN = path.resolve(__dirname, '..', '..', 'hycBox', 'game-assets', 'xian')
const REMOTE = '/opt/hycbox/uploads/game/xian'

const FILES = [
  'heroes/player_fixed.png',
  'heroes/player_mortal.png',
  'fx/realms/lianqi.jpg',
  'fx/realms/zhuji.jpg',
  'fx/realms/jiedan.jpg',
  'fx/realms/yuanying.jpg',
  'fx/realms/huashen.jpg',
  'fx/realms/lianxu.jpg',
  'fx/realms/heti.jpg',
  'fx/realms/dacheng.jpg',
  'fx/realms/zhenxian.jpg',
  'fx/realms/jinxian.jpg',
  'fx/realms/taiyi.jpg',
  'fx/realms/daluo.jpg',
  'fx/realms/daozu.jpg'
]

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('data', (d) => { out += d })
      stream.stderr.on('data', (d) => { out += d })
      stream.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(out || String(code)))))
    })
  })
}

function fastPut(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(local, remote, (err) => (err ? reject(err) : resolve()))
  })
}

async function main() {
  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve)
    conn.on('error', reject)
    conn.connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
  })
  console.log('SSH OK')
  await exec(conn, 'mkdir -p ' + REMOTE + '/heroes ' + REMOTE + '/fx/realms')
  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => (err ? reject(err) : resolve(s)))
  })
  for (let i = 0; i < FILES.length; i++) {
    const rel = FILES[i]
    const local = path.join(XIAN, rel)
    if (!fs.existsSync(local)) throw new Error('missing ' + local)
    await fastPut(sftp, local, REMOTE + '/' + rel)
    console.log('ok', rel, fs.statSync(local).size)
  }
  console.log(await exec(conn, 'ls -la ' + REMOTE + '/fx/realms && ls -la ' + REMOTE + '/heroes/player_fixed.png'))
  conn.end()
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
