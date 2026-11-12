/**
 * 检查服务器 JDK/Maven、Gitea Actions、act_runner 状态
 * 用法：node deploy/check-actions.js
 */
const { Client } = require('ssh2')

const { PASSWORD: PASSWORD } = require('./ssh-env')

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', () => resolve(out))
        .on('data', (d) => { out += d.toString(); process.stdout.write(d) })
        .stderr.on('data', (d) => { out += d.toString(); process.stderr.write(d) })
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
    'echo === java ===',
    'java -version 2>&1 || true',
    'echo === mvn ===',
    'mvn -v 2>&1 | head -5 || echo NO_MVN',
    'echo === docker ===',
    'docker -v 2>&1 || echo NO_DOCKER',
    'echo === gitea actions ini ===',
    'grep -nE "ACTIONS|ENABLED" /opt/gitea/custom/conf/app.ini || echo NO_ACTIONS_SECTION',
    'echo === runner ===',
    'ls -la /opt/act_runner 2>/dev/null || echo NO_ACT_RUNNER_DIR',
    'systemctl is-active act_runner 2>/dev/null || echo act_runner_inactive',
    'echo === gitea ===',
    'systemctl is-active gitea'
  ].join('\n'))

  conn.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
