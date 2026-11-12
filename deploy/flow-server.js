const { Client } = require('ssh2')
const { PASSWORD: PASSWORD } = require('./ssh-env')
function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      stream.on('close', (code) => code===0?resolve():reject(new Error('exit '+code)))
        .on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d))
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
  await exec(conn, `BASE=http://127.0.0.1:8080/api
PUB=$(curl -s -X POST $BASE/publications -H 'Content-Type: application/json' -d '{"title":"server-test","imageUrl":"","totalBags":20}')
echo "$PUB"
PID=$(echo "$PUB" | sed -n 's/.*"id":"\\([^"]*\\)".*/\\1/p')
curl -s -X POST $BASE/orders -H 'Content-Type: application/json' -d "{\\"publicationId\\":\\"$PID\\",\\"userId\\":\\"u1\\",\\"userName\\":\\"test\\",\\"roomId\\":\\"phase1_2_1_1501\\",\\"quantity\\":2}"
echo
curl -s "$BASE/admin/stats?publicationId=$PID"
echo
curl -s "$BASE/admin/orders/group-by-building?publicationId=$PID"
echo
OID=$(curl -s "$BASE/orders?publicationId=$PID&status=pending" | sed -n 's/.*"id":"\\([^"]*\\)".*/\\1/p')
curl -s -X PUT "$BASE/orders/$OID/complete"
echo
curl -s "$BASE/admin/stats?publicationId=$PID"
echo`)
  conn.end()
}
main().catch(e=>{console.error(e.message);process.exit(1)})
