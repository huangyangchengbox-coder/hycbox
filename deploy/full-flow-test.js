const { Client } = require('ssh2')
const { PASSWORD: PASSWORD } = require('./ssh-env')

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
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

  const flow = `
set -e
BASE=http://127.0.0.1:8080/api
echo '1) health'
curl -s $BASE/health
echo
echo '2) create publication'
PUB=$(curl -s -X POST $BASE/publications -H 'Content-Type: application/json' -d '{"title":"部署测试苹果","imageUrl":"","totalBags":10}')
echo $PUB
PUB_ID=$(echo $PUB | sed -n 's/.*"id":"\\([^"]*\\)".*/\\1/p')
echo pub_id=$PUB_ID
echo '3) search room'
ROOM=$(curl -s "$BASE/community/rooms/search?keyword=2%E5%8F%B7%E6%A5%BC%201501")
echo $ROOM | head -c 400
echo
ROOM_ID=$(echo $ROOM | sed -n 's/.*"id":"\\([^"]*\\)".*/\\1/p')
echo room_id=$ROOM_ID
echo '4) create order'
curl -s -X POST $BASE/orders -H 'Content-Type: application/json' -d "{\\"publicationId\\":\\"$PUB_ID\\",\\"userId\\":\\"user_test\\",\\"userName\\":\\"测试用户\\",\\"roomId\\":\\"$ROOM_ID\\",\\"quantity\\":2}"
echo
echo '5) admin stats'
curl -s "$BASE/admin/stats?publicationId=$PUB_ID"
echo
echo '6) group by building'
curl -s "$BASE/admin/orders/group-by-building?publicationId=$PUB_ID" | head -c 500
echo
ORD_ID=$(curl -s "$BASE/orders?publicationId=$PUB_ID&status=pending" | sed -n 's/.*"id":"\\([^"]*\\)".*/\\1/p')
echo order_id=$ORD_ID
echo '7) complete order'
curl -s -X PUT "$BASE/orders/$ORD_ID/complete"
echo
echo '8) stats after complete'
curl -s "$BASE/admin/stats?publicationId=$PUB_ID"
echo
`
  await exec(conn, flow)
  conn.end()
  console.log('\nFull flow test done on server')
}

main().catch(e => { console.error(e.message); process.exit(1) })
