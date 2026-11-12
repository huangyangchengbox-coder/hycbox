const { Client } = require('ssh2')
const { HOST, USER, PASSWORD } = require('./ssh-env')

const conn = new Client()
conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
conn.on('ready', () => {
  const sql = [
    "SHOW TABLES FROM hycbox LIKE 'xian%';",
    'SELECT COUNT(*) AS c FROM hycbox.xian_progress;',
    'SELECT user_id, realm_lv, kills, updated_at FROM hycbox.xian_progress LIMIT 10;',
    "SHOW TABLES FROM hycbox_trial LIKE 'xian%';",
    'SELECT COUNT(*) AS c FROM hycbox_trial.xian_progress;',
    'SELECT user_id, realm_lv, kills, updated_at FROM hycbox_trial.xian_progress LIMIT 10;'
  ].join(' ')
  const cmd = "mysql -uhycbox -p'******' -e \"" + sql.replace(/"/g, '\\"') + "\""
  conn.exec(cmd, (e, s) => {
    let o = ''
    if (e) {
      console.error(e)
      conn.end()
      return
    }
    s.on('data', (d) => { o += d })
    s.stderr.on('data', (d) => { o += d })
    s.on('close', () => {
      console.log(o)
      conn.end()
    })
  })
}).connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
