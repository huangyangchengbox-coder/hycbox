const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')

const { PASSWORD: PASSWORD } = require('./ssh-env')
const NGINX_CONF = fs.readFileSync(path.join(__dirname, 'nginx-hychyr.top.conf'), 'utf8')

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => {
        if (code !== 0) reject(new Error(`exit ${code}: ${out}`))
        else resolve(out)
      }).on('data', (d) => { out += d.toString(); process.stdout.write(d) })
        .stderr.on('data', (d) => process.stderr.write(d))
    })
  })
}

function uploadContent(conn, content, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err)
      const ws = sftp.createWriteStream(remotePath)
      ws.on('close', resolve)
      ws.on('error', reject)
      ws.end(content)
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

  console.log('SSH connected, setting up nginx...\n')

  await exec(conn, [
    'yum install -y nginx 2>/dev/null || (apt-get update && apt-get install -y nginx)',
    'mkdir -p /etc/nginx/ssl/hychyr.top',
    'iptables -I INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || true',
    'iptables -I INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || true'
  ].join(' && '))

  await uploadContent(conn, NGINX_CONF, '/etc/nginx/conf.d/hychyr.top.conf')

  // 若证书尚未上传，先生成自签证书让 nginx 能启动，后续替换为阿里云证书
  await exec(conn, `if [ ! -f /etc/nginx/ssl/hychyr.top/hychyr.top.pem ]; then
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
    -keyout /etc/nginx/ssl/hychyr.top/hychyr.top.key \\
    -out /etc/nginx/ssl/hychyr.top/hychyr.top.pem \\
    -subj "/CN=hychyr.top"
  echo "Created temporary self-signed cert"
fi`)

  await exec(conn, [
    'nginx -t',
    'systemctl enable nginx',
    'systemctl restart nginx',
    'systemctl status nginx --no-pager | head -15',
    'curl -s -o /dev/null -w "local80:%{http_code}\\n" http://127.0.0.1/api/health || true'
  ].join(' && '))

  conn.end()
  console.log('\nNginx setup done.')
  console.log('After SSL cert issued, upload pem/key to /etc/nginx/ssl/hychyr.top/ and run: systemctl reload nginx')
}

main().catch((e) => { console.error('Failed:', e.message); process.exit(1) })
