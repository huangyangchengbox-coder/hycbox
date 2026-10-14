/**
 * 仙途剧情节点表（v2 遗留 · 境界钩子旁白）
 * ------------------------------------------------------------------
 * v3 起主流程改为「一章一局」，请使用：
 *   - data/xianChapters.js      章节表（由梗概编译）
 *   - data/xianChapterPlay.js   选章 / 胜负辅助
 *   - docs/仙途剧情系统设计.md  v3 说明
 *
 * 本文件保留旧节点与 matchStoryNodes，供以后做「破境彩蛋旁白」复用，
 * 当前 zombie 主流程不再依赖本表。
 *
 * 文本为原著情节的**梗概改写**（非原文摘录）。
 */

const STORY_NODES = [
  {
    id: 'mortal_open',
    trigger: { type: 'enterMajor', major: 'mortal' },
    chapter: '凡人篇 · 山边小村',
    ref: '原著 第1章起',
    title: '神秘小瓶',
    lines: [
      '山边小村，少年心气不平，终日想着走出这片天地。',
      '机缘之下，得一神秘小瓶，瓶生异香，可催熟灵药。',
      '自此人鬼殊途，踏上一条与寻常修士全然不同的道路。'
    ],
    once: true
  },
  {
    id: 'lianqi_start',
    trigger: { type: 'enterMajor', major: 'lianqi' },
    chapter: '人界篇 · 七玄门',
    ref: '原著 第3章 / 黄枫谷',
    title: '入道炼气',
    lines: [
      '误入七玄门，识得墨大夫，修长春功，踏入炼气之门。',
      '无名口诀晦涩难解，唯有一分韧劲，方能在人前藏锋。'
    ],
    once: true
  },
  {
    id: 'zhuji_start',
    trigger: { type: 'enterMajor', major: 'zhuji' },
    chapter: '人界篇 · 黄枫谷',
    ref: '原著 筑基阶段',
    title: '青竹风云剑',
    lines: [
      '筑基方成，御剑凌空，青竹风云剑在手，锋芒初露。',
      '同辈眼中的淡泊，不过是藏拙——该收的机缘，一样不落。'
    ],
    once: true
  },
  {
    id: 'jiedan_start',
    trigger: { type: 'enterMajor', major: 'jiedan' },
    chapter: '人界篇 · 元武国',
    ref: '原著 结丹阶段',
    title: '金丹与噬金虫',
    lines: [
      '灵气凝丹，金丹既成，一身神通渐入佳境。',
      '噬金虫初养成，吞金噬宝，自此多了几分旁人不解的底气。'
    ],
    once: true
  },
  {
    id: 'yuanying_break',
    trigger: { type: 'bossDefeated', major: 'yuanying' },
    chapter: '第五卷 · 名震一方',
    ref: '原著 第643章 大庚剑阵',
    title: '大庚剑阵',
    lines: [
      '元婴既出，离体远去，人界已达高端战力之列。',
      '大庚剑阵圆转如意，剑气纵横，初显一方之名。'
    ],
    once: true
  },
  {
    id: 'huashen_break',
    trigger: { type: 'bossDefeated', major: 'huashen' },
    chapter: '第六卷 · 通天灵宝',
    ref: '原著 第879章起',
    title: '人界之巅',
    lines: [
      '化神难成，人界灵气稀薄，一步一劫。',
      '通天灵宝在手，虚天殿中机缘无数，也步步杀机。'
    ],
    once: true
  },
  {
    id: 'lianxu_break',
    trigger: { type: 'bossDefeated', major: 'lianxu' },
    chapter: '第七卷 · 纵横人界',
    ref: '原著 第1130章起',
    title: '纵横人界',
    lines: [
      '炼虚之力初成，人界再无敌手可挡。',
      '踏入灵界之前，先于人界走完这最后一程。'
    ],
    once: true
  },
  {
    id: 'heti_break',
    trigger: { type: 'bossDefeated', major: 'heti' },
    chapter: '第八卷 · 初入灵界',
    ref: '原著 第1275章起',
    title: '飞升灵界',
    lines: [
      '碎虚飞升，天地为之一换，灵界百族林立。',
      '初来乍到，处处是人情与算计，唯有自强。'
    ],
    once: true
  },
  {
    id: 'dacheng_break',
    trigger: { type: 'bossDefeated', major: 'dacheng' },
    chapter: '第九卷 · 灵界百族',
    ref: '原著 第1398章起',
    title: '灵界百族',
    lines: [
      '大乘之数，灵界已属顶尖之流。',
      '渡劫在即，一场飞升仙劫，成败只此一回。'
    ],
    once: true
  },
  {
    id: 'zhenxian_break',
    trigger: { type: 'bossDefeated', major: 'zhenxian' },
    chapter: '第十卷 · 魔界之战',
    ref: '原著 第1747章起',
    title: '真仙降世',
    lines: [
      '飞升仙界，真仙之姿，掌时间法则，一眼万年。',
      '魔界之战将起，仙界也不是清净地。'
    ],
    once: true
  },
  {
    id: 'daozu_perfect',
    trigger: { type: 'perfect' },
    chapter: '第十一卷 · 真仙降临',
    ref: '原著 第2171章 / 第2446章 大结局',
    title: '大圆满',
    lines: [
      '融合三千大道之一，法则领域近乎全知全能。',
      '回望来路，山边小村的少年，终究走到了这里。',
      '大道无情，而人有情——仙途至此，圆满。'
    ],
    once: true
  },
  {
    id: 'heart_demon',
    trigger: { type: 'bossDefeated', major: 'huashen', onlyOnceGlobal: true },
    chapter: '心魔劫',
    ref: '原著 元婴后心魔试炼',
    title: '心魔',
    lines: [
      '境主方灭，一道黑影自心中生出——那正是另一个自己。',
      '它知你所有软肋，也持你所有锋芒。斩心魔，即斩己身。'
    ],
    once: true
  },
  {
    id: 'first_death',
    trigger: { type: 'death' },
    chapter: '仙途有尽',
    ref: '通用',
    title: '大道无情',
    lines: [
      '修行之路，从来不是坦途。',
      '此身虽陨，道心不灭——再修一回。'
    ],
    once: false
  }
]

/** 触发类型说明（供 UI / 文档展示） */
const TRIGGER_TYPES = {
  enterMajor: '进入大境界',
  enterRealm: '到达指定境界',
  bossDefeated: '击败境主',
  firstKill: '首次击杀怪种',
  wave: '到达波次',
  death: '死亡结算',
  perfect: '道祖大圆满'
}

/**
 * 匹配一个触发条件下应播的节点（不含去重，去重由运行时 _storySeen 负责）
 * @param {object} ctx  { type, major, lv, monster, wave }
 * @returns {Array} 命中的节点（按表顺序）
 */
function matchStoryNodes(ctx) {
  const out = []
  for (let i = 0; i < STORY_NODES.length; i++) {
    const n = STORY_NODES[i]
    const t = n.trigger
    if (!t || t.type !== ctx.type) continue
    if (t.major && t.major !== ctx.major) continue
    if (t.lv != null && t.lv !== ctx.lv) continue
    if (t.monster && t.monster !== ctx.monster) continue
    if (t.wave != null && t.wave !== ctx.wave) continue
    out.push(n)
  }
  return out
}

module.exports = { STORY_NODES, TRIGGER_TYPES, matchStoryNodes }
