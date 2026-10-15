/**
 * 仙途「一章一局」运行时辅助 —— 全章通用
 */

const {
  CHAPTERS,
  getChapter,
  getFirstChapter,
  getNextChapter,
  listChapters
} = require('./xianChapters')

const MODE_LABEL = {
  story: '剧情',
  cultivate: '打坐',
  trial: '试炼',
  combat: '斩妖',
  wave: '清剿',
  boss: '境主',
  scripted: '剧情战'
}

const SCENE_LABEL = {
  village: '山边小村',
  cliff: '炼骨崖',
  bottle: '神秘小瓶',
  meditate: '打坐悟道',
  spar: '门内风云',
  battle: '斩妖除魔',
  boss: '境主之劫',
  spirit: '灵光异象',
  ink: '仙途'
}

function modeLabel(mode) {
  return MODE_LABEL[mode] || '仙途'
}

function sceneLabel(scene) {
  return SCENE_LABEL[scene] || '仙途'
}

function sceneForChapter(chapter) {
  if (!chapter) return 'ink'
  if (chapter.scene) return chapter.scene
  const id = String(chapter.id || '')
  const title = String(chapter.title || '')
  const mode = chapter.mode || ''
  if (/瓶|绿液|催药|掌天/.test(title) || id === '1_d' || id === '2_a') return 'bottle'
  if (/村|青牛|离家|墨府/.test(title) || id === '1_a') return 'village'
  if (/崖|考核|炼骨|竹/.test(title) || mode === 'trial') return 'cliff'
  if (mode === 'cultivate' || chapter.major === 'mortal') return 'meditate'
  if (mode === 'boss' || mode === 'scripted') return 'boss'
  if (mode === 'story') return 'spirit'
  if (mode === 'wave') return 'spar'
  if (mode === 'combat') return 'battle'
  return 'ink'
}

function goalTip(chapter) {
  if (!chapter || !chapter.win) return '完成本章'
  const w = chapter.win
  if (w.type === 'story') return '读完本章文案即可入道'
  if (w.type === 'cultivate') return '盘膝打坐，攒满天地灵气'
  if (w.type === 'survive') {
    return w.stealth ? '潜行潜伏，坚持片刻' : '坚持片刻，活过本局'
  }
  if (w.type === 'boss') return '击败境主，了结此劫'
  if (w.type === 'kills') return '斩妖 ' + (w.count || 12) + ' 只'
  return '完成本章目标'
}

function progressTip(chapter, st) {
  if (!chapter || !chapter.win || !st) return ''
  const w = chapter.win
  if (w.type === 'cultivate') {
    const need = w.lingQi || 60
    return '灵气 ' + Math.floor(st.qiAbsorb || 0) + '/' + need
  }
  if (w.type === 'survive') {
    const need = w.seconds || 20
    return '坚持 ' + Math.min(need, Math.floor(st.elapsed || 0)) + '/' + need + ' 息'
  }
  if (w.type === 'boss') {
    return st.bossDown ? '境主已灭' : st.bossActive ? '境主交锋中' : '等待劫临'
  }
  if (w.type === 'kills') {
    const need = w.count || 12
    return '击杀 ' + Math.min(need, st.kills || 0) + '/' + need
  }
  return ''
}

function checkWin(chapter, st) {
  if (!chapter || !chapter.win || !st) return null
  if (st.failed && !(chapter.rules && chapter.rules.invuln)) return null
  const w = chapter.win
  if (w.type === 'story') return st.storyDone ? 'cleared' : 'pending'
  if (w.type === 'cultivate') {
    return (st.qiAbsorb || 0) >= (w.lingQi || 60) ? 'cleared' : 'pending'
  }
  if (w.type === 'survive') {
    return (st.elapsed || 0) >= (w.seconds || 20) ? 'cleared' : 'pending'
  }
  if (w.type === 'boss') return st.bossDown ? 'cleared' : 'pending'
  if (w.type === 'kills') {
    return (st.kills || 0) >= (w.count || 12) ? 'cleared' : 'pending'
  }
  return 'pending'
}

/** 选章列表按批次分组 */
function listChapterGroups(clearedIds) {
  const list = listChapters(clearedIds)
  const groups = []
  let cur = null
  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    if (!cur || cur.batch !== c.batch) {
      cur = {
        batch: c.batch,
        title: '第 ' + c.batch + ' 批',
        items: []
      }
      groups.push(cur)
    }
    cur.items.push(
      Object.assign({}, c, {
        modeLabel: modeLabel(c.mode),
        statusText: c.cleared ? '已通' : c.unlocked ? '可入' : '未解锁'
      })
    )
  }
  return groups
}

module.exports = {
  CHAPTERS,
  getChapter,
  getFirstChapter,
  getNextChapter,
  listChapters,
  listChapterGroups,
  modeLabel,
  sceneLabel,
  sceneForChapter,
  goalTip,
  progressTip,
  checkWin
}
