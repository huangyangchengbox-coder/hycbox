const { Client } = require('ssh2')
const { PASSWORD: PASSWORD } = require('./ssh-env')
function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      stream.on('close', () => resolve()).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d))
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
  await exec(conn, 'journalctl -u hycbox -n 50 --no-pager')
  conn.end()
}
main().catch(e=>{console.error(e.message);process.exit(1)})
