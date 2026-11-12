const { Client } = require('ssh2')
const { PASSWORD: PASS } = require('./ssh-env')
const conn = new Client()

conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASS)))
conn.on('ready', () => {
  const cmd = [
    'grep -E "ROOT_URL|DOMAIN|SSH_" /opt/gitea/custom/conf/app.ini',
    'curl -sI http://127.0.0.1:3000/user/settings/keys | head -20',
    'curl -sI http://127.0.0.1/git/user/settings/keys -H "Host: hychyr.top" | head -20',
    'curl -s http://127.0.0.1/git/user/login -H "Host: hychyr.top" | head -5'
  ].join('\n')
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error(err)
      conn.end()
      return
    }
    stream.on('data', (d) => process.stdout.write(d))
    stream.stderr.on('data', (d) => process.stderr.write(d))
    stream.on('close', () => conn.end())
  })
})
conn.on('error', (e) => {
  console.error(e.message)
  process.exit(1)
})
conn.connect({ host: 'hychyr.top', username: 'root', password: PASS, tryKeyboard: true })
