const { Client } = require('ssh2')
const { PASSWORD: PASSWORD } = require('./ssh-env')
function exec(conn, cmd) {
  return new Promise((resolve) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return resolve()
      stream.on('close', () => resolve())
        .on('data', d => process.stdout.write(d))
        .stderr.on('data', d => process.stderr.write(d))
    })
  })
}
async function main() {
  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n,i,l,p,f)=>f(p.map(()=>PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host:'hychyr.top', username:'root', password:PASSWORD, tryKeyboard:true })
  })
  await exec(conn, [
    'systemctl is-active nginx hycbox gitea',
    'curl -sk -o /dev/null -w "api:%{http_code}\\n" https://127.0.0.1/api/health',
    'curl -sk -o /dev/null -w "git:%{http_code}\\n" https://127.0.0.1/git/',
    'curl -sk -o /dev/null -w "upload:%{http_code}\\n" https://127.0.0.1/uploads/3ec0d45f43524743a775dff4abe359c9.jpg',
    'curl -s -o /dev/null -w "api80:%{http_code}\\n" http://127.0.0.1/api/health',
    'ss -lntp | grep -E "80|443|3000|8080"'
  ].join('; '))
  conn.end()
}
main()
