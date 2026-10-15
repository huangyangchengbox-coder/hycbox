/**
 * 仙途「一章一局」—— 全量章节 · 自研 Canvas 故事
 * 源表：xianChapters.js（265 章）
 * Demo 精修 beats（1-A～1-F）优先覆盖同 id
 */

const { CHAPTERS: RAW_CHAPTERS, CHAPTER_BY_ID: RAW_BY_ID } = require('./xianChapters')
const { DEMO_CHAPTERS } = require('./xianChaptersDemo')

const USE_DEMO_ONLY = false

const DEMO_BY_ID = {}
for (let i = 0; i < DEMO_CHAPTERS.length; i++) {
  DEMO_BY_ID[DEMO_CHAPTERS[i].id] = DEMO_CHAPTERS[i]
}

const MODE_LABEL = {
  story: '剧情',
  fight: '打斗',
  cultivate: '打坐',
  trial: '试炼',
  combat: '斩妖',
  wave: '清剿',
  boss: '境主',
  scripted: '剧情战'
}

const RENDER_LABEL = {
  canvas: '自研Canvas',
  sprite: '像素精灵',
  lottie: '自研Canvas',
  css: 'CSS方块'
}

const SCENE_LABEL = {
  village: '山边小村',
  cliff: '炼骨崖',
  bottle: '神秘小瓶',
  meditate: '神手谷',
  spar: '门内风云',
  battle: '斩妖除魔',
  boss: '境主之劫',
  spirit: '溪边异象',
  ink: '仙途'
}

const SCENE_FX = {
  village: ['mist', 'walk', 'glow'],
  cliff: ['mist', 'climb', 'slash', 'glow'],
  bottle: ['glow', 'quake', 'pulse'],
  meditate: ['glow', 'pulse', 'spirit'],
  spar: ['spar', 'slash', 'mist'],
  battle: ['slash', 'spar', 'quake'],
  boss: ['quake', 'slash', 'glow'],
  spirit: ['spirit', 'mist', 'glow'],
  ink: ['mist', 'glow', 'pulse']
}

const FIGHT_MODES = {
  combat: true,
  wave: true,
  boss: true,
  scripted: true,
  trial: true
}

function modeLabel(mode) {
  return MODE_LABEL[mode] || '剧情'
}

function renderOf() {
  return 'canvas'
}

function renderLabel() {
  return RENDER_LABEL.canvas
}

function sceneLabel(scene) {
  return SCENE_LABEL[scene] || '仙途'
}

function sceneForChapter(chapter) {
  return (chapter && chapter.scene) || 'ink'
}

/** 合并 Demo 精修文案；玩法一律故事通关 */
function hydrateChapter(raw) {
  if (!raw) return null
  const demo = DEMO_BY_ID[raw.id]
  return {
    id: raw.id,
    unitCode: raw.unitCode,
    batch: raw.batch,
    order: raw.order,
    title: raw.title,
    seq: raw.seq,
    mode: raw.mode,
    major: raw.major,
    scene: (demo && demo.scene) || raw.scene || 'ink',
    render: 'canvas',
    win: { type: 'story' },
    lines: raw.lines || [],
    beats: demo && demo.beats && demo.beats.length ? demo.beats : null,
    outro: (demo && demo.outro) || raw.outro || ['此间事了，再踏前路。'],
    nextId: raw.nextId || null,
    sourceMode: raw.mode
  }
}

const CHAPTERS = RAW_CHAPTERS.map(hydrateChapter)
const CHAPTER_BY_ID = {}
for (let i = 0; i < CHAPTERS.length; i++) {
  CHAPTER_BY_ID[CHAPTERS[i].id] = CHAPTERS[i]
}

function getChapter(id) {
  return CHAPTER_BY_ID[id] || null
}

function getFirstChapter() {
  return CHAPTERS[0] || null
}

function getNextChapter(id) {
  const cur = getChapter(id)
  return cur && cur.nextId ? getChapter(cur.nextId) : null
}

function fxFor(scene, index, total) {
  const pack = SCENE_FX[scene] || SCENE_FX.ink
  if (total <= 1) return pack[0]
  if (index <= 0) return pack[0]
  if (index >= total - 1) return pack[pack.length - 1]
  return pack[Math.min(index, pack.length - 1)]
}

function foeFor(chapter) {
  const m = chapter && chapter.mode
  if (m === 'boss') return '境主'
  if (m === 'wave') return '群妖'
  if (m === 'trial') return '试炼影'
  if (m === 'scripted') return '强敌'
  return '对手'
}

function fightTaps(chapter) {
  const m = chapter && chapter.mode
  if (m === 'boss') return 6
  if (m === 'wave') return 5
  return 4
}

/**
 * 将 lines / 精修 beats 转为可播放 beats；战斗类 mode 插入一段 fight
 */
function getBeats(chapter) {
  if (!chapter) return [{ text: '仙途又启。', fx: 'mist', kind: 'narrate' }]

  if (chapter.beats && chapter.beats.length) {
    return chapter.beats.map((b) => ({
      kind: b.kind || 'narrate',
      text: String(b.text || ''),
      fx: b.fx || 'mist',
      foe: b.foe || foeFor(chapter),
      taps: Math.max(3, b.taps || fightTaps(chapter))
    }))
  }

  const scene = sceneForChapter(chapter)
  const lines = (chapter.lines && chapter.lines.length ? chapter.lines : ['仙途又启。']).map((t) =>
    String(t || '').trim()
  )
  const beats = lines.map((text, i) => ({
    kind: 'narrate',
    text: text,
    fx: fxFor(scene, i, lines.length)
  }))

  if (FIGHT_MODES[chapter.mode] || FIGHT_MODES[chapter.sourceMode]) {
    const insertAt = Math.min(1, beats.length)
    beats.splice(insertAt, 0, {
      kind: 'fight',
      text: '此间有敌，须过一关——' + (chapter.title || '交锋'),
      fx: 'slash',
      foe: foeFor(chapter),
      taps: fightTaps(chapter)
    })
  }

  return beats
}

function goalTip(chapter) {
  if (!chapter) return '读完本章'
  const hasFight = getBeats(chapter).some((b) => b.kind === 'fight')
  return hasFight ? '自研Canvas · 遇打斗自动交锋' : '自研Canvas · 自动播放故事'
}

function progressTip() {
  return ''
}

function checkWin(chapter, st) {
  if (!chapter || !st) return null
  return st.storyDone ? 'cleared' : 'pending'
}

function listChapters(clearedIds) {
  const cleared = clearedIds instanceof Set ? clearedIds : new Set(clearedIds || [])
  return CHAPTERS.map((c, i) => {
    const prevOk = i === 0 || cleared.has(CHAPTERS[i - 1].id)
    const hasFight = getBeats(c).some((b) => b.kind === 'fight')
    return {
      id: c.id,
      order: c.order,
      unitCode: c.unitCode,
      title: c.title,
      batch: c.batch,
      mode: c.mode,
      major: c.major,
      scene: c.scene,
      seq: c.seq,
      render: 'canvas',
      cleared: cleared.has(c.id),
      unlocked: prevOk || cleared.has(c.id),
      modeLabel: hasFight ? '剧情·打斗' : '剧情'
    }
  })
}

function listChapterGroups(clearedIds) {
  const list = listChapters(clearedIds)
  const groups = []
  let cur = null
  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    if (!cur || cur.batch !== c.batch) {
      cur = {
        batch: c.batch,
        title: '第 ' + c.batch + ' 批 · 自研Canvas',
        items: []
      }
      groups.push(cur)
    }
    cur.items.push(
      Object.assign({}, c, {
        statusText: c.cleared ? '已通' : c.unlocked ? '可入' : '未解锁'
      })
    )
  }
  return groups
}

module.exports = {
  USE_DEMO_ONLY,
  CHAPTERS,
  CHAPTER_BY_ID,
  getChapter,
  getFirstChapter,
  getNextChapter,
  getBeats,
  listChapters,
  listChapterGroups,
  modeLabel,
  sceneLabel,
  sceneForChapter,
  renderOf,
  renderLabel,
  goalTip,
  progressTip,
  checkWin
}
