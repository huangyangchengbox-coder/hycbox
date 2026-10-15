/**
 * 一次性：把无尽仙途备份打成「道途」模块命名与存档隔离
 * node miniprogram/scripts/setup-daotu.js
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

function patch(file, fn) {
  const p = path.join(root, file)
  let s = fs.readFileSync(p, 'utf8')
  s = fn(s)
  fs.writeFileSync(p, s)
  console.log('ok', file)
}

patch('data/daoChapterPlay.js', (s) => {
  s = s.replace("require('./xianChapters')", "require('./daoChapters')")
  s = s.replace(/仙途/g, '道途')
  s = s.replace('「一章一局」运行时辅助', '道途（无尽修仙）运行时辅助')
  return s
})

patch('data/daoStory.js', (s) => {
  s = s.replace(/仙途/g, '道途')
  s = s.replace(/xianChapters/g, 'daoChapters')
  s = s.replace(/xianChapterPlay/g, 'daoChapterPlay')
  return s
})

patch('data/daoChapters.js', (s) => {
  return s.replace('仙途章节表', '道途章节表（源自仙途无尽版备份）')
})

patch('pages/hyc/tools/daotu/daotu.js', (s) => {
  s = s.replace(
    "require('../../../../data/xianChapterPlay')",
    "require('../../../../data/daoChapterPlay')"
  )
  s = s.replace(/const xianChapterPlay/g, 'const daoChapterPlay')
  s = s.replace(/xianChapterPlay\./g, 'daoChapterPlay.')
  s = s.replace(
    "const XIAN_PROGRESS_LOCAL_KEY = 'hyc_xian_progress'",
    "const DAO_PROGRESS_LOCAL_KEY = 'hyc_dao_progress'"
  )
  s = s.replace(
    "const XIAN_CHAPTER_LOCAL_KEY = 'hyc_xian_chapters'",
    "const DAO_CHAPTER_LOCAL_KEY = 'hyc_dao_chapters'"
  )
  s = s.replace(/XIAN_PROGRESS_LOCAL_KEY/g, 'DAO_PROGRESS_LOCAL_KEY')
  s = s.replace(/XIAN_CHAPTER_LOCAL_KEY/g, 'DAO_CHAPTER_LOCAL_KEY')
  // 不写仙途云端进度，避免互踩
  s = s.replace(/api\.saveXianProgress\(payload\)/g, 'Promise.resolve({ code: 0 })')
  s = s.replace(/api\.clearXianProgress\(userId\)/g, 'Promise.resolve({ code: 0 })')
  s = s.replace(/api\.getXianProgress\(userId\)/g, 'Promise.resolve({ code: 0, data: null })')
  s = s.replace('* 仙途：', '* 道途：')
  s = s.replace(/仙途/g, '道途')
  return s
})

patch('pages/hyc/tools/daotu/daotu.wxml', (s) => s.replace(/仙途/g, '道途'))
patch('pages/hyc/tools/daotu/daotu.json', (s) => s.replace('仙途', '道途'))

console.log('daotu setup done')
