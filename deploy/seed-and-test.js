const { Client } = require('ssh2')

const { PASSWORD: PASSWORD } = require('./ssh-env')

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      stream.on('close', (code) => code === 0 ? resolve() : reject(new Error(`exit ${code}`)))
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

  const tests = [
    'curl -s http://127.0.0.1:8080/api/community/info',
    'curl -s -X POST http://127.0.0.1:8080/api/publications -H "Content-Type: application/json" -d \'{"title":"新鲜苹果","imageUrl":"","totalBags":30}\'',
    'curl -s http://127.0.0.1:8080/api/publications',
    'curl -s "http://127.0.0.1:8080/api/community/rooms/search?keyword=2%E5%8F%B7%E6%A5%BC%201501" | head -c 300'
  ].join(' && echo "\n---\n" && ')

  await exec(conn, tests)
  conn.end()
}

main().catch((e) => { console.error(e.message); process.exit(1) })
