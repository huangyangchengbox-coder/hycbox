const { Client } = require('ssh2')
const { PASSWORD: PASS } = require('./ssh-env')
const conn = new Client()

conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASS)))
conn.on('ready', () => {
  const cmd = [
    'systemctl is-active nginx hycbox',
    'curl -s -m 5 http://127.0.0.1:8080/api/health; echo',
    'curl -sk -m 5 -H "Host: hychyr.top" https://127.0.0.1/api/health; echo',
    'curl -s -m 5 -H "Host: hychyr.top" http://127.0.0.1/api/health; echo',
    'ls -la /etc/nginx/ssl/hychyr.top/ 2>/dev/null || echo NO_SSL_DIR',
    'ls /etc/nginx/conf.d/ 2>/dev/null; ls /etc/nginx/sites-enabled/ 2>/dev/null',
    'grep -n "server_name\\|listen " /etc/nginx/conf.d/*.conf /etc/nginx/sites-enabled/* 2>/dev/null | head -30',
    'getent hosts hychyr.top || true',
    'ss -lntp | grep -E ":80|:443|:8080" || netstat -lntp | grep -E ":80|:443|:8080"'
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
