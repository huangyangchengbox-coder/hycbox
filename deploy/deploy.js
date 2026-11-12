const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')

const HOST = 'hychyr.top'
const USER = 'root'
const { PASSWORD: PASSWORD } = require('./ssh-env')
const REMOTE_DIR = '/opt/hycbox'
const JAR_NAME = 'hyc-box-server-1.0.0.jar'
const LOCAL_JAR = path.join(__dirname, '..', 'target', JAR_NAME)

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) {
        reject(err)
        return
      }
      let stdout = ''
      let stderr = ''
      stream.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new Error(stderr || stdout || `exit ${code}`))
        }
      }).on('data', (data) => {
        stdout += data.toString()
        process.stdout.write(data)
      }).stderr.on('data', (data) => {
        stderr += data.toString()
        process.stderr.write(data)
      })
    })
  })
}

function upload(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) {
        reject(err)
        return
      }
      const readStream = fs.createReadStream(localPath)
      const writeStream = sftp.createWriteStream(remotePath)
      writeStream.on('close', resolve)
      writeStream.on('error', reject)
      readStream.pipe(writeStream)
    })
  })
}

async function main() {
  if (!fs.existsSync(LOCAL_JAR)) {
    throw new Error(`找不到 JAR: ${LOCAL_JAR}，请先 mvn package`)
  }

  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
      finish(prompts.map(() => PASSWORD))
    })
    conn.on('ready', resolve).on('error', reject).connect({
      host: HOST,
      port: 22,
      username: USER,
      password: PASSWORD,
      tryKeyboard: true,
      readyTimeout: 20000
    })
  })

  console.log('SSH 连接成功，开始部署...\n')

  const setupCmd = [
    'mkdir -p /opt/hycbox/data /opt/hycbox/uploads /opt/hycbox/logs',
    'if ! command -v java >/dev/null 2>&1; then',
    '  if command -v yum >/dev/null 2>&1; then yum install -y java-17-openjdk-headless; fi',
    '  if command -v apt-get >/dev/null 2>&1; then apt-get update && apt-get install -y openjdk-17-jre-headless; fi',
    'fi',
    'java -version || true'
  ].join('\n')

  await exec(conn, setupCmd)
  console.log('\n上传 JAR...')
  await upload(conn, LOCAL_JAR, `${REMOTE_DIR}/${JAR_NAME}`)

  const serviceContent = `[Unit]
Description=HycBox Fruit Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${REMOTE_DIR}
ExecStart=/usr/bin/java -Dfile.encoding=UTF-8 -jar ${REMOTE_DIR}/${JAR_NAME}
Restart=always
RestartSec=5
SuccessExitStatus=143
Environment=LOG_PATH=${REMOTE_DIR}/logs
EnvironmentFile=-${REMOTE_DIR}/server.env

[Install]
WantedBy=multi-user.target
`

  await exec(conn, `cat > /etc/systemd/system/hycbox.service << 'EOF'\n${serviceContent}EOF`)
  await exec(conn, [
    'systemctl daemon-reload',
    'systemctl enable hycbox',
    'systemctl restart hycbox',
    'sleep 3',
    'systemctl status hycbox --no-pager || true',
    'curl -s http://127.0.0.1:8080/api/health || true'
  ].join(' && '))

  conn.end()
  console.log('\n部署完成: https://hychyr.top/api/health')
}

main().catch((err) => {
  console.error('部署失败:', err.message)
  process.exit(1)
})
