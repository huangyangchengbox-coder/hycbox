/**
 * 上传凡人打坐天气背景图 fx/weather/sky_storm.jpg、sky_dawn.jpg
 * 用法：set HYC_SSH_PASSWORD=xxx && node deploy/upload-weather.js
 */
const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { HOST, USER, PASSWORD } = require('./ssh-env')

const LOCAL_DIR = path.resolve(__dirname, '..', '..', 'hycBox', 'game-assets', 'xian', 'fx', 'weather')
const REMOTE_DIR = '/opt/hycbox/uploads/game/xian/fx/weather'
const FILES = ['sky_storm.jpg', 'sky_dawn.jpg']

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
  await exec(conn, 'mkdir -p ' + REMOTE_DIR)
  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => (err ? reject(err) : resolve(s)))
  })
  for (let i = 0; i < FILES.length; i++) {
    const name = FILES[i]
    const local = path.join(LOCAL_DIR, name)
    if (!fs.existsSync(local)) throw new Error('missing ' + local)
    await fastPut(sftp, local, REMOTE_DIR + '/' + name)
    console.log('ok', name, fs.statSync(local).size)
  }
  console.log(await exec(conn, 'ls -la ' + REMOTE_DIR))
  conn.end()
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
