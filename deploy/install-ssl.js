const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')

const { PASSWORD: PASSWORD } = require('./ssh-env')

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      stream.on('close', (code) => code === 0 ? resolve() : reject(new Error('exit ' + code)))
        .on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d))
    })
  })
}

function upload(conn, local, remote) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err)
      sftp.fastPut(local, remote, err2 => err2 ? reject(err2) : resolve())
    })
  })
}

async function main() {
  const pem = process.argv[2]
  const key = process.argv[3]
  if (!pem || !key) {
    console.log('Usage: node install-ssl.js <cert.pem> <cert.key>')
    process.exit(1)
  }
  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n,i,l,p,f)=>f(p.map(()=>PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host:'hychyr.top', username:'root', password:PASSWORD, tryKeyboard:true })
  })
  await exec(conn, 'mkdir -p /etc/nginx/ssl/hychyr.top')
  await upload(conn, pem, '/etc/nginx/ssl/hychyr.top/hychyr.top.pem')
  await upload(conn, key, '/etc/nginx/ssl/hychyr.top/hychyr.top.key')
  await exec(conn, 'nginx -t && systemctl reload nginx && echo SSL installed OK')
  conn.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
