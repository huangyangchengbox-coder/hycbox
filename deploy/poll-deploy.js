const { Client } = require('ssh2')
const { PASSWORD: PASSWORD } = require('./ssh-env')
function exec(conn, cmd) {
  return new Promise((resolve) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return resolve()
      stream.on('close', () => resolve())
        .on('data', (d) => process.stdout.write(d))
        .stderr.on('data', (d) => process.stderr.write(d))
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
  await exec(conn, [
    'sqlite3 /opt/gitea/data/gitea.db "SELECT id,status,title FROM action_run ORDER BY id DESC LIMIT 3;"',
    'LATEST=$(ls -1d /opt/gitea/data/actions_log/hyc/hycBoxServer/*/ 2>/dev/null | sort | tail -1)',
    'echo LATEST=$LATEST',
    'tail -n 60 "$LATEST"/*.log 2>/dev/null || true',
    'echo ===',
    'docker ps -a --filter name=hycbox --format "table {{.Names}}\\t{{.Status}}\\t{{.Image}}" 2>/dev/null || true',
    'systemctl is-active hycbox 2>/dev/null || echo hycbox-systemd-off',
    'curl -s http://127.0.0.1:8080/api/health; echo',
    "ps aux | grep -E 'mvn |docker build' | grep -v grep || echo idle"
  ].join('\n'))
  conn.end()
}
main()
