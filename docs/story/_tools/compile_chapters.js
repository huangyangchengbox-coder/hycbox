/**
 * 从章节梗概批次编译「一章一局」全量游戏章节表
 * 产出：
 *   docs/story/chapters_game_units.json
 *   miniprogram/data/xianChapters.js
 *
 * 用法：node docs/story/_tools/compile_chapters.js
 */
const fs = require('fs')
const path = require('path')

const STORY_ROOT = path.join(__dirname, '..')
const OUT_JSON = path.join(STORY_ROOT, 'chapters_game_units.json')
const OUT_JS = path.join(__dirname, '../../../miniprogram/data/xianChapters.js')

function listSourceFiles() {
  const batchDir = path.join(STORY_ROOT, 'batches')
  const batchFiles = fs
    .readdirSync(batchDir)
    .filter((f) => /^batch_\d+\.md$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
    .map((f) => path.join(batchDir, f))
  const first = path.join(STORY_ROOT, '章节梗概-第01批.md')
  return [first, ...batchFiles].filter((f) => fs.existsSync(f))
}

function batchNo(file) {
  const base = path.basename(file)
  const m = base.match(/第\s*0*(\d+)\s*批/) || base.match(/batch_(\d+)/)
  return m ? Number(m[1]) : 0
}

function inferMode(play, title, trigger) {
  const p = `${play || ''} ${title || ''} ${trigger || ''}`
  if (/飞升|大圆满|终局/.test(p)) return 'boss'
  if (/必败剧情战/.test(p)) return 'scripted'
  if (/纯剧情|设定揭露|分支对话|道德选择|图鉴|百科|操控试演/.test(p) && !/Boss|境主|战/.test(p)) {
    return 'story'
  }
  if (/打坐|经营|炼丹|催药|义诊|声望|双资源|药田/.test(p)) return 'cultivate'
  if (/Boss|境主|多阶段|境主战|魔潮境主|三阶段/.test(p)) return 'boss'
  if (/潜行|偷听|穿行|攀岩|考核|教学|限时撤离|闪避|罗烟步/.test(p)) return 'trial'
  if (/波次|副本|探索|群斗|切磋|杀妖|防守|清剿/.test(p)) return 'wave'
  return 'combat'
}

function inferMajor(gameMap, trigger, batch) {
  const t = String(trigger || '').toLowerCase()
  const g = String(gameMap || '').toLowerCase()
  const pick = (s) => {
    if (/entermajor\s*=\s*mortal|凡人打坐|^mortal\b/.test(s)) return 'mortal'
    if (/筑基|zhuji/.test(s)) return 'zhuji'
    if (/结丹|jiedan|jindan/.test(s)) return 'jiedan'
    if (/元婴|yuanying/.test(s)) return 'yuanying'
    if (/化神|huashen/.test(s)) return 'huashen'
    if (/炼虚|lianxu/.test(s)) return 'lianxu'
    if (/合体|heti/.test(s)) return 'heti'
    if (/大乘|dacheng/.test(s)) return 'dacheng'
    if (/真仙|zhenxian|金仙|太乙|大罗|道祖|仙界/.test(s)) return 'zhenxian'
    if (/灵界|lingjie/.test(s)) return 'huashen'
    if (/炼气|lianqi/.test(s)) return 'lianqi'
    if (/mortal|凡人/.test(s)) return 'mortal'
    return null
  }
  return (
    pick(t) ||
    pick(g) ||
    (batch <= 1
      ? 'mortal'
      : batch <= 3
        ? 'lianqi'
        : batch <= 6
          ? 'zhuji'
          : batch <= 13
            ? 'jiedan'
            : batch <= 26
              ? 'yuanying'
              : batch <= 35
                ? 'huashen'
                : batch <= 40
                  ? 'lianxu'
                  : 'heti')
  )
}

function inferScene(mode, title, id) {
  const t = `${title || ''} ${id || ''}`
  if (/瓶|绿液|催药|掌天/.test(t) || id === '1_d' || id === '2_a') return 'bottle'
  if (/村|青牛|离家|墨府/.test(t) || id === '1_a') return 'village'
  if (/崖|考核|炼骨|竹|荆棘/.test(t) || mode === 'trial') return 'cliff'
  if (mode === 'cultivate') return 'meditate'
  if (mode === 'boss' || mode === 'scripted') return 'boss'
  if (mode === 'story') return 'spirit'
  if (mode === 'wave') return 'spar'
  if (mode === 'combat') return 'battle'
  return 'ink'
}

function buildRules(mode, play, batch) {
  const p = String(play || '')
  const hard = batch >= 20 ? 1.15 : batch >= 10 ? 1.08 : 1
  if (mode === 'story') {
    return { spawnMul: 0, swordMul: 1, swordBonus: 0, timeLimit: 0, invuln: false, autoClearStory: true }
  }
  if (mode === 'cultivate') {
    return { spawnMul: 0.35, hpMul: 0.9 * hard, swordBonus: 1, timeLimit: 0, invuln: false, qiNeed: 60 }
  }
  if (mode === 'scripted') {
    return { spawnMul: 1.2, hpMul: 2.2, swordBonus: 0, timeLimit: 18, invuln: true, survive: true }
  }
  if (mode === 'boss') {
    return { spawnMul: 0.55, hpMul: 1.25 * hard, swordBonus: 2, timeLimit: 0, invuln: false, bossDelay: 2.2 }
  }
  if (mode === 'trial') {
    if (/潜行|偷听/.test(p)) {
      return { spawnMul: 0.45, hpMul: 0.85, swordBonus: 1, timeLimit: 28, invuln: false, stealth: true }
    }
    return { spawnMul: 0.75, hpMul: 0.9, swordBonus: 1, timeLimit: 0, invuln: false }
  }
  if (mode === 'wave') {
    return { spawnMul: 1.55 * hard, hpMul: 1.05 * hard, swordBonus: 2, timeLimit: 0, invuln: false }
  }
  return { spawnMul: 1 * hard, hpMul: 1 * hard, swordBonus: 1, timeLimit: 0, invuln: false }
}

function buildWin(mode, play, rules) {
  const p = String(play || '')
  if (mode === 'story') return { type: 'story', pages: 1 }
  if (mode === 'cultivate') return { type: 'cultivate', lingQi: rules.qiNeed || 60 }
  if (mode === 'scripted' || (rules && rules.survive)) {
    return { type: 'survive', seconds: rules.timeLimit || 18 }
  }
  if (mode === 'boss') return { type: 'boss', kills: 1 }
  if (mode === 'trial') {
    if (/潜行|偷听/.test(p) || (rules && rules.stealth)) {
      return { type: 'survive', seconds: rules.timeLimit || 25, stealth: true }
    }
    return { type: 'kills', count: 8 }
  }
  if (mode === 'wave') return { type: 'kills', count: 18 }
  return { type: 'kills', count: 12 }
}

function cleanDesignTone(s) {
  return String(s || '')
    .replace(/\*\*[^*]+\*\*/g, (m) => m.slice(2, -2))
    .replace(/黑屏字幕\s*[+＋]?\s*/g, '')
    .replace(/小村剪影[，,]?/g, '')
    .replace(/建议做[^。]*/g, '')
    .replace(/可做成[^。]*/g, '')
    .replace(/做成[^。]*/g, '')
    .replace(/包装为[^。]*/g, '')
    .replace(/气氛要[^。]*/g, '')
    .replace(/新增"?/g, '')
    .replace(/主打"?/g, '')
    .replace(/^交代[，,]?/g, '')
    .replace(/^以["「]?[^"」]+["」]?包装[^。]*/g, '')
    .replace(/^["「]+/, '')
    .replace(/["」]+([。！？]?)$/g, '$1')
    .replace(/^[，,、\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function clipLine(s, max) {
  const t = String(s || '').trim()
  if (!t) return ''
  const n = max || 48
  if (t.length <= n) return /[。！？…]$/.test(t) ? t : t + '。'
  return t.slice(0, n - 1) + '…'
}

function parseSeqRange(seq) {
  const m = String(seq || '').match(/(\d+)\D+(\d+)/)
  if (m) return { a: Number(m[1]), b: Number(m[2]) }
  const one = Number(String(seq || '').match(/\d+/))
  return { a: one || 0, b: one || 0 }
}

/** 解析「一、逐章梗概」表格 → [{seq, title, summary}] */
function parseSummaryTable(text) {
  const rows = []
  const lines = String(text || '').split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!/^\|\s*\d+/.test(line)) continue
    const cols = line.split('|').map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
    if (cols.length < 4) continue
    const seq = Number(cols[0])
    if (!seq) continue
    // 常见列：seq | 原章 | 标题 | 主要内容 | 关键要素
    let title = cols[2]
    let summary = cols[3]
    if (cols.length === 4) {
      title = cols[1]
      summary = cols[2]
    }
    rows.push({
      seq,
      title: String(title || '').replace(/\*\*/g, ''),
      summary: cleanDesignTone(summary)
    })
  }
  return rows
}

function pickSummaries(rows, seqA, seqB) {
  const inRange = rows.filter((r) => r.seq >= seqA && r.seq <= seqB)
  if (!inRange.length) return []
  const first = inRange[0]
  const mid = inRange[Math.floor(inRange.length / 2)]
  const last = inRange[inRange.length - 1]
  const out = []
  if (first && first.summary) out.push(first.summary)
  if (mid && mid !== first && mid.summary && mid.summary !== first.summary) out.push(mid.summary)
  if (last && last !== first && last !== mid && last.summary) out.push(last.summary)
  return out
}

function buildLines(title, narrative, play, summaries, mode) {
  const lines = []
  const narr = cleanDesignTone(narrative)
  if (narr) {
    const parts = narr.split(/[。！？；]/).map((s) => s.trim()).filter((s) => s.length >= 4)
    for (let i = 0; i < parts.length && lines.length < 2; i++) lines.push(clipLine(parts[i], 46))
  }
  for (let i = 0; i < summaries.length && lines.length < 3; i++) {
    const s = clipLine(summaries[i], 46)
    if (s && lines.indexOf(s) < 0) lines.push(s)
  }
  if (!lines.length) {
    lines.push(clipLine(`本章·${title}`, 40))
    const p = cleanDesignTone(play)
    if (p) lines.push(clipLine(p, 46))
  }
  if (lines.length < 2) {
    const tip =
      mode === 'story'
        ? '静心听完，故事自会向前。'
        : mode === 'boss'
          ? '境主将至，胜负只在此一战。'
          : mode === 'cultivate'
            ? '盘膝吐纳，待灵气入体圆满。'
            : '斩尽眼前妖障，即可入道。'
    lines.push(tip)
  }
  return lines.slice(0, 3)
}

function buildOutro(title, reward, mode) {
  const r = cleanDesignTone(reward)
  if (r) return [clipLine(r, 46), clipLine(`「${title}」一章已了。`, 36)]
  if (mode === 'boss') return ['劫消云散，道心更坚。', clipLine(`「${title}」闯过。`, 36)]
  if (mode === 'story') return ['话到此处，心事已明。', clipLine(`「${title}」收束。`, 36)]
  return ['此间事了，再踏前路。', clipLine(`「${title}」通关。`, 36)]
}

function parseFile(file) {
  const text = fs.readFileSync(file, 'utf8')
  const batch = batchNo(file)
  const gameMap = ((text.match(/\*\*游戏映射\*\*[：:]\s*(.+)/) || [])[1] || '').trim()
  const arc = ((text.match(/\*\*剧情弧\*\*[：:]\s*(.+)/) || [])[1] || '').trim()
  const summaries = parseSummaryTable(text)
  const units = []
  const headRe =
    /### 单元\s+([\d]+-[A-Za-z])《([^》]+)》（\s*seq\s*([\d–\-—~至到\s]+)\s*）\s*｜\s*触发：[ \t]*(.+?)[ \t]*$/gm
  const heads = []
  let m
  while ((m = headRe.exec(text))) {
    heads.push({ unitCode: m[1], title: m[2], seq: m[3], trigger: m[4], end: headRe.lastIndex })
  }
  for (let hi = 0; hi < heads.length; hi++) {
    const h = heads[hi]
    const nxt = text.indexOf('### 单元', h.end)
    const body = nxt > 0 ? text.slice(h.end, nxt) : text.slice(h.end)
    const unitCode = h.unitCode
    const title = h.title
    const seq = String(h.seq).replace(/[–—]/g, '-').replace(/\s+/g, '')
    const trigger = String(h.trigger).replace(/`/g, '').trim()
    const narrative = ((body.match(/\*\*叙事\*\*[：:]\s*(.+)/) || [])[1] || '').trim()
    const play = ((body.match(/\*\*玩法\*\*[：:]\s*(.+)/) || [])[1] || '').trim()
    const reward = ((body.match(/\*\*奖励\*\*[：:]\s*(.+)/) || [])[1] || '').trim()
    const mode = inferMode(play, title, trigger)
    let major = inferMajor(gameMap, trigger, batch)
    if (mode === 'trial' && major === 'mortal') major = 'lianqi'
    if (mode === 'cultivate' && major === 'mortal') {
      /* keep mortal for sit */
    } else if (mode === 'cultivate' && major === 'mortal') {
      major = 'lianqi'
    }
    const id = unitCode.toLowerCase().replace(/-/g, '_')
    const rules = buildRules(mode, play, batch)
    let win = buildWin(mode, play, rules)
    // 非凡人打坐：改为「击杀积灵」——仍用 cultivate UI 文案，但 win 走 kills，局内用 qiFromKills
    if (mode === 'cultivate' && major !== 'mortal') {
      win = { type: 'kills', count: 10 }
      rules.qiFromKills = true
      rules.spawnMul = Math.max(0.7, rules.spawnMul || 1)
    }
    const range = parseSeqRange(seq)
    const sumPick = pickSummaries(summaries, range.a, range.b)
    const lines = buildLines(title, narrative, play, sumPick, mode)
    const outro = buildOutro(title, reward, mode)
    units.push({
      id,
      unitCode,
      batch,
      order: 0,
      title,
      seq,
      triggerHint: trigger,
      mode,
      major,
      scene: inferScene(mode, title, id),
      win,
      rules,
      lines,
      outro,
      playHint: play.slice(0, 160),
      narrativeHint: narrative.slice(0, 160),
      rewardHint: reward.slice(0, 120),
      gameMap,
      arc,
      source: path.basename(file)
    })
  }
  return units
}

function main() {
  const files = listSourceFiles()
  let all = []
  for (const f of files) all = all.concat(parseFile(f))
  all.sort((a, b) => {
    if (a.batch !== b.batch) return a.batch - b.batch
    return a.unitCode.localeCompare(b.unitCode, 'en')
  })
  all.forEach((u, i) => {
    u.order = i + 1
    u.nextId = all[i + 1] ? all[i + 1].id : null
  })

  const modes = {}
  all.forEach((u) => {
    modes[u.mode] = (modes[u.mode] || 0) + 1
  })
  console.log('files', files.length, 'chapters', all.length, 'modes', modes)

  fs.writeFileSync(OUT_JSON, JSON.stringify(all, null, 2), 'utf8')

  const js = `/**
 * 仙途章节表 —— 「一章一局」全量
 * 由 docs/story/_tools/compile_chapters.js 编译，请勿手改大段。
 * 流程：选章 → 剧情动画 → 本局玩法 → 通关收束 → 解锁下一章
 */

const CHAPTERS = ${JSON.stringify(all, null, 2)}

const CHAPTER_BY_ID = {}
for (let i = 0; i < CHAPTERS.length; i++) CHAPTER_BY_ID[CHAPTERS[i].id] = CHAPTERS[i]

function getChapter(id) { return CHAPTER_BY_ID[id] || null }
function getFirstChapter() { return CHAPTERS[0] || null }
function getNextChapter(id) {
  const cur = getChapter(id)
  return cur && cur.nextId ? getChapter(cur.nextId) : null
}
function listChapters(clearedIds) {
  const cleared = clearedIds instanceof Set ? clearedIds : new Set(clearedIds || [])
  return CHAPTERS.map((c, i) => {
    const prevOk = i === 0 || cleared.has(CHAPTERS[i - 1].id)
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
      cleared: cleared.has(c.id),
      unlocked: prevOk || cleared.has(c.id)
    }
  })
}

module.exports = { CHAPTERS, CHAPTER_BY_ID, getChapter, getFirstChapter, getNextChapter, listChapters }
`
  fs.writeFileSync(OUT_JS, js, 'utf8')
  console.log('wrote', OUT_JSON)
  console.log('wrote', OUT_JS)
}

main()
