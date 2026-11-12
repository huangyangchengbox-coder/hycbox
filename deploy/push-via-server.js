const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const { PASSWORD: PASSWORD } = require('./ssh-env')
const TOKEN = fs.readFileSync(path.join(__dirname, 'gitea-token.local'), 'utf8').trim()

function sh(cmd, cwd) {
  console.log('>', cmd)
  execSync(cmd, { cwd, stdio: 'inherit', shell: true })
}

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => code === 0 ? resolve(out) : reject(new Error(out || 'exit ' + code)))
        .on('data', (d) => { out += d.toString(); process.stdout.write(d) })
        .stderr.on('data', (d) => process.stderr.write(d))
    })
  })
}

function upload(conn, local, remote) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err)
      sftp.fastPut(local, remote, (e) => e ? reject(e) : resolve())
    })
  })
}

async function main() {
  const serverDir = path.join(__dirname, '..')
  const boxDir = 'D:\\AI\\hycBox'
  const serverBundle = path.join(__dirname, 'hycBoxServer.bundle')
  const boxBundle = path.join(__dirname, 'hycBox.bundle')

  sh('git bundle create deploy/hycBoxServer.bundle --all', serverDir)
  sh('git bundle create D:/AI/hycBoxServer/deploy/hycBox.bundle --all', boxDir)

  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host: 'hychyr.top', username: 'root', password: PASSWORD, tryKeyboard: true })
  })

  await exec(conn, 'mkdir -p /tmp/gitpush')
  await upload(conn, serverBundle, '/tmp/gitpush/hycBoxServer.bundle')
  await upload(conn, boxBundle, '/tmp/gitpush/hycBox.bundle')

  const script = [
    'set -e',
    'cd /tmp/gitpush',
    'rm -rf hycBoxServer hycBox',
    'git clone hycBoxServer.bundle hycBoxServer',
    'git clone hycBox.bundle hycBox',
    'cd /tmp/gitpush/hycBoxServer',
    'git checkout main || git checkout -b main',
    'git remote remove origin 2>/dev/null || true',
    `git remote add origin http://hyc:${TOKEN}@127.0.0.1:3000/hyc/hycBoxServer.git`,
    'git push -u origin main --force',
    'cd /tmp/gitpush/hycBox',
    'git checkout main || git checkout -b main',
    'git remote remove origin 2>/dev/null || true',
    `git remote add origin http://hyc:${TOKEN}@127.0.0.1:3000/hyc/hycBox.git`,
    'git push -u origin main --force',
    'echo PUSH_OK',
    'echo dummy > /tmp/t.jpg',
    'curl -s -F file=@/tmp/t.jpg http://127.0.0.1:8080/api/upload',
    'echo',
    'ls /opt/hycbox/uploads | tail -3'
  ].join('\n')

  await exec(conn, script)
  conn.end()
  console.log('\nAll done')
}

main().catch((e) => { console.error(e.message); process.exit(1) })
