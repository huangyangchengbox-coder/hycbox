/**
 * 微信小程序代码上传（miniprogram-ci）
 *
 * 准备：
 * 1. npm i -D miniprogram-ci
 * 2. 公众平台下载「代码上传密钥」→ 本地保存，勿提交 git
 * 3. copy deploy/upload-weixin.example.env → deploy/upload-weixin.env 并填写路径
 *
 * 用法：
 *   node deploy/upload-weixin.js
 *   node deploy/upload-weixin.js --version=1.2.0 --desc=仙途更新
 *
 * 环境变量也可直接覆盖：WEIXIN_PRIVATE_KEY_PATH / WEIXIN_APPID / WEIXIN_VERSION / WEIXIN_DESC / WEIXIN_ROBOT
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const ENV_FILE = path.join(__dirname, 'upload-weixin.env')

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return
  const text = fs.readFileSync(file, 'utf8')
  text.split(/\r?\n/).forEach((line) => {
    const s = line.trim()
    if (!s || s.startsWith('#')) return
    const i = s.indexOf('=')
    if (i < 0) return
    const k = s.slice(0, i).trim()
    let v = s.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  })
}

function arg(name) {
  const prefix = '--' + name + '='
  const hit = process.argv.find((a) => a.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : ''
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
}

function defaultVersion() {
  try {
    return String(readJson('package.json').version || '').trim() || ''
  } catch (e) {
    return ''
  }
}

function stampVersion() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return (
    d.getFullYear() +
    '.' +
    p(d.getMonth() + 1) +
    '.' +
    p(d.getDate()) +
    '.' +
    p(d.getHours()) +
    p(d.getMinutes())
  )
}

async function main() {
  loadEnvFile(ENV_FILE)

  let ci
  try {
    ci = require('miniprogram-ci')
  } catch (e) {
    console.error('未安装 miniprogram-ci，请先执行：npm i -D miniprogram-ci')
    process.exit(1)
  }

  const projectConfig = readJson('project.config.json')
  const appid = process.env.WEIXIN_APPID || projectConfig.appid
  const privateKeyPath = process.env.WEIXIN_PRIVATE_KEY_PATH || ''
  const version = arg('version') || process.env.WEIXIN_VERSION || defaultVersion() || stampVersion()
  const desc =
    arg('desc') ||
    process.env.WEIXIN_DESC ||
    'hycBox upload ' + version
  const robot = Number(process.env.WEIXIN_ROBOT || arg('robot') || 1)

  if (!appid) {
    console.error('缺少 appid（project.config.json 或 WEIXIN_APPID）')
    process.exit(1)
  }
  if (!privateKeyPath || !fs.existsSync(privateKeyPath)) {
    console.error('缺少上传私钥。请：')
    console.error('  1) 公众平台下载代码上传密钥')
    console.error('  2) 复制 deploy/upload-weixin.example.env 为 upload-weixin.env')
    console.error('  3) 设置 WEIXIN_PRIVATE_KEY_PATH=私钥绝对路径')
    process.exit(1)
  }

  console.log('上传配置', {
    appid,
    projectPath: ROOT,
    version,
    desc,
    robot,
    privateKeyPath
  })

  const project = new ci.Project({
    appid,
    type: 'miniProgram',
    projectPath: ROOT,
    privateKeyPath,
    ignores: ['node_modules/**/*', 'docs/**/*', 'game-assets/**/*', 'deploy/**/*', '**/*.md']
  })

  const result = await ci.upload({
    project,
    version,
    desc,
    robot,
    setting: {
      es6: true,
      es7: true,
      minify: true,
      minifyJS: true,
      minifyWXML: true,
      minifyWXSS: true,
      autoPrefixWXSS: true
    },
    onProgressUpdate: console.log
  })

  console.log('上传成功', result)
  console.log('请到微信公众平台 → 版本管理 设为体验版或提交审核')
}

main().catch((err) => {
  console.error('上传失败', err && err.message ? err.message : err)
  process.exit(1)
})
