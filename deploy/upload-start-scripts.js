/**
 * 上传 start.sh / stop.sh 到 /opt/hycbox 并赋权
 * 用法：set HYC_SSH_PASSWORD=xxx && node deploy/upload-start-scripts.js
 */
const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { HOST, USER, PASSWORD } = require('./ssh-env')

const REMOTE_DIR = '/opt/hycbox'
const FILES = ['start.sh', 'stop.sh']

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => {
        if (code === 0) resolve(out)
        else reject(new Error(out.slice(-800) || `exit ${code}`))
      }).on('data', (d) => { out += d; process.stdout.write(d) })
        .stderr.on('data', (d) => { out += d; process.stderr.write(d) })
    })
  })
}

function upload(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err)
      const rs = fs.createReadStream(localPath)
      const ws = sftp.createWriteStream(remotePath)
      ws.on('close', resolve)
      ws.on('error', reject)
      rs.pipe(ws)
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
  await exec(conn, `mkdir -p ${REMOTE_DIR}`)
  for (const name of FILES) {
    const local = path.join(__dirname, name)
    const remote = `${REMOTE_DIR}/${name}`
    await upload(conn, local, remote)
    console.log('uploaded', remote)
  }
  await exec(conn, `chmod +x ${REMOTE_DIR}/start.sh ${REMOTE_DIR}/stop.sh && ls -la ${REMOTE_DIR}/start.sh ${REMOTE_DIR}/stop.sh`)
  conn.end()
  console.log('OK')
}

main().catch((e) => {
  console.error('失败:', e.message)
  process.exit(1)
})
