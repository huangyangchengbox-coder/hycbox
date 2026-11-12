const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { HOST, USER, PASSWORD } = require('./ssh-env')
const local = path.resolve('..', '..', 'hycBox', 'game-assets', 'xian', 'fx', 'void_tear.png')
const remoteDir = '/opt/hycbox/uploads/game/xian/fx'
const remote = remoteDir + '/void_tear.png'
const conn = new Client()
conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
conn.on('ready', () => {
  conn.exec('mkdir -p ' + remoteDir, (e, stream) => {
    stream.on('close', () => {
      conn.sftp((err, sftp) => {
        if (err) { console.error(err); process.exit(1) }
        sftp.fastPut(local, remote, (e2) => {
          if (e2) { console.error(e2); process.exit(1) }
          console.log('ok', fs.statSync(local).size, remote)
          conn.end()
        })
      })
    })
  })
}).on('error', e => { console.error(e); process.exit(1) })
  .connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
