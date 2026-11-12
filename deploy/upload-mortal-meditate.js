/**
 * 上传凡人打坐立绘
 * 用法：set HYC_SSH_PASSWORD=xxx && node deploy/upload-mortal-meditate.js
 */
const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { HOST, USER, PASSWORD } = require('./ssh-env')

const LOCAL = path.resolve(__dirname, '..', '..', 'hycBox', 'game-assets', 'xian', 'heroes', 'mortal')
const REMOTE = '/opt/hycbox/uploads/game/xian/heroes/mortal'

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
  const files = fs.readdirSync(LOCAL).filter((f) => f.endsWith('.png'))
  if (!files.length) throw new Error('no png in ' + LOCAL)
  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve)
    conn.on('error', reject)
    conn.connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
  })
  console.log('SSH OK')
  await exec(conn, 'mkdir -p ' + REMOTE)
  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => (err ? reject(err) : resolve(s)))
  })
  for (let i = 0; i < files.length; i++) {
    const name = files[i]
    await fastPut(sftp, path.join(LOCAL, name), REMOTE + '/' + name)
    console.log('ok', name, fs.statSync(path.join(LOCAL, name)).size)
  }
  console.log(await exec(conn, 'ls -la ' + REMOTE))
  conn.end()
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
