/**
 * 上传元婴帮手图到 /uploads/game/xian/helper/（含 fox 子目录）
 * 用法：set HYC_SSH_PASSWORD=xxx && node deploy/upload-helper-assets.js
 */
const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { HOST, USER, PASSWORD } = require('./ssh-env')

const LOCAL_DIR = path.resolve(__dirname, '..', '..', 'hycBox', 'game-assets', 'xian', 'helper')
const REMOTE_DIR = '/opt/hycbox/uploads/game/xian/helper'

function walk(dir, rel = '') {
  const out = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('_')) continue
    const local = path.join(dir, ent.name)
    const name = rel ? `${rel}/${ent.name}` : ent.name
    if (ent.isDirectory()) out.push(...walk(local, name))
    else if (/\.png$/i.test(ent.name)) out.push({ local, name })
  }
  return out
}

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
  const files = walk(LOCAL_DIR)
  if (!files.length) throw new Error('no helper png in ' + LOCAL_DIR)
  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve)
    conn.on('error', reject)
    conn.connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
  })
  console.log('SSH OK', files.length)
  await exec(conn, 'mkdir -p ' + REMOTE_DIR + '/fox')
  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => (err ? reject(err) : resolve(s)))
  })
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const remote = REMOTE_DIR + '/' + f.name.replace(/\\/g, '/')
    await fastPut(sftp, f.local, remote)
    console.log(`[${i + 1}/${files.length}] ${f.name}`)
  }
  console.log(await exec(conn, 'find ' + REMOTE_DIR + ' -type f | wc -l'))
  conn.end()
  console.log('完成 → https://hychyr.top/uploads/game/xian/helper/fox/')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
