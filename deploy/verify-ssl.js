const { Client } = require('ssh2')
const { PASSWORD: PASSWORD } = require('./ssh-env')
function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
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
    'sleep 5',
    'curl -sk https://127.0.0.1/api/health',
    'echo',
    'curl -s http://127.0.0.1/api/health',
    'echo',
    'openssl x509 -in /etc/nginx/ssl/hychyr.top/hychyr.top.pem -noout -subject -issuer -dates',
    'echo ---',
    'grep -c BEGIN /etc/nginx/ssl/hychyr.top/hychyr.top.pem',
    'openssl s_client -connect 127.0.0.1:443 -servername hychyr.top </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer'
  ].join('; '))
  conn.end()
}
main().catch(e=>{console.error(e.message);process.exit(1)})
