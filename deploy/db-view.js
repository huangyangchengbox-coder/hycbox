const { Client } = require('ssh2')
const { PASSWORD: PASSWORD } = require('./ssh-env')

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      stream.on('close', () => resolve())
        .on('data', (d) => process.stdout.write(d))
        .stderr.on('data', (d) => process.stderr.write(d))
    })
  })
}

function upload(conn, content, remote) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err)
      const ws = sftp.createWriteStream(remote)
      ws.on('close', resolve)
      ws.on('error', reject)
      ws.end(content)
    })
  })
}

async function main() {
  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host: 'hychyr.top', username: 'root', password: PASSWORD, tryKeyboard: true })
  })

  const sql = `SHOW TABLES;
SELECT id, username, display_name, status, created_at FROM admin_user;
SELECT id, title, total_bags, remain_bags, admin_id, admin_name, status, created_at FROM publication ORDER BY created_at DESC LIMIT 15;
SELECT id, publication_id, user_name, room_label, quantity, status, created_at, delivered_at FROM fruit_order ORDER BY created_at DESC LIMIT 15;
`
  await upload(conn, sql, '/tmp/h2q/query.sql')
  await exec(conn, [
    'cd /tmp/h2q',
    'java -cp h2.jar org.h2.tools.Shell -url "jdbc:h2:file:/opt/hycbox/data/hycbox;AUTO_SERVER=TRUE;IFEXISTS=TRUE" -user sa -password "" < /tmp/h2q/query.sql'
  ].join(' && '))
  conn.end()
}

main().catch((e) => { console.error(e.message); process.exit(1) })
