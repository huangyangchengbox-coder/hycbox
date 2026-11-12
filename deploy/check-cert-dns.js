const { Client } = require('ssh2')
const { PASSWORD: PASS } = require('./ssh-env')
const conn = new Client()

conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASS)))
conn.on('ready', () => {
  const cmd = [
    'echo CERT_INFO',
    'openssl x509 -in /etc/nginx/ssl/hychyr.top/hychyr.top.pem -noout -subject -issuer -dates 2>&1',
    'echo DNS',
    'dig +short hychyr.top @8.8.8.8 || true',
    'dig +short hychyr.top @223.5.5.5 || true',
    'echo CURL_PUBLIC',
    'curl -s -m 8 https://hychyr.top/api/health || echo CURL_FAIL',
    'echo IP_HTTPS',
    'curl -sk -m 5 --resolve hychyr.top:443:127.0.0.1 https://hychyr.top/api/health; echo'
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
