/**
 * 在服务器安装并初始化 MySQL（MariaDB），供 hycbox 使用。
 * 用法：node deploy/setup-mysql.js
 */
const { Client } = require('ssh2')

const HOST = 'hychyr.top'
const USER = 'root'
const { PASSWORD, requireEnv } = require('./ssh-env')
const DB_NAME = 'hycbox'
const DB_USER = 'hycbox'
const DB_PASS = requireEnv('HYCBOX_DB_PASSWORD')

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) {
        reject(err)
        return
      }
      let stdout = ''
      let stderr = ''
      stream.on('close', (code) => {
        if (code === 0) resolve(stdout)
        else reject(new Error(stderr || stdout || `exit ${code}`))
      }).on('data', (d) => {
        stdout += d.toString()
        process.stdout.write(d)
      }).stderr.on('data', (d) => {
        stderr += d.toString()
        process.stderr.write(d)
      })
    })
  })
}

async function main() {
  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve).on('error', reject).connect({
      host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000
    })
  })
  console.log('SSH OK, setup MySQL...\n')

  const script = `
set -e
if ! command -v mysql >/dev/null 2>&1; then
  if command -v yum >/dev/null 2>&1; then
    yum install -y mariadb-server mariadb
  elif command -v apt-get >/dev/null 2>&1; then
    apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y mariadb-server
  fi
fi
systemctl enable mariadb 2>/dev/null || systemctl enable mysqld 2>/dev/null || true
systemctl start mariadb 2>/dev/null || systemctl start mysqld 2>/dev/null || true
sleep 2
mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';" 2>/dev/null || true
mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost'; FLUSH PRIVILEGES;"
mysql -e "SHOW DATABASES LIKE '${DB_NAME}';"
echo MYSQL_READY
`
  await exec(conn, script)
  conn.end()
  console.log('\nMySQL ready')
}

main().catch((e) => {
  console.error('setup-mysql failed:', e.message)
  process.exit(1)
})
