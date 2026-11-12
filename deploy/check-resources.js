const { Client } = require('ssh2')
const { PASSWORD, HOST, USER } = require('./ssh-env')

const cmd = `
echo '=== HOST ==='
hostname; uptime; date
echo
echo '=== MEM ==='
free -h
echo
echo '=== DISK ==='
df -h / /opt /var 2>/dev/null | head -20
echo
echo '=== TOP MEM ==='
ps aux --sort=-%mem | head -12
echo
echo '=== TOP CPU ==='
ps aux --sort=-%cpu | head -10
echo
echo '=== SERVICES ==='
systemctl is-active hycbox nginx mariadb mysqld docker 2>/dev/null
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Size}}' 2>/dev/null | head -15
echo
echo '=== JAVA ==='
ps -eo pid,rss,vsz,%mem,%cpu,cmd | grep -E '[j]ava|[h]yc' || true
echo
echo '=== CPU CORES / LOAD ==='
nproc; cat /proc/loadavg
echo
echo '=== MYSQL QUICK ==='
mysqladmin status 2>/dev/null || true
echo
echo '=== SWAP ==='
swapon --show 2>/dev/null; free -m | awk '/Swap/'
`

const c = new Client()
c.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
c.on('ready', () => {
  c.exec(cmd, (err, stream) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    stream.on('data', (d) => process.stdout.write(d))
    stream.stderr.on('data', (d) => process.stderr.write(d))
    stream.on('close', () => c.end())
  })
})
c.on('error', (e) => {
  console.error(e.message)
  process.exit(1)
})
c.connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
