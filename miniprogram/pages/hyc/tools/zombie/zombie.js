/**
 * 仙途：草地上修仙斩尸。
 * 击杀达门槛后出现劫尸（大僵尸），击败后才突破境界。
 */

const config = require('../../../../services/config')
const api = require('../../../../services/api')
const wxSession = require('../../../../services/wxSession')
const xianChapterPlay = require('../../../../data/xianChapterPlay')
const xianStoryCanvas = require('../../../../libs/xianStoryCanvas')

/** 本地进度备份，避免读服失败时看不到再续入口 */
const XIAN_PROGRESS_LOCAL_KEY = 'hyc_xian_progress'
/** 章节通关进度（一章一局） */
const XIAN_CHAPTER_LOCAL_KEY = 'hyc_xian_chapters'

/** 远程资源根路径（后台 uploads），避免主包图片超 200K 质量门禁 */
const ASSET_BASE = 'https://hychyr.top/uploads/game/xian'
/** 资源版本号：换图后递增，避免微信缓存旧图 */
const ASSET_VER = '20260731i'

/** 劫尸血条段数（随等级缓增） */
function bossHpBars(realmLv) {
  return 3 + Math.min(4, Math.floor(Math.max(1, realmLv || 1) / 8))
}

/** 劫尸血条配色（从内层到外层循环） */
const BOSS_BAR_COLORS = ['#fbbf24', '#f87171', '#c084fc', '#38bdf8', '#4ade80', '#fb923c', '#e879f9']


function assetUrl(relPath) {
  return ASSET_BASE + '/' + String(relPath || '').replace(/^\//, '') + '?v=' + ASSET_VER
}

/** 小境界升层所需击杀（同大境界内） */
const MINOR_STAGE_KILLS = 5

/**
 * 大境界定义（人界/灵界/仙界）
 * stages 展开为小境界；isPeak（末层）打境主破大境；其余小境界击杀满后灵气旋涡入丹田
 */
const REALM_MAJOR_DEFS = [
  {
    key: 'mortal', name: '凡人', world: '人界', tier: '下', tierName: '人界·下境界', fx: '',
    color: '#64748b', glow: 'rgba(100,116,139,0.4)', sword: '#1e293b',
    stages: [{ key: '', label: '' }],
    short: '身如枯木，心若止水，待惊雷破晓',
    skills: '打坐吸纳天地灵气（无战斗技能）',
    desc: '凡人修仙起步：盘膝打坐吸纳天地灵气。风雨雷电随心境变幻，灵气入体圆满后可破入炼气。'
  },
  {
    key: 'lianqi', name: '炼气', world: '人界', tier: '下', tierName: '人界·下境界', fx: 'lianqi',
    color: '#86efac', glow: 'rgba(134,239,172,0.5)', sword: '#166534',
    stages: ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三'].map((lab, i) => ({
      key: String(i + 1), label: lab + '层'
    })),
    short: '眨眼剑法 · 火弹术 · 符箓诡战',
    skills: '眨眼剑法（突刺）· 火弹术 · 金刚符/天雷子等符箓 · 勇气满放大招',
    desc: '共十三层。吸纳天地灵气温养经脉；十三层巅峰需筑基丹等辅助，击败腐尸王可尝试筑基。',
    combat: {
      guardianName: '腐尸王', typeKey: 'walker', tint: '#4ade80',
      hpBars: 3, hpPerBar: 88, rMul: 1.25, warRate: 6.8,
      ultimate: 'blink_jian', ultName: '眨眼剑法', aux: 'huodan',
      tip: '眨眼突刺 · 火弹 · 符箓 · 勇气满放大招 · 十三层巅峰击败腐尸王筑基'
    }
  },
  {
    key: 'zhuji', name: '筑基', world: '人界', tier: '下', tierName: '人界·下境界', fx: 'zhuji',
    color: '#38bdf8', glow: 'rgba(56,189,248,0.5)', sword: '#0369a1',
    stages: [
      { key: 'early', label: '初期' }, { key: 'mid', label: '中期' },
      { key: 'late', label: '后期' }, { key: 'jiadan', label: '假丹' }
    ],
    short: '青元剑诀 · 颠倒五行阵',
    skills: '青元剑芒 · 护体剑盾 · 颠倒五行阵（勇气满）',
    desc: '灵气液化，可御剑飞行、辟谷。假丹境为筑基巅峰向结丹过渡；击败傀儡主尸可结丹。',
    combat: {
      guardianName: '傀儡主尸', typeKey: 'brute', tint: '#38bdf8',
      hpBars: 4, hpPerBar: 96, rMul: 1.15, warRate: 6.0,
      ultimate: 'wuxing_array', ultName: '颠倒五行阵', aux: 'qingyuan',
      tip: '青元剑芒 · 护体剑盾 · 勇气满布阵困敌 · 假丹巅峰击败傀儡主尸结丹'
    }
  },
  {
    key: 'jiedan', name: '结丹', world: '人界', tier: '下', tierName: '人界·下境界', fx: 'jiedan',
    color: '#fbbf24', glow: 'rgba(251,191,36,0.55)', sword: '#b45309',
    stages: [
      { key: 'early', label: '初期' }, { key: 'mid', label: '中期' },
      { key: 'late', label: '后期' }, { key: 'jiaying', label: '假婴' }
    ],
    short: '剑影分光 · 噬金虫',
    skills: '剑影分光 · 噬金虫 · 勇气满分光术',
    desc: '体内灵气凝结金丹。假婴境为结丹巅峰；击败金丹尸煞可孕婴。',
    combat: {
      guardianName: '金丹尸煞', typeKey: 'wraith', tint: '#fbbf24',
      hpBars: 4, hpPerBar: 108, rMul: 1.2, warRate: 5.6,
      ultimate: 'jianying', ultName: '剑影分光', aux: 'shijin',
      tip: '剑影群斩 · 噬金虫 · 勇气满分光术 · 假婴巅峰击败金丹尸煞'
    }
  },
  {
    key: 'yuanying', name: '元婴', world: '人界', tier: '下', tierName: '人界·下境界', fx: 'yuanying',
    color: '#f472b6', glow: 'rgba(244,114,182,0.55)', sword: '#be185d',
    stages: [
      { key: 'early', label: '初期' }, { key: 'mid', label: '中期' }, { key: 'late', label: '后期' }
    ],
    short: '大庚剑阵 · 辟邪神雷 · 遁光穿梭',
    skills: '大庚剑阵 · 辟邪神雷 · 遁光飞行 · 破碎虚空瞬移（躲伤）',
    desc: '金丹孕育元婴，可离体；人界高端战力。元婴起可破碎虚空瞬移躲避伤害。击败魔族长老可化神。',
    combat: {
      guardianName: '魔族长老', typeKey: 'demon', tint: '#a78bfa',
      hpBars: 6, hpPerBar: 260, rMul: 1.35, warRate: 3.2,
      ultimate: 'geng_classic', ultName: '大庚剑阵', aux: 'pixie_lei',
      tip: '遁光飞行 · 破碎虚空躲伤 · 辟邪神雷 · 勇气满放大庚 · 击败魔族长老'
    }
  },
  {
    key: 'huashen', name: '化神', world: '人界', tier: '下', tierName: '人界·下境界', fx: 'huashen',
    color: '#22d3ee', glow: 'rgba(34,211,238,0.55)', sword: '#0e7490',
    stages: [
      { key: 'early', label: '初期' }, { key: 'mid', label: '中期' }, { key: 'late', label: '后期' }
    ],
    short: '元磁神光 · 梵圣真魔功',
    skills: '元磁神光 · 梵圣真魔功 · 心魔黑影试炼（概率）',
    desc: '人界顶点，元婴向元神过渡。人界灵气稀薄，出手耗寿；击败煞魔化身可飞升炼虚。',
    combat: {
      guardianName: '煞魔化身', typeKey: 'brute', tint: '#22d3ee',
      hpBars: 5, hpPerBar: 140, rMul: 1.3, warRate: 5.2,
      ultimate: 'yuanci', ultName: '元磁神光', aux: 'fansheng',
      tip: '元磁神光 · 梵圣 · 击败境主后或现心魔黑影'
    }
  },
  {
    key: 'lianxu', name: '炼虚', world: '灵界', tier: '中', tierName: '灵界·中境界', fx: 'lianxu',
    color: '#2dd4bf', glow: 'rgba(45,212,191,0.55)', sword: '#0f766e',
    stages: [
      { key: 'early', label: '初期' }, { key: 'mid', label: '中期' }, { key: 'late', label: '后期' }
    ],
    short: '玄天斩灵剑 · 噬灵天火',
    skills: '玄天斩灵剑 · 噬灵天火 · 心魔黑影互挡',
    desc: '元婴化虚影，炼化天地元气。寿元可达万年，每三千年一大天劫。击败虚空裂兽可合体。',
    combat: {
      guardianName: '虚空裂兽', typeKey: 'wraith', tint: '#2dd4bf',
      hpBars: 5, hpPerBar: 155, rMul: 1.28, warRate: 4.8,
      ultimate: 'xuantian', ultName: '玄天斩灵剑', aux: 'shiling',
      tip: '玄天斩灵 · 噬灵天火 · 心魔黑影 · 黑剑互挡'
    }
  },
  {
    key: 'heti', name: '合体', world: '灵界', tier: '中', tierName: '灵界·中境界', fx: 'heti',
    color: '#a78bfa', glow: 'rgba(167,139,250,0.55)', sword: '#6d28d9',
    stages: [
      { key: 'early', label: '初期' }, { key: 'mid', label: '中期' }, { key: 'late', label: '后期' }
    ],
    short: '惊蛰十二变 · 百脉炼宝',
    skills: '惊蛰十二变 · 百脉炼宝 · 心魔试炼',
    desc: '元婴虚影与本体融合，掌握一种五行或变异属性抗衡天劫。击败真灵畸变体可大乘。',
    combat: {
      guardianName: '真灵畸变体', typeKey: 'screamer', tint: '#a78bfa',
      hpBars: 5, hpPerBar: 168, rMul: 1.35, warRate: 4.6,
      ultimate: 'avatar', ultName: '惊蛰十二变', aux: 'baimai',
      tip: '真灵变身 · 百脉炼宝 · 心魔黑影 · 遁光对拼'
    }
  },
  {
    key: 'dacheng', name: '大乘', world: '灵界', tier: '中', tierName: '灵界·中境界', fx: 'dacheng',
    color: '#fb7185', glow: 'rgba(251,113,133,0.55)', sword: '#be123c',
    stages: [
      { key: 'early', label: '初期' }, { key: 'mid', label: '中期' },
      { key: 'late', label: '后期' }, { key: 'dujie', label: '渡劫' }
    ],
    short: '涅槃圣体 · 噬灵天火',
    skills: '涅槃圣体 · 噬灵天火 · 渡劫飞升仙劫',
    desc: '元婴化为成人态，掌握两种及以上法则。渡劫期需渡飞升仙劫方可入仙界；击败灵界霸主。',
    combat: {
      guardianName: '灵界霸主', typeKey: 'demon', tint: '#fb7185',
      hpBars: 6, hpPerBar: 175, rMul: 1.4, warRate: 4.2,
      ultimate: 'niepan', ultName: '涅槃圣体', aux: 'shiling',
      tip: '涅槃圣体 · 噬灵天火 · 渡劫巅峰击败灵界霸主'
    }
  },
  {
    key: 'zhenxian', name: '真仙', world: '仙界', tier: '上', tierName: '仙界·上境界', fx: 'zhenxian',
    color: '#fde68a', glow: 'rgba(253,230,138,0.6)', sword: '#ca8a04',
    stages: [
      { key: 'early', label: '初期' }, { key: 'mid', label: '中期' }, { key: 'late', label: '后期' }
    ],
    short: '时间法则 · 青竹雷海',
    skills: '时间法则 · 青竹雷海 · 修炼仙窍（每小境 12 窍，共 36）',
    desc: '每小境界修炼 12 个仙窍。未领悟法则者仅为散仙/地仙。击败仙劫雷兽可金仙。',
    combat: {
      guardianName: '仙劫雷兽', typeKey: 'spitter', tint: '#fde68a',
      hpBars: 5, hpPerBar: 185, rMul: 1.3, warRate: 4.0,
      ultimate: 'time_law', ultName: '时间法则', aux: 'leihai',
      tip: '时间法则 · 青竹雷海 · 心魔黑影 · 黑剑互挡'
    }
  },
  {
    key: 'jinxian', name: '金仙', world: '仙界', tier: '上', tierName: '仙界·上境界', fx: 'jinxian',
    color: '#fdba74', glow: 'rgba(253,186,116,0.6)', sword: '#c2410c',
    stages: [
      { key: 'early', label: '初期' }, { key: 'mid', label: '中期' }, { key: 'late', label: '后期' }
    ],
    short: '时间灵域 · 真灵变身',
    skills: '时间灵域 · 真灵变身 · 凝聚法则之丝',
    desc: '渡过天人五衰末两衰（魂衰、煞衰），可施展基础灵域。击败时间囚徒可太乙。',
    combat: {
      guardianName: '时间囚徒', typeKey: 'wraith', tint: '#fdba74',
      hpBars: 6, hpPerBar: 190, rMul: 1.32, warRate: 3.8,
      ultimate: 'time_law', ultName: '时间灵域', aux: 'avatar_tick',
      tip: '时间灵域 · 真灵近战 · 心魔黑影 · 黑剑互挡'
    }
  },
  {
    key: 'taiyi', name: '太乙', world: '仙界', tier: '上', tierName: '仙界·上境界', fx: 'taiyi',
    color: '#e7e5e4', glow: 'rgba(231,229,228,0.65)', sword: '#78716c',
    stages: [
      { key: 'early', label: '初期' }, { key: 'mid', label: '中期' }, { key: 'late', label: '后期' }
    ],
    short: '神念囚笼 · 玄煞暝灵',
    skills: '神念囚笼 · 玄煞暝灵 · 灵域演化小世界',
    desc: '肉身化玉体，领悟一法则即可掌一方天地。击败煞气天魔可大罗。',
    combat: {
      guardianName: '煞气天魔', typeKey: 'brute', tint: '#e7e5e4',
      hpBars: 6, hpPerBar: 200, rMul: 1.35, warRate: 3.6,
      ultimate: 'shennian', ultName: '神念囚笼', aux: 'xuansha',
      tip: '神念囚笼 · 玄煞暝灵 · 心魔黑影 · 黑剑互挡'
    }
  },
  {
    key: 'daluo', name: '大罗', world: '仙界', tier: '上', tierName: '仙界·上境界', fx: 'daluo',
    color: '#c4b5fd', glow: 'rgba(196,181,253,0.65)', sword: '#6d28d9',
    stages: [
      { key: 'early', label: '初期' }, { key: 'mid', label: '中期' }, { key: 'late', label: '后期' }
    ],
    short: '时间本源 · 斩三尸',
    skills: '时间本源斩 · 灵域压制 · 斩恶尸/善尸/自我尸',
    desc: '进阶道祖需斩三尸、禁断尘缘。击败三尸合影可问道。',
    combat: {
      guardianName: '三尸合影', typeKey: 'demon', tint: '#c4b5fd',
      hpBars: 6, hpPerBar: 210, rMul: 1.38, warRate: 3.4,
      ultimate: 'xuantian', ultName: '时间本源斩', aux: 'time_press',
      tip: '时间本源 · 斩三尸 · 心魔黑影 · 黑剑互挡'
    }
  },
  {
    key: 'daozu', name: '道祖', world: '仙界', tier: '上', tierName: '仙界·上境界', fx: 'daozu',
    color: '#fff7ed', glow: 'rgba(255,247,237,0.75)', sword: '#9a3412',
    stages: [{ key: '', label: '' }],
    short: '时间大道 · 掌天瓶',
    skills: '时间大道 · 掌天瓶（终极底牌）',
    desc: '融合三千大道之一，法则领域近乎全知全能。无小境界划分，同阶仍有战力差。击败混沌道影臻至大圆满。',
    combat: {
      guardianName: '混沌道影', typeKey: 'demon', tint: '#fff7ed',
      hpBars: 7, hpPerBar: 220, rMul: 1.45, warRate: 3.0,
      ultimate: 'dao_crush', ultName: '时间大道', aux: 'bottle',
      tip: '时间大道 · 掌天瓶 · 心魔黑影 · 击败混沌道影'
    }
  }
]

/** 由大境界展开小境界表 */
function buildRealmsFromMajors() {
  const list = []
  let kills = 0
  for (let mi = 0; mi < REALM_MAJOR_DEFS.length; mi++) {
    const maj = REALM_MAJOR_DEFS[mi]
    const stages = maj.stages || [{ key: '', label: '' }]
    const stagesText = stages.map((s) => s.label || '本境').join(' / ')
    const hasNextMajor = mi < REALM_MAJOR_DEFS.length - 1
    for (let si = 0; si < stages.length; si++) {
      const st = stages[si]
      const isPeak = !!(hasNextMajor && maj.key !== 'mortal' && si === stages.length - 1)
      const name = st.label ? (maj.name + '·' + st.label) : maj.name
      list.push({
        kills: kills,
        name: name,
        majorName: maj.name,
        majorKey: maj.key,
        majorIndex: mi,
        stageKey: st.key || '',
        stageLabel: st.label || '',
        stageIndex: si,
        stageCount: stages.length,
        stagesText: stagesText,
        isPeak: isPeak,
        isMajorFirst: si === 0,
        world: maj.world || '',
        tier: maj.tier,
        tierName: maj.tierName,
        fx: maj.fx || '',
        color: maj.color,
        glow: maj.glow,
        sword: maj.sword,
        short: maj.short || '',
        skills: maj.skills || '',
        desc: maj.desc || '',
        tip: (maj.combat && maj.combat.tip) || maj.short || ''
      })
      // 累计击杀门槛：仅作说明/兼容；小境界实际进度用 stageKills
      if (!(maj.key === 'mortal' && si === 0)) {
        kills += isPeak ? 10 : MINOR_STAGE_KILLS
      }
    }
  }
  return list
}

const REALMS = buildRealmsFromMajors()

/** 大境界 key → 战斗配置 */
const REALM_COMBAT_BY_MAJOR = {}
for (let i = 0; i < REALM_MAJOR_DEFS.length; i++) {
  const maj = REALM_MAJOR_DEFS[i]
  if (maj.combat) {
    REALM_COMBAT_BY_MAJOR[maj.key] = Object.assign({ key: maj.key }, maj.combat)
  }
}

/** 旧档 14 境 → 各大境界「第一小境」lv（1-based） */
const OLD_REALM_MAJOR_KEYS = [
  'mortal', 'lianqi', 'zhuji', 'jiedan', 'yuanying', 'huashen',
  'lianxu', 'heti', 'dacheng', 'zhenxian', 'jinxian', 'taiyi', 'daluo', 'daozu'
]

function firstRealmLvOfMajor(majorKey) {
  for (let i = 0; i < REALMS.length; i++) {
    if (REALMS[i].majorKey === majorKey) return i + 1
  }
  return 1
}

/** 兼容旧存档 realmLv（≤14 且远小于新表长度时，按大境界映射到首层） */
function migrateRealmLv(savedLv) {
  const lv = Math.max(1, savedLv | 0)
  if (lv <= OLD_REALM_MAJOR_KEYS.length && REALMS.length > OLD_REALM_MAJOR_KEYS.length + 5) {
    const key = OLD_REALM_MAJOR_KEYS[lv - 1]
    return firstRealmLvOfMajor(key)
  }
  return Math.max(1, Math.min(REALMS.length, lv))
}

/** ZombieOGA 分镜：Idle/Walk/Attack/Hurt/Dead（远程图） */
function buildAnimPaths(folder, prefix, count) {
  const paths = []
  for (let i = 0; i < count; i++) {
    paths.push(assetUrl(folder + '/' + prefix + '_' + (i < 10 ? '0' : '') + i + '.png'))
  }
  return paths
}

const ANIM_DEFS = {
  idle: { paths: buildAnimPaths('idle', 'idle', 10), fps: 7 },
  walk: { paths: buildAnimPaths('walk', 'walk', 10), fps: 8 },
  attack: { paths: buildAnimPaths('attack', 'attack', 8), fps: 10 },
  // 受伤/死亡稍慢，方便看清单帧动作
  hurt: { paths: buildAnimPaths('hurt', 'hurt', 8), fps: 9 },
  dead: { paths: buildAnimPaths('dead', 'dead', 8), fps: 7 },
  // 出土：手→露头→半身（3 帧）
  emerge: { paths: buildAnimPaths('emerge', 'emerge', 3), fps: 3.2 }
}

/** 地面掉落：灵石 / 丹药即时用；符箓拾取后点按扔出 */
const LOOT_DEFS = {
  sword: { kind: 'sword', label: '飞剑', color: '#fde68a', mark: '剑' },
  lingshi: { kind: 'stone', label: '灵石', color: '#67e8f9', mark: '石', qi: 28 },
  hp: { kind: 'pill', label: '回血丹', color: '#f87171', mark: '血', heal: 0.32 },
  ling: { kind: 'pill', label: '回灵丹', color: '#a5f3fc', mark: '灵', qi: 45 },
  fu_lei: { kind: 'fu', label: '雷符', color: '#fde047', mark: '雷' },
  fu_fire: { kind: 'fu', label: '火符', color: '#fb923c', mark: '火' },
  fu_ice: { kind: 'fu', label: '冰符', color: '#93c5fd', mark: '冰' },
  fu_earth: { kind: 'fu', label: '遁地符', color: '#a3e635', mark: '遁' },
  fu_hide: { kind: 'fu', label: '隐身符', color: '#c4b5fd', mark: '隐' },
  fu_bind: { kind: 'fu', label: '缚尸符', color: '#f9a8d4', mark: '缚' }
}

/** 暂时关闭：灵石 / 符咒 / 出土剑（含 pickup 剑） */
const LOOT_TEMP_DISABLED = {
  lingshi: true,
  sword: true,
  fu_lei: true,
  fu_fire: true,
  fu_ice: true,
  fu_earth: true,
  fu_hide: true,
  fu_bind: true
}

function isLootTempDisabled(key) {
  if (!key) return true
  if (LOOT_TEMP_DISABLED[key]) return true
  if (String(key).indexOf('fu_') === 0) return true
  return false
}

/** 灵气：御剑消耗；静止打坐 / 灵石 / 回灵丹补充 */
const LING_QI_BASE = 80
const LING_QI_PER_LV = 10
const LING_QI_MEDITATE = 14
const FU_KEYS = ['fu_lei', 'fu_fire', 'fu_ice', 'fu_earth', 'fu_hide', 'fu_bind']

function playerMaxHpByRealm(realm) {
  const mi = (realm && realm.majorIndex != null) ? realm.majorIndex : Math.max(0, ((realm && realm.lv) || 1) - 1)
  const tierBonus = realm.tier === '上' ? 50 : (realm.tier === '中' ? 24 : 0)
  return 48 + (mi + 1) * 16 + tierBonus
}

function playerMaxLingQi(realm) {
  const mi = (realm && realm.majorIndex != null) ? realm.majorIndex : Math.max(0, ((realm && realm.lv) || 1) - 1)
  return LING_QI_BASE + Math.max(0, mi + 1) * LING_QI_PER_LV
}

/** 御剑一次消耗的灵气：剑越多越费 */
function swordLingCost(swordCount) {
  return Math.max(2, Math.ceil(2 + (swordCount || 1) * 0.14))
}

/** 任务角色：炼气起持剑；凡人打坐分镜 */
const PLAYER_PATH = assetUrl('heroes/player_fixed.png')
const MORTAL_MEDITATE_PATHS = [
  assetUrl('heroes/mortal/meditate_00.png'),
  assetUrl('heroes/mortal/meditate_01.png'),
  assetUrl('heroes/mortal/meditate_02.png'),
  assetUrl('heroes/mortal/meditate_03.png')
]
/** 凡人吸纳天地灵气：满后突破炼气 */
const MORTAL_QI_NEED = 100
const MORTAL_QI_RATE = 5.5
/** 草地背景固定一套 */
const GRASS_PATH = assetUrl('bg_field.jpg')
/** 劫尸（升级前 Boss）：行走 / 喷黑液 */
const BOSS_WALK_PATH = assetUrl('boss/boss_walk.png')
const BOSS_SKILL_PATH = assetUrl('boss/boss_skill.png')
/** 突破前精神领域：sj → sj02 → 化光入眉心 */
const SPIRIT_SJ_PATH = assetUrl('fx/sj.jpg')
const SPIRIT_SJ02_PATH = assetUrl('fx/sj02.jpg')
/** 左下角太极：自动 / 手动切换 */
const TAIJI_PATH = assetUrl('fx/taiji.png')
/** 灵狐已移除（保留常量避免旧引用报错） */
const HELPER_WALK_PATHS = []
const HELPER_SKILL_PATHS = []
const HELPER_SKILL_DUR = 0.86
const HELPER_SKILL_CD = 2.45
const HELPER_FOLLOW_OX = -46
const HELPER_FOLLOW_OY = 8
const HELPER_UNLOCK_LV = 999
/** 元婴起可空间顺移（撕裂虚空）——按大境界判定 */
const YUANYING_MAJOR_KEY = 'yuanying'
/** @deprecated 旧数值阈值，仅兼容注释；请用 canSpaceBlink / isYuanying* */
const BLINK_UNLOCK_LV = firstRealmLvOfMajor(YUANYING_MAJOR_KEY)
/** 空间之力蓄满后才可撕裂虚空 */
const SPACE_FORCE_MAX = 100
const SPACE_FORCE_PASSIVE = 7.5
const SPACE_FORCE_PER_KILL = 14
/** 自动撕裂虚空最少间隔 */
const VOID_AUTO_GAP = 2.6
/** 撕裂虚空整段时长 */
const VOID_BLINK_DUR = 1.9
const VOID_TEAR_PATH = assetUrl('fx/void_tear.png')
/** 凡人打坐天气背景（风雨 → 破晓） */
const WEATHER_STORM_PATH = assetUrl('fx/weather/sky_storm.jpg')
const WEATHER_DAWN_PATH = assetUrl('fx/weather/sky_dawn.jpg')
/** 凡人打坐旁白 */
const MORTAL_MEDITATE_QUOTE = '身如枯木，心若止水，待惊雷破晓！'

/**
 * 怪物图鉴：共用僵尸分镜，靠色调/体型/攻击与特效区分
 * atk: melee|dash|spit|slam|phase|scream
 */
const MONSTER_TYPES = {
  walker: {
    key: 'walker', name: '腐尸',
    art: assetUrl('mobs/walker.png'),
    artAtk: assetUrl('mobs/walker_atk.png'),
    artWalk: [assetUrl('mobs/walker_w0.png'), assetUrl('mobs/walker_w1.png')],
    tint: '#86efac', glow: 'rgba(134,239,172,0.45)',
    hpMul: 1, speedMul: 1, rMul: 1, dmgMul: 1,
    atk: 'melee', atkRange: 18, useBossArt: false,
    emerge: 'dirt', hurt: 'spark', death: 'ash'
  },
  sprinter: {
    key: 'sprinter', name: '疾尸',
    art: assetUrl('mobs/sprinter.png'),
    artAtk: assetUrl('mobs/sprinter_atk.png'),
    artWalk: [assetUrl('mobs/sprinter_w0.png'), assetUrl('mobs/sprinter_w1.png')],
    tint: '#4ade80', glow: 'rgba(74,222,128,0.45)',
    hpMul: 0.78, speedMul: 1.65, rMul: 0.9, dmgMul: 0.95,
    atk: 'dash', atkRange: 22, useBossArt: false,
    emerge: 'burst', hurt: 'slash', death: 'scatter'
  },
  spitter: {
    key: 'spitter', name: '喷尸',
    art: assetUrl('mobs/spitter.png'),
    artAtk: assetUrl('mobs/spitter_atk.png'),
    artWalk: [assetUrl('mobs/spitter_w0.png'), assetUrl('mobs/spitter_w1.png')],
    tint: '#a78bfa', glow: 'rgba(167,139,250,0.45)',
    hpMul: 0.95, speedMul: 0.85, rMul: 1.05, dmgMul: 1.1,
    atk: 'spit', atkRange: 200, useBossArt: false,
    emerge: 'goo', hurt: 'ink', death: 'splatter'
  },
  brute: {
    key: 'brute', name: '巨尸',
    art: assetUrl('mobs/brute.png'),
    artAtk: assetUrl('mobs/brute_atk.png'),
    artWalk: [assetUrl('mobs/brute_w0.png'), assetUrl('mobs/brute_w1.png')],
    tint: '#fb923c', glow: 'rgba(251,146,60,0.45)',
    hpMul: 1.85, speedMul: 0.52, rMul: 1.4, dmgMul: 1.45,
    atk: 'slam', atkRange: 28, useBossArt: false,
    emerge: 'quake', hurt: 'crack', death: 'rubble'
  },
  wraith: {
    key: 'wraith', name: '幽尸',
    art: assetUrl('mobs/wraith.png'),
    artAtk: assetUrl('mobs/wraith_atk.png'),
    artWalk: [assetUrl('mobs/wraith_w0.png'), assetUrl('mobs/wraith_w1.png')],
    tint: '#67e8f9', glow: 'rgba(103,232,249,0.45)',
    hpMul: 0.85, speedMul: 1.15, rMul: 0.95, dmgMul: 1.05,
    atk: 'phase', atkRange: 20, useBossArt: false, alpha: 0.92,
    emerge: 'fade', hurt: 'ripple', death: 'vanish'
  },
  screamer: {
    key: 'screamer', name: '嚎尸',
    art: assetUrl('mobs/screamer.png'),
    artAtk: assetUrl('mobs/screamer_atk.png'),
    artWalk: [assetUrl('mobs/screamer_w0.png'), assetUrl('mobs/screamer_w1.png')],
    tint: '#f472b6', glow: 'rgba(244,114,182,0.45)',
    hpMul: 1.1, speedMul: 0.95, rMul: 1.08, dmgMul: 1.2,
    atk: 'scream', atkRange: 72, useBossArt: false,
    emerge: 'howl', hurt: 'pulse', death: 'explode'
  },
  /** 元婴：魔族长老，人形黑气，月牙魔气挡剑/主动攻击 */
  demon: {
    key: 'demon', name: '魔族长老',
    art: assetUrl('mobs/screamer.png'),
    artAtk: assetUrl('mobs/screamer_atk.png'),
    artWalk: [assetUrl('mobs/screamer_w0.png'), assetUrl('mobs/screamer_w1.png')],
    tint: '#1e1b4b', glow: 'rgba(76,29,149,0.72)',
    hpMul: 2.6, speedMul: 0.82, rMul: 1.22, dmgMul: 1.45,
    atk: 'crescent', atkRange: 240, useBossArt: false,
    emerge: 'fade', hurt: 'ripple', death: 'vanish',
    isDemon: true, resistSkills: true, alpha: 0.98
  },
  /** 元婴后：主角黑色心魔分身（绘制时用黑影+血盆大口，不依赖贴图） */
  shadow_self: {
    key: 'shadow_self', name: '心魔黑影',
    art: assetUrl('mobs/screamer.png'),
    artAtk: assetUrl('mobs/screamer_atk.png'),
    artWalk: [assetUrl('mobs/screamer_w0.png'), assetUrl('mobs/screamer_w1.png')],
    tint: '#0a0a0a', glow: 'rgba(220,38,38,0.55)',
    hpMul: 2.8, speedMul: 0.9, rMul: 1.15, dmgMul: 1.5,
    atk: 'crescent', atkRange: 260, useBossArt: false,
    emerge: 'fade', hurt: 'ripple', death: 'vanish',
    isDemon: true, resistSkills: true, isShadowSelf: true, alpha: 0.92
  }
}
const MONSTER_KEYS = ['walker', 'sprinter', 'spitter', 'brute', 'wraith', 'screamer']
/** 含魔族/心魔，仅用于贴图预加载 */
const MOB_LOAD_KEYS = MONSTER_KEYS.concat(['demon', 'shadow_self'])

function monsterDef(key) {
  return MONSTER_TYPES[key] || MONSTER_TYPES.walker
}

/** 随波次/境界逐步解锁怪物种类（开局至少 4 种，避免全是绿色尸） */
function unlockedMonsterKeys(wave, realmLv) {
  const n = Math.min(
    MONSTER_KEYS.length,
    4 + Math.floor((wave || 1) / 2) + Math.floor(Math.max(0, (realmLv || 1) - 2) / 2)
  )
  return MONSTER_KEYS.slice(0, Math.max(4, n))
}

function pickMonsterKey(wave, realmLv) {
  if (isYuanyingPlus(realmLv)) return 'demon'
  const keys = unlockedMonsterKeys(wave, realmLv)
  return keys[Math.floor(Math.random() * keys.length)]
}

function canSpaceBlink(realmLv) {
  return isYuanyingPlus(realmLv)
}

/**
 * 境主战斗套件：抵抗飞剑 + 主动攻击；境界越高挡招越勤、僵持越久、减伤越高
 * 心魔黑影不在此生成，而在元婴后击杀境主后随机出现
 */
/** 境主形象/行为档案：按大境界说明区分移动·攻击·抵挡·死亡 */
const GUARDIAN_PROFILES = {
  "lianqi": {
    "gMove": "shamble",
    "gAtk": "claw",
    "gBlock": "bone",
    "gDeath": "scatter",
    "gEmerge": "dirt",
    "gHurt": "spark",
    "gDraw": "rotking",
    "crescentColor": "#4ade80",
    "crescentGlow": "#86efac"
  },
  "zhuji": {
    "gMove": "puppet",
    "gAtk": "slam",
    "gBlock": "puppet",
    "gDeath": "rubble",
    "gEmerge": "quake",
    "gHurt": "crack",
    "gDraw": "puppet",
    "crescentColor": "#38bdf8",
    "crescentGlow": "#7dd3fc"
  },
  "jiedan": {
    "gMove": "float",
    "gAtk": "spit",
    "gBlock": "jindan",
    "gDeath": "vanish",
    "gEmerge": "fade",
    "gHurt": "ink",
    "gDraw": "jindan",
    "crescentColor": "#fbbf24",
    "crescentGlow": "#fde68a"
  },
  "yuanying": {
    "gMove": "demon",
    "gAtk": "crescent",
    "gBlock": "moon",
    "gDeath": "vanish",
    "gEmerge": "fade",
    "gHurt": "ripple",
    "gDraw": "demon",
    "crescentColor": "#7c3aed",
    "crescentGlow": "#a78bfa"
  },
  "huashen": {
    "gMove": "heavy",
    "gAtk": "slam",
    "gBlock": "sha",
    "gDeath": "explode",
    "gEmerge": "burst",
    "gHurt": "pulse",
    "gDraw": "sha",
    "crescentColor": "#22d3ee",
    "crescentGlow": "#67e8f9"
  },
  "lianxu": {
    "gMove": "void",
    "gAtk": "phase",
    "gBlock": "void",
    "gDeath": "rift",
    "gEmerge": "fade",
    "gHurt": "ripple",
    "gDraw": "voidbeast",
    "crescentColor": "#2dd4bf",
    "crescentGlow": "#99f6e4"
  },
  "heti": {
    "gMove": "warp",
    "gAtk": "scream",
    "gBlock": "spirit",
    "gDeath": "explode",
    "gEmerge": "howl",
    "gHurt": "pulse",
    "gDraw": "mutate",
    "crescentColor": "#a78bfa",
    "crescentGlow": "#ddd6fe"
  },
  "dacheng": {
    "gMove": "heavy",
    "gAtk": "crescent",
    "gBlock": "law",
    "gDeath": "explode",
    "gEmerge": "burst",
    "gHurt": "slash",
    "gDraw": "overlord",
    "crescentColor": "#fb7185",
    "crescentGlow": "#fecdd3"
  },
  "zhenxian": {
    "gMove": "storm",
    "gAtk": "spit",
    "gBlock": "lei",
    "gDeath": "scatter",
    "gEmerge": "burst",
    "gHurt": "spark",
    "gDraw": "leibeast",
    "crescentColor": "#fde68a",
    "crescentGlow": "#fef08a"
  },
  "jinxian": {
    "gMove": "time",
    "gAtk": "phase",
    "gBlock": "time",
    "gDeath": "vanish",
    "gEmerge": "fade",
    "gHurt": "ripple",
    "gDraw": "timeprison",
    "crescentColor": "#fdba74",
    "crescentGlow": "#fed7aa"
  },
  "taiyi": {
    "gMove": "heavy",
    "gAtk": "slam",
    "gBlock": "sha",
    "gDeath": "rubble",
    "gEmerge": "quake",
    "gHurt": "crack",
    "gDraw": "tianmo",
    "crescentColor": "#e7e5e4",
    "crescentGlow": "#fafaf9"
  },
  "daluo": {
    "gMove": "demon",
    "gAtk": "crescent",
    "gBlock": "tri",
    "gDeath": "vanish",
    "gEmerge": "fade",
    "gHurt": "ink",
    "gDraw": "sanshi",
    "crescentColor": "#c4b5fd",
    "crescentGlow": "#ddd6fe"
  },
  "daozu": {
    "gMove": "chaos",
    "gAtk": "phase",
    "gBlock": "dao",
    "gDeath": "rift",
    "gEmerge": "fade",
    "gHurt": "ripple",
    "gDraw": "chaos",
    "crescentColor": "#fff7ed",
    "crescentGlow": "#ffedd5"
  }
}

function getGuardianProfile(majorKey) {
  return GUARDIAN_PROFILES[majorKey] || GUARDIAN_PROFILES.lianqi
}

/**
 * 境主战斗套件：随大境界增强；招式/移动取自 GUARDIAN_PROFILES
 */
function getGuardianKit(realmLv) {
  const realm = realmByLv(realmLv)
  const mi = realm.majorIndex || 0
  const t = Math.max(0, mi - 1)
  const combat = REALM_COMBAT_BY_MAJOR[realm.majorKey] || null
  const prof = getGuardianProfile(realm.majorKey)
  return {
    resistSkills: mi >= 1,
    blockCdMax: Math.max(0.14, 0.52 - t * 0.035),
    blockDuration: Math.min(1.45, 0.52 + t * 0.08),
    dmgResist: Math.min(0.52, 0.1 + t * 0.038),
    atk: prof.gAtk || 'crescent',
    atkRange: 160 + Math.min(100, t * 10) + (prof.gAtk === 'spit' || prof.gAtk === 'phase' ? 40 : 0),
    skillCd: Math.max(1.0, 2.4 - t * 0.1),
    isDemon: mi >= 4,
    isShadowSelf: false,
    crescentColor: prof.crescentColor || '#7c3aed',
    crescentGlow: prof.crescentGlow || '#a78bfa',
    gMove: prof.gMove || 'shamble',
    gBlock: prof.gBlock || 'bone',
    gDeath: prof.gDeath || 'scatter',
    gEmerge: prof.gEmerge || 'dirt',
    gHurt: prof.gHurt || 'spark',
    gDraw: prof.gDraw || 'rotking',
    guardianName: combat && combat.guardianName
  }
}

/** 心魔黑影套件：镜像主角御剑，可与主角飞剑互相抵挡 */
function getHeartDemonKit(realmLv) {
  const lv = realmLv || 6
  const t = Math.max(0, lv - 5)
  return {
    resistSkills: true,
    blockCdMax: Math.max(0.12, 0.42 - t * 0.03),
    blockDuration: Math.min(1.5, 0.7 + t * 0.08),
    dmgResist: Math.min(0.55, 0.18 + t * 0.04),
    swordEvery: Math.max(0.32, 0.55 - t * 0.03),
    swordCount: Math.min(8, 2 + Math.floor(t * 0.8)),
    mirrorBlink: lv >= 8,
    hpBars: 4 + Math.min(3, Math.floor(t / 2)),
    hpPerBar: Math.floor(130 + lv * 20)
  }
}
/** 构建各境界突破配图路径表 */
function buildRealmFxPaths(folder) {
  const map = {}
  for (let i = 0; i < REALMS.length; i++) {
    const key = REALMS[i].fx
    if (key) map[key] = assetUrl(folder + '/' + key + '.jpg')
  }
  return map
}
/** 突破立绘（仅 V1） */
const REALM_FX_PATHS = buildRealmFxPaths('fx/realms')
const REALM_FX_KEYS = Object.keys(REALM_FX_PATHS)

/** 按已解锁境界等级取配置（大境巅峰击败境主才升大境） */
function realmByLv(lv) {
  const idx = Math.max(0, Math.min(REALMS.length - 1, (lv || 1) - 1))
  const r = REALMS[idx]
  const bodyScale = 1 + (r.majorIndex || 0) * 0.09
  return Object.assign({}, r, { lv: idx + 1, bodyScale })
}

/** 经验进度：小境界用 stageKills；巅峰境主战经验条满条 */
function realmExpProgress(kills, realmLv, stageKills) {
  const idx = Math.max(0, Math.min(REALMS.length - 1, (realmLv || 1) - 1))
  const cur = REALMS[idx]
  const hasNext = idx + 1 < REALMS.length
  const next = hasNext ? REALMS[idx + 1] : cur
  const nextName = hasNext ? next.name : '大圆满'
  if (cur.isPeak) {
    return {
      ratio: 1,
      cur: MINOR_STAGE_KILLS,
      need: MINOR_STAGE_KILLS,
      nextName: nextName,
      maxed: !hasNext,
      awaitBoss: hasNext,
      awaitMinor: false
    }
  }
  const sk = Math.max(0, stageKills || 0)
  const need = MINOR_STAGE_KILLS
  const ratio = hasNext ? Math.min(1, sk / need) : 1
  return {
    ratio: ratio,
    cur: Math.min(need, sk),
    need: need,
    nextName: nextName,
    maxed: !hasNext,
    awaitBoss: false,
    awaitMinor: hasNext && sk >= need && next.majorKey === cur.majorKey
  }
}

/** 战意/勇气满值（存档字段仍用 corpseDan，兼容旧进度） */
const WAR_INTENT_NEED = 50
const CORPSE_DAN_NEED = WAR_INTENT_NEED
/** 战斗中每秒积蓄（元婴境主战更慢，便于打很久） */
const WAR_INTENT_RATE = 6.2
const WAR_INTENT_RATE_YUAN = 3.2
const GENG_SWORD_COUNT = 72
/** 御剑上限：周身环绕与出击杀敌共用此数目 */
const MAX_SWORD_COUNT = 72

function realmMajorKey(realmLv) {
  return realmByLv(realmLv).majorKey || 'mortal'
}

function yuanyingMajorIndex() {
  return realmByLv(firstRealmLvOfMajor(YUANYING_MAJOR_KEY)).majorIndex || 0
}

function isYuanyingPlus(realmLv) {
  return (realmByLv(realmLv).majorIndex || 0) >= yuanyingMajorIndex()
}

/** 元婴之后（化神起）：怪形象不再用僵尸贴图，改为程序化异兽 */
function isAfterYuanying(realmLv) {
  return (realmByLv(realmLv).majorIndex || 0) > yuanyingMajorIndex()
}

function isYuanyingRealm(realmLv) {
  return realmMajorKey(realmLv) === YUANYING_MAJOR_KEY
}

/** 各大境界主攻方式（按技能说明；非剑修不出环剑） */
function getRealmAtkKit(majorKey) {
  const map = {
    // 剑修线
    lianqi: { primary: 'sword', orbit: true, ride: true, interval: 0.48, label: '飞剑' },
    zhuji: { primary: 'sword', orbit: true, ride: true, interval: 0.44, label: '青元剑芒' },
    jiedan: { primary: 'sword', orbit: true, ride: true, interval: 0.4, label: '剑影' },
    yuanying: { primary: 'sword', orbit: true, ride: true, interval: 0.38, label: '庚金飞剑' },
    // 非剑：主攻跟境界说明
    huashen: { primary: 'yuanci', orbit: false, ride: false, interval: 0.82, label: '元磁神光' },
    lianxu: { primary: 'void_slash', orbit: false, ride: false, interval: 0.72, label: '玄天斩气' },
    heti: { primary: 'spirit_claw', orbit: false, ride: false, interval: 0.7, label: '真灵爪' },
    dacheng: { primary: 'shiling', orbit: false, ride: false, interval: 0.88, label: '噬灵天火' },
    zhenxian: { primary: 'leihai', orbit: false, ride: false, interval: 0.62, label: '青竹雷海' },
    jinxian: { primary: 'time_silk', orbit: false, ride: false, interval: 0.78, label: '法则之丝' },
    taiyi: { primary: 'shennian', orbit: false, ride: false, interval: 0.84, label: '神念波' },
    daluo: { primary: 'origin_slash', orbit: false, ride: false, interval: 0.74, label: '本源斩' },
    daozu: { primary: 'dao_ray', orbit: false, ride: false, interval: 0.9, label: '大道法线' }
  }
  return map[majorKey] || map.lianqi
}

function realmUsesSwords(realmLv) {
  const kit = getRealmAtkKit(realmMajorKey(realmLv))
  return !!(kit && kit.primary === 'sword')
}

/** 各大境界御剑气质（仅剑修境界） */
function getRealmSwordStyle(majorKey) {
  const map = {
    lianqi: { style: 'leaf', enchant: 'fire', enchantChance: 0.35, color: '#86efac', speed: 40, dmg: 0 },
    zhuji: { style: 'wave', enchant: 'ice', enchantChance: 0.2, color: '#38bdf8', speed: 10, dmg: 1 },
    jiedan: { style: 'flame', enchant: 'fire', enchantChance: 0.4, color: '#fbbf24', speed: 20, dmg: 1 },
    yuanying: { style: 'infant', enchant: 'elec', enchantChance: 0.25, color: '#f472b6', speed: 30, dmg: 2 }
  }
  return map[majorKey] || map.lianqi
}

function getRealmCombat(realmLv) {
  const key = realmMajorKey(realmLv)
  return REALM_COMBAT_BY_MAJOR[key] || null
}

/** 大境界巅峰（及道祖）：刷唯一境主，击败后破境 */
function isGuardianCombatRealm(realmLv) {
  const r = realmByLv(realmLv)
  if (r.majorKey === 'daozu') return !!getRealmCombat(realmLv)
  return !!(r.isPeak && getRealmCombat(realmLv))
}

/** 境界说明：按人界/灵界/仙界分组，含小境界与技能 */
function buildRealmInfoList() {
  const worlds = [
    { title: '人界篇（下境界）', world: '人界' },
    { title: '灵界篇（中境界）', world: '灵界' },
    { title: '仙界篇（上境界）', world: '仙界' }
  ]
  return worlds.map((w) => {
    const items = []
    for (let i = 0; i < REALM_MAJOR_DEFS.length; i++) {
      const maj = REALM_MAJOR_DEFS[i]
      if (maj.world !== w.world) continue
      const stages = (maj.stages || []).map((s) => s.label || '本境').join('、')
      const combat = maj.combat
      items.push({
        name: maj.name,
        stages: stages,
        skills: maj.skills || '',
        short: maj.short || '',
        desc: maj.desc || '',
        tip: (combat && combat.tip) || maj.short || '',
        guardian: (combat && combat.guardianName) || ''
      })
    }
    return { title: w.title, items: items }
  })
}

/** 开发/体验版：跳境列表（各大境界首层 + 巅峰层） */
function buildRealmPickList() {
  const list = []
  let lastMajor = ''
  for (let i = 0; i < REALMS.length; i++) {
    const r = REALMS[i]
    const isFirstOfMajor = r.majorKey !== lastMajor
    if (!isFirstOfMajor && !r.isPeak) continue
    list.push({
      lv: i + 1,
      name: r.name,
      tierName: r.tierName,
      kills: r.kills
    })
    lastMajor = r.majorKey
  }
  return list
}

Page({
  data: {
    kills: 0,
    realmLv: 1,
    realmName: '凡人',
    realmMajorName: '凡人',
    realmTierName: '人界·下境界',
    realmTip: '',
    spaceUnlocked: false,
    swordCount: 1,
    wave: 1,
    hp: 48,
    maxHp: 48,
    lingQi: 80,
    maxLingQi: 80,
    spaceForce: 0,
    maxSpaceForce: SPACE_FORCE_MAX,
    heldFu: '',
    over: false,
    perfect: false,
    autoPilot: true,
    showRealmInfo: false,
    showRealmPick: false,
    showContinueGate: false,
    showChapterPick: false,
    showChapterIntro: false,
    showChapterClear: false,
    progressLoading: true,
    gameUiReady: false,
    canPickRealm: false,
    continueRealmName: '',
    continueKills: 0,
    chapterList: [],
    chapterGroups: [],
    chapterId: '',
    chapterUnit: '',
    chapterTitle: '',
    chapterModeLabel: '',
    chapterText: '',
    chapterHasNextLine: false,
    chapterGoalTip: '',
    chapterProgressTip: '',
    chapterClearSub: '',
    chapterHasNextChapter: false,
    showChapterOutro: false,
    chapterOutroText: '',
    chapterOutroHasNext: false,
    storyScene: 'ink',
    storySceneLabel: '仙途',
    storyRender: 'canvas',
    storyRenderLabel: '自研Canvas',
    storyCanvasReady: false,
    storyCanvasFailed: false,
    storyFx: 'mist',
    storyAnimKey: 0,
    storyFxOn: true,
    showStoryFight: false,
    fightFoe: '',
    fightProgress: 0,
    fightNeed: 4,
    fightHint: '',
    corpseDan: 0,
    corpseDanNeed: 50,
    realmInfoList: buildRealmInfoList(),
    realmPickList: []
  },

  onReady() {
    this._bootXian()
  },

  onUnload() {
    this._persistProgress(true)
    this._clearStoryTimers()
    if (this._bootTimer) {
      clearTimeout(this._bootTimer)
      this._bootTimer = null
    }
    this._stop()
  },

  onHide() {
    this._paused = true
    this._persistProgress(true)
  },

  onShow() {
    this._paused = false
    if (this.data.gameUiReady && !this._canvas) this._initCanvas(0)
  },

  onTouchStart(e) {
    const t = e.touches && e.touches[0]
    if (!t || this._over || this._perfect) return
    if (this.data.showRealmPick || this.data.showContinueGate || this.data.progressLoading) return
    if (this.data.showChapterPick || this.data.showChapterIntro || this.data.showChapterClear || this.data.showChapterOutro) return
    if (this._voidBlink) return
    // 凡人打坐阶段不可移动
    if (this._isMortalCultivate()) {
      this._dragging = false
      return
    }
    // 太极钮：仅切换自动/手动，按下微沉
    if (!this.data.showRealmInfo && this._hitTaiji(t.x, t.y)) {
      this._taijiPressed = true
      this._dragging = false
      this._moved = false
      return
    }
    this._dragging = true
    this._moved = false
    this._touchX = t.x
    this._touchY = t.y
    // 元婴前：连续跟手遁光；元婴后：拖动仍可遁光飞行，点按蓄满才撕裂虚空
    this._movePlayerTo(t.x, t.y)
  },

  onTouchMove(e) {
    const t = e.touches && e.touches[0]
    if (!t || this._perfect) return
    if (this._taijiPressed) return
    if (!this._dragging) return
    if (Math.abs(t.x - this._touchX) > 8 || Math.abs(t.y - this._touchY) > 8) {
      this._moved = true
    }
    this._touchX = t.x
    this._touchY = t.y
    this._movePlayerTo(t.x, t.y)
  },

  onTouchEnd(e) {
    if (this._taijiPressed) {
      this._taijiPressed = false
      this._toggleAutoByTaiji()
      return
    }
    const t = (e.changedTouches && e.changedTouches[0]) || {}
    const x = t.x != null ? t.x : this._touchX
    const y = t.y != null ? t.y : this._touchY
    if (this._dragging) {
      // 持符时点按优先扔符（未大幅拖动）
      if (this._heldFu && !this._moved && !this._isMortalCultivate()) {
        this._throwHeldFu(x, y)
      } else if (canSpaceBlink(this._realmLv) && !this._moved) {
        // 点按：优先撕裂虚空；未蓄满则仅锁定目标
        this._trySpaceBlink(x, y)
        this._tryFocusZombie(x, y)
      } else if (!this._moved) {
        if (this._heldFu && !this._isMortalCultivate()) this._throwHeldFu(x, y)
        else this._tryFocusZombie(x, y)
      }
    }
    this._dragging = false
  },

  restart() {
    // 章节模式下「再修一回」= 重试当前章；无章则回选章
    if (this._chapter) {
      this._stop()
      this._canvas = null
      this._ctx = null
      this._loopRunning = false
      this._pendingApplyProgress = null
      this._gameStarted = false
      this.setData({
        over: false,
        perfect: false,
        showRealmInfo: false,
        showRealmPick: false,
        showContinueGate: false,
        showChapterClear: false,
        progressLoading: false,
        gameUiReady: false,
        autoPilot: true
      })
      this._startChapter(this._chapter)
      return
    }
    this._persistProgress(true)
    this._stop()
    this._canvas = null
    this._ctx = null
    this._loopRunning = false
    this._pendingApplyProgress = null
    this._gameStarted = false
    this.setData({
      over: false,
      perfect: false,
      showRealmInfo: false,
      showRealmPick: false,
      showContinueGate: false,
      progressLoading: true,
      gameUiReady: false,
      autoPilot: true
    })
    this._bootXian()
  },

  toggleRealmInfo() {
    if (this.data.showRealmPick || this.data.showContinueGate || this.data.progressLoading) return
    if (this.data.showChapterPick || this.data.showChapterIntro || this.data.showChapterClear || this.data.showChapterOutro) return
    if (this.data.showRealmInfo) {
      this.closeRealmInfo()
      return
    }
    this._teardownCanvas()
    this.setData({ showRealmInfo: true })
  },

  closeRealmInfo() {
    this.setData({ showRealmInfo: false }, () => this._resumeCanvasAfterUi())
  },

  /** 开发/体验版：右上角打开跳境（不自动弹出） */
  openRealmPick() {
    if (!this.data.canPickRealm || this._over || this._perfect || this.data.showContinueGate) return
    this._teardownCanvas()
    this.setData({
      showRealmPick: true,
      showRealmInfo: false,
      realmPickList: buildRealmPickList()
    })
  },

  closeRealmPick() {
    this.setData({ showRealmPick: false }, () => this._resumeCanvasAfterUi())
  },

  /** 开发/体验版：选定境界，播突破动画后进入 */
  onPickRealm(e) {
    if (!config.isDevOrTrialEnv()) return
    const lv = Number(e.currentTarget.dataset.lv) || 1
    // 先卸画布再应用境界，避免旧帧闪一下
    this._teardownCanvas()
    this.setData({ showRealmPick: false }, () => {
      this._applyDevRealm(lv, true)
      this._resumeCanvasAfterUi()
    })
  },

  /** 再续仙途：加载上次存档（兼容旧入口；现主流程为一章一局） */
  onContinueXian() {
    this.setData({ showContinueGate: false, progressLoading: false })
    this._openChapterPick()
  },

  /** 重生凡人：清档并打开章节选择 */
  onRebirthMortal() {
    this._pendingProgress = null
    this._clearRemoteProgress()
    this._clearLocalProgress()
    this._writeChapterProgress({ cleared: [], currentId: '' })
    this.setData({ showContinueGate: false, progressLoading: false })
    this._openChapterPick()
    console.log('仙途重置章节进度')
  },

  /** 选章开局 */
  onPickChapter(e) {
    const id = e.currentTarget.dataset.id
    const unlocked = e.currentTarget.dataset.unlocked
    if (!id || unlocked === false || unlocked === 'false') {
      wx.showToast({ title: '先通前方章节', icon: 'none' })
      return
    }
    const ch = xianChapterPlay.getChapter(id)
    if (!ch) return
    this._startChapter(ch)
  },

  onChapterIntroNext() {
    const ch = this._chapter
    if (!ch) return
    if (this.data.showStoryFight) return
    if (this._storyAutoTimer) {
      clearTimeout(this._storyAutoTimer)
      this._storyAutoTimer = null
    }
    if (this._storyTyping) {
      this._finishStoryTypewriter(true)
      this._scheduleAutoAdvance(400)
      return
    }
    this._advanceChapterBeat()
  },

  /** 剧情打斗：自动/点按进攻 */
  onStoryFightTap() {
    if (!this.data.showStoryFight || this._chapterClearedLatch) return
    const need = this.data.fightNeed || 4
    let p = (this.data.fightProgress || 0) + 1
    if (p >= need) {
      if (this._storyFightTimer) {
        clearInterval(this._storyFightTimer)
        this._storyFightTimer = null
      }
      this.setData({
        fightProgress: need,
        showStoryFight: false,
        fightHint: ''
      })
      this._advanceChapterBeat()
      return
    }
    this.setData({
      fightProgress: p,
      storyFx: 'slash',
      storyAnimKey: Date.now(),
      fightHint: '交锋 ' + p + '/' + need
    })
    this._syncStoryCanvasFx('slash')
  },

  _advanceChapterBeat() {
    const ch = this._chapter
    if (!ch) return
    const beats = this._chapterBeats || xianChapterPlay.getBeats(ch)
    this._chapterLine = (this._chapterLine || 0) + 1
    if (this._chapterLine < beats.length) {
      this._playStoryBeat(beats[this._chapterLine], this._chapterLine < beats.length - 1)
      return
    }
    // Demo：全部走故事通关，不再进入旧打坐/斩尸 canvas
    this._chapterStoryDone = true
    this._playStoryOutro(() => this._onChapterCleared())
  },

  onChapterNext() {
    const next = this._chapter && this._chapter.nextId
      ? xianChapterPlay.getChapter(this._chapter.nextId)
      : null
    if (!next) {
      this._openChapterPick()
      return
    }
    this._startChapter(next)
  },

  onChapterOutroNext() {
    if (this._storyAutoTimer) {
      clearTimeout(this._storyAutoTimer)
      this._storyAutoTimer = null
    }
    const lines = (this._chapter && this._chapter.outro) || []
    this._chapterOutroLine = (this._chapterOutroLine || 0) + 1
    if (this._chapterOutroLine < lines.length) {
      this.setData({
        chapterOutroText: lines[this._chapterOutroLine],
        chapterOutroHasNext: this._chapterOutroLine < lines.length - 1
      })
      this._scheduleAutoAdvance(1800)
      return
    }
    this.setData({ showChapterOutro: false, showChapterClear: true })
  },

  onChapterRetry() {
    const ch = this._chapter
    if (!ch) {
      this._openChapterPick()
      return
    }
    this._startChapter(ch)
  },

  onChapterBackToList() {
    this._teardownCanvas()
    this._destroyStoryCanvas()
    this._clearStoryTimers()
    this._gameStarted = false
    this._chapterActive = false
    this.setData({
      showChapterClear: false,
      showChapterIntro: false,
      showChapterOutro: false,
      showStoryFight: false,
      storyCanvasReady: false,
      over: false,
      perfect: false,
      gameUiReady: false
    })
    this._openChapterPick()
  },

  /** 开发/体验版：解锁全部章节便于验收 */
  onUnlockAllChapters() {
    if (!(config.isDevOrTrialEnv && config.isDevOrTrialEnv())) return
    const allIds = xianChapterPlay.CHAPTERS.map((c) => c.id)
    this._writeChapterProgress({
      cleared: allIds,
      currentId: allIds[allIds.length - 1] || ''
    })
    wx.showToast({ title: '已解锁 ' + allIds.length + ' 章', icon: 'none' })
    this._openChapterPick()
  },

  /** 太极：点一下自动，再点一下手动 */
  _toggleAutoByTaiji() {
    if (this._over || this._perfect || this.data.showContinueGate || this.data.progressLoading) return
    this.setData({ autoPilot: !this.data.autoPilot })
  },

  /** 左下角太极热区 */
  _getTaijiRect() {
    const size = 42
    const m = 14
    const h = this._h || 500
    return {
      x: m,
      y: h - size - m - 8,
      w: size,
      h: size,
      cx: m + size / 2,
      cy: h - size / 2 - m - 8,
      r: size / 2
    }
  },

  _hitTaiji(x, y) {
    const b = this._getTaijiRect()
    const dx = x - b.cx
    const dy = y - b.cy
    return dx * dx + dy * dy <= (b.r + 4) * (b.r + 4)
  },

  /** 左下角太极：无文字；自动旋转，手动静止 */
  _drawCtrlButtons(ctx) {
    if (this._over || this._perfect || this.data.showRealmInfo || this.data.showRealmPick || this.data.showContinueGate || this.data.progressLoading || this._isMortalCultivate()) return
    const b = this._getTaijiRect()
    const img = this._taijiImg
    const auto = !!this.data.autoPilot
    const pressed = !!this._taijiPressed
    const rot = auto ? (this._animT || 0) * 1.6 : (this._taijiRestAngle || 0)
    if (auto) this._taijiRestAngle = rot

    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.beginPath()
    ctx.ellipse(b.cx, b.cy + b.r * 0.55, b.r * 0.72, b.r * 0.18, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.translate(b.cx, b.cy + (pressed ? 3 : 0))
    ctx.rotate(rot)
    const s = pressed ? 0.94 : 1
    ctx.scale(s, s)
    if (img) {
      ctx.drawImage(img, -b.w / 2, -b.h / 2, b.w, b.h)
    } else {
      ctx.beginPath()
      ctx.arc(0, 0, b.r, 0, Math.PI * 2)
      ctx.fillStyle = '#f8fafc'
      ctx.fill()
      ctx.fillStyle = '#111'
      ctx.beginPath()
      ctx.arc(0, 0, b.r, -Math.PI / 2, Math.PI / 2)
      ctx.fill()
    }
    ctx.restore()
  },

  _initCanvas(retry) {
    const tryN = retry || 0
    const soft = !!this._canvasSoftResume
    const query = wx.createSelectorQuery()
    query
      .select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          if (tryN < 12) {
            setTimeout(() => this._initCanvas(tryN + 1), 60 + tryN * 40)
            return
          }
          if (!soft) wx.showToast({ title: '画布初始化失败', icon: 'none' })
          return
        }
        // 软恢复允许重新绑定；首次初始化若已有则跳过
        if (this._canvas && !soft) return
        const canvas = res[0].node
        const width = res[0].width
        const height = res[0].height
        if (!width || !height) {
          if (tryN < 12) {
            setTimeout(() => this._initCanvas(tryN + 1), 60 + tryN * 40)
            return
          }
        }
        const dpr = wx.getSystemInfoSync().pixelRatio || 1
        canvas.width = width * dpr
        canvas.height = height * dpr
        const ctx = canvas.getContext('2d')
        // 软恢复时重新 scale 会叠加，需重置变换
        if (typeof ctx.setTransform === 'function') {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        } else {
          ctx.scale(dpr, dpr)
        }

        this._canvas = canvas
        this._ctx = ctx
        this._w = width
        this._h = height
        this._canvasSoftResume = false

        if (soft) {
          // 弹层关闭后接回画布；createImage 绑在旧 node 上，需重新拉图
          this._loadImages(() => {
            if (this._gameStarted && !this._loopRunning) this._loop()
          })
          return
        }

        this._animImgs = { idle: [], walk: [], attack: [], hurt: [], dead: [] }
        this._playerImg = null
        this._mortalMeditateImgs = []
        this._grassImg = null
        this._bossWalkImg = null
        this._bossSkillImg = null
        this._spiritSjImg = null
        this._spiritSj02Img = null
        this._realmFxImgs = {}
        this._taijiImg = null
        this._voidTearImg = null
        this._weatherStormImg = null
        this._weatherDawnImg = null
        this._helperWalkImgs = []
        this._helperSkillImgs = []
        this._mobImgs = {}
        this._mobAtkImgs = {}
        this._mobWalkImgs = {}
        this._loopRunning = false
        // 立刻铺一帧，避免长时间空白绿页
        ctx.fillStyle = '#3f6b3a'
        ctx.fillRect(0, 0, width, height)
        ctx.fillStyle = 'rgba(248,250,252,0.85)'
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('灵气汇聚中…', width * 0.5, height * 0.48)
        this._resetGame()
        if (this._pendingApplyProgress) {
          this._applySavedProgress(this._pendingApplyProgress)
          this._pendingApplyProgress = null
        } else {
          this._syncHudFromState()
        }
        this._gameStarted = true
        this._enableDevRealmBtn()
        this._loadImages(() => this._loop())
      })
  },

  /** 打开境界/跳境弹层前卸掉原生 canvas，否则弹层按钮仍会被盖住 */
  _teardownCanvas() {
    this._loopRunning = false
    if (this._raf && this._canvas) {
      try {
        this._canvas.cancelAnimationFrame(this._raf)
      } catch (e) { /* ignore */ }
    }
    this._raf = null
    this._canvas = null
    this._ctx = null
  },

  /** 关闭弹层后重新挂上 canvas，保留对局状态 */
  _resumeCanvasAfterUi() {
    if (!this.data.gameUiReady) return
    if (this.data.showRealmPick || this.data.showRealmInfo || this.data.over || this.data.perfect) return
    if (this.data.showContinueGate || this.data.progressLoading) return
    if (this.data.showChapterPick || this.data.showChapterIntro || this.data.showChapterClear || this.data.showChapterOutro) return
    this._canvasSoftResume = !!this._gameStarted
    this._initCanvas(0)
  },

  /** 仅开发/体验版显示右上角「跳境」，不自动弹窗 */
  _enableDevRealmBtn() {
    const ok = !!(config.isDevOrTrialEnv && config.isDevOrTrialEnv())
    this.setData({ canPickRealm: ok, showRealmPick: ok ? this.data.showRealmPick : false })
    console.log('仙途跳境按钮', ok ? '显示' : '隐藏(正式版)')
  },

  /**
   * 调试跳境：同步境界状态；withFx=true 时播突破动画。
   */
  _applyDevRealm(targetLv, withFx) {
    if (!config.isDevOrTrialEnv()) return
    const lv = Math.max(1, Math.min(REALMS.length, targetLv | 0))
    const r = realmByLv(lv)
    this._realmLv = lv
    this._kills = REALMS[lv - 1].kills
    this._wave = Math.max(1, 1 + Math.floor(this._kills / 12))
    this._swordCount = Math.min(MAX_SWORD_COUNT, Math.max(1, lv <= 1 ? 1 : 2 + (lv - 2) * 2))
    this._zombies = []
    this._swords = []
    this._pickups = []
    this._particles = []
    this._trails = []
    this._bolts = []
    this._gooShots = []
    this._gooPools = []
    this._groundSwords = []
    this._focusZombie = null
    this._bossActive = false
    this._bossDeferred = false
    this._bossDefeatedDeferred = false
    this._gengFx = null
    this._spiritFx = null
    this._qiVortexFx = null
    this._stageKills = 0
    this._perfect = false
    this._perfectFx = null
    this._over = false
    this._heldFu = null
    this._fuThrow = null
    this._corpseDan = 0
    this._demonCrescents = []
    this._qiAbsorb = lv <= 1 ? 0 : MORTAL_QI_NEED
    this._helper = null
    this._helperAnnounced = false
    this._maxHp = playerMaxHpByRealm(r)
    this._hp = this._maxHp
    this._maxLingQi = playerMaxLingQi(r)
    this._lingQi = this._maxLingQi
    this._spawnAcc = 0
    this._gameStarted = true
    this._ensureHelper()
    this.setData({
      showRealmPick: false,
      showRealmInfo: false,
      showContinueGate: false,
      kills: this._kills,
      realmLv: r.lv,
      realmName: r.name,
      realmMajorName: r.majorName || r.name,
      realmTierName: r.tierName,
      realmTip: (getRealmCombat(r.lv) && getRealmCombat(r.lv).tip) || r.tip || r.short || '',
      spaceUnlocked: isYuanyingPlus(r.lv),
      swordCount: this._swordCount,
      wave: this._wave,
      hp: this._hp,
      maxHp: this._maxHp,
      lingQi: this._lingQi,
      maxLingQi: this._maxLingQi,
      heldFu: '',
      over: false,
      perfect: false,
      corpseDan: 0,
      corpseDanNeed: CORPSE_DAN_NEED
    })
    if (withFx && lv > 1) {
      this._onRealmBreakthrough(r)
    } else {
      this._breakFx = null
      this._breakMute = 0
    }
    this._persistProgress(true)
    console.log('仙途调试跳境', r.name, 'lv=' + lv, 'kills=' + this._kills)
  },

  _resolveXianUserId() {
    return (wxSession.getUserId && wxSession.getUserId()) || wx.getStorageSync('hyc_user_id') || wxSession.getOpenid() || ''
  },

  _isMeaningfulProgress(p) {
    if (!p) return false
    if ((p.realmLv || 1) > 1) return true
    if ((p.kills || 0) > 0) return true
    if ((p.qiAbsorb || 0) > 0) return true
    if ((p.swordCount || 1) > 1) return true
    return false
  },

  _readLocalProgress() {
    try {
      const p = wx.getStorageSync(XIAN_PROGRESS_LOCAL_KEY)
      if (p && typeof p === 'object' && this._isMeaningfulProgress(p)) return p
    } catch (e) {}
    return null
  },

  _writeLocalProgress(payload) {
    try {
      wx.setStorageSync(XIAN_PROGRESS_LOCAL_KEY, payload)
    } catch (e) {}
  },

  _clearLocalProgress() {
    try {
      wx.removeStorageSync(XIAN_PROGRESS_LOCAL_KEY)
    } catch (e) {}
  },

  /** 进页先读档：有进度则选档，无则直接开游戏 */
  _bootXian() {
    this._pendingProgress = null
    this._pendingApplyProgress = null
    this._gameStarted = false
    this._chapterActive = false
    this.setData({
      progressLoading: true,
      showContinueGate: false,
      showChapterPick: false,
      showChapterIntro: false,
      showChapterClear: false,
      gameUiReady: false
    })
    const afterSession = () => {
      // 一章一局：启动即选章（会话仅用于后续云存档兼容）
      const ensureDone = () => {
        this.setData({ progressLoading: false })
        this._openChapterPick()
      }
      const userId = this._resolveXianUserId()
      if (!userId) {
        ensureDone()
        return
      }
      // 轻量拉一次旧档，不阻断选章
      api.getXianProgress(userId).then(() => ensureDone()).catch(() => ensureDone())
    }
    const ensure = wxSession.ensureWxSession
    if (typeof ensure === 'function' && !this._resolveXianUserId()) {
      ensure().then(afterSession).catch(() => afterSession())
    } else {
      afterSession()
    }
  },

  _readChapterProgress() {
    try {
      const raw = wx.getStorageSync(XIAN_CHAPTER_LOCAL_KEY)
      if (!raw) return { cleared: [], currentId: '' }
      if (typeof raw === 'string') {
        const o = JSON.parse(raw)
        return {
          cleared: Array.isArray(o.cleared) ? o.cleared : [],
          currentId: o.currentId || ''
        }
      }
      return {
        cleared: Array.isArray(raw.cleared) ? raw.cleared : [],
        currentId: raw.currentId || ''
      }
    } catch (e) {
      return { cleared: [], currentId: '' }
    }
  },

  _writeChapterProgress(p) {
    try {
      wx.setStorageSync(XIAN_CHAPTER_LOCAL_KEY, {
        cleared: (p && p.cleared) || [],
        currentId: (p && p.currentId) || ''
      })
    } catch (e) { /* ignore */ }
  },

  _openChapterPick() {
    this._teardownCanvas()
    this._chapterActive = false
    this._gameStarted = false
    const prog = this._readChapterProgress()
    const groups = xianChapterPlay.listChapterGroups(prog.cleared)
    const list = xianChapterPlay.listChapters(prog.cleared).map((c) => ({
      ...c,
      modeLabel: xianChapterPlay.modeLabel(c.mode),
      statusText: c.cleared ? '已通' : (c.unlocked ? '可入' : '未解锁')
    }))
    const clearedN = (prog.cleared || []).length
    const canPick = !!(config.isDevOrTrialEnv && config.isDevOrTrialEnv())
    this.setData({
      progressLoading: false,
      showContinueGate: false,
      showChapterPick: true,
      showChapterIntro: false,
      showChapterClear: false,
      showChapterOutro: false,
      gameUiReady: false,
      over: false,
      perfect: false,
      canPickRealm: canPick,
      chapterList: list,
      chapterGroups: groups,
      chapterClearSub: '已通 ' + clearedN + ' / ' + xianChapterPlay.CHAPTERS.length + ' 章'
    })
  },

  _startChapter(ch) {
    if (!ch) return
    this._clearStoryTimers()
    this._destroyStoryCanvas()
    this._chapter = ch
    this._chapterBeats = xianChapterPlay.getBeats(ch)
    this._chapterLine = 0
    this._chapterActive = true
    this._chapterKills = 0
    this._chapterElapsed = 0
    this._chapterBossDown = false
    this._chapterStoryDone = false
    this._chapterBossArmed = false
    this._chapterClearedLatch = false
    const prog = this._readChapterProgress()
    prog.currentId = ch.id
    this._writeChapterProgress(prog)
    this._teardownCanvas()
    const beats = this._chapterBeats
    const scene = xianChapterPlay.sceneForChapter(ch)
    const render = xianChapterPlay.renderOf(ch)
    const firstFx = (beats[0] && beats[0].fx) || 'mist'
    this.setData({
      showChapterPick: false,
      showChapterClear: false,
      showChapterOutro: false,
      showChapterIntro: true,
      showStoryFight: false,
      gameUiReady: false,
      over: false,
      perfect: false,
      chapterId: ch.id,
      chapterUnit: ch.unitCode || '',
      chapterTitle: ch.title || '',
      chapterModeLabel: xianChapterPlay.modeLabel(ch.mode),
      chapterText: '',
      chapterHasNextLine: beats.length > 1,
      chapterGoalTip: xianChapterPlay.goalTip(ch) + ' · ' + xianChapterPlay.renderLabel(render),
      chapterProgressTip: '',
      chapterClearSub: '',
      chapterHasNextChapter: !!ch.nextId,
      storyScene: scene,
      storySceneLabel: xianChapterPlay.sceneLabel(scene),
      storyRender: render,
      storyRenderLabel: xianChapterPlay.renderLabel(render),
      storyCanvasReady: false,
      storyCanvasFailed: false,
      storyFx: firstFx,
      storyAnimKey: Date.now(),
      storyFxOn: true,
      fightFoe: '',
      fightProgress: 0,
      fightNeed: 4,
      fightHint: ''
    }, () => {
      this._playStoryBeat(beats[0], beats.length > 1)
      this._initStoryCanvas(ch)
    })
    console.log('仙途开章(故事)', ch.unitCode, ch.title, scene, firstFx)
  },

  _clearStoryTimers() {
    if (this._storyTypeTimer) {
      clearInterval(this._storyTypeTimer)
      this._storyTypeTimer = null
    }
    if (this._storyOutroTimer) {
      clearTimeout(this._storyOutroTimer)
      this._storyOutroTimer = null
    }
    if (this._storyAutoTimer) {
      clearTimeout(this._storyAutoTimer)
      this._storyAutoTimer = null
    }
    if (this._storyFightTimer) {
      clearInterval(this._storyFightTimer)
      this._storyFightTimer = null
    }
    this._storyTyping = false
    this._storyFullText = ''
  },

  _destroyStoryCanvas() {
    if (this._storyCanvasAnim) {
      try {
        this._storyCanvasAnim.destroy()
      } catch (e) {}
      this._storyCanvasAnim = null
    }
  },

  /** 自研 Canvas：按章节 scene / beat.fx 绘制 */
  _initStoryCanvas(ch) {
    this._destroyStoryCanvas()
    this.setData({ storyCanvasReady: false, storyCanvasFailed: false })
    this._storyCanvasTries = 0
    this._mountStoryCanvas(ch)
  },

  _mountStoryCanvas(ch) {
    const chapter = ch || this._chapter
    const scene = xianChapterPlay.sceneForChapter(chapter)
    const fx = this.data.storyFx || 'mist'
    const label = (chapter && (chapter.unitCode + ' · ' + chapter.title)) || ''
    const tryMount = () => {
      this._storyCanvasTries = (this._storyCanvasTries || 0) + 1
      if (!this.data.showChapterIntro) return
      wx.createSelectorQuery()
        .select('#storyCanvasAnim')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!this.data.showChapterIntro) return
          const info = res && res[0]
          const canvas = info && info.node
          let width = info && info.width
          let height = info && info.height
          if (!canvas) {
            if (this._storyCanvasTries < 12) {
              setTimeout(tryMount, 80)
            } else {
              console.error('storyCanvasAnim 未就绪', res)
              this.setData({ storyCanvasFailed: true })
            }
            return
          }
          if (!width || !height) {
            width = width || 320
            height = height || 240
          }
          try {
            this._storyCanvasAnim = xianStoryCanvas.play(canvas, width, height, {
              scene: scene,
              fx: fx,
              label: label
            })
            this.setData({ storyCanvasReady: true, storyCanvasFailed: false })
          } catch (err) {
            console.error('自研 Canvas 初始化失败', err)
            this.setData({ storyCanvasFailed: true })
          }
        })
    }
    setTimeout(tryMount, 100)
  },

  _syncStoryCanvasFx(fx) {
    if (this._storyCanvasAnim && typeof this._storyCanvasAnim.setFx === 'function') {
      this._storyCanvasAnim.setFx(fx || 'mist')
    }
  },

  /** 剧情 beat：旁白打字机后自动续；打斗自动推进 */
  _playStoryBeat(beat, hasNext) {
    const b = beat || { text: '仙途又启。', fx: 'mist', kind: 'narrate' }
    this._clearStoryTimers()
    const text = String(b.text || '')
    const isFight = b.kind === 'fight'
    this._storyFullText = text
    this._storyTyping = !isFight
    const nextFx = b.fx || (isFight ? 'slash' : 'mist')
    this.setData({
      chapterText: isFight ? text : '',
      chapterHasNextLine: !!hasNext,
      storyFx: nextFx,
      storyAnimKey: Date.now(),
      storyFxOn: true,
      showStoryFight: !!isFight,
      fightFoe: isFight ? (b.foe || '对手') : '',
      fightProgress: 0,
      fightNeed: isFight ? Math.max(3, b.taps || 4) : 4,
      fightHint: isFight ? '交锋中…' : '自动播放'
    })
    this._syncStoryCanvasFx(nextFx)
    if (isFight) {
      this._storyTyping = false
      this._startAutoFight()
      return
    }
    let i = 0
    const step = Math.max(1, Math.ceil(text.length / 22))
    this._storyTypeTimer = setInterval(() => {
      i = Math.min(text.length, i + step)
      this.setData({ chapterText: text.slice(0, i) })
      if (i >= text.length) this._finishStoryTypewriter(false)
    }, 36)
  },

  /** 打斗自动点按推进（无需按钮） */
  _startAutoFight() {
    if (this._storyFightTimer) clearInterval(this._storyFightTimer)
    this._storyFightTimer = setInterval(() => {
      if (!this.data.showStoryFight) {
        clearInterval(this._storyFightTimer)
        this._storyFightTimer = null
        return
      }
      this.onStoryFightTap()
    }, 520)
  },

  _scheduleAutoAdvance(ms) {
    if (this._storyAutoTimer) clearTimeout(this._storyAutoTimer)
    this._storyAutoTimer = setTimeout(() => {
      this._storyAutoTimer = null
      if (this.data.showChapterIntro && !this.data.showStoryFight) {
        this._advanceChapterBeat()
      } else if (this.data.showChapterOutro) {
        this.onChapterOutroNext()
      }
    }, ms || 1600)
  },

  /** @deprecated 兼容旧调用 */
  _playStoryLine(fullText, hasNext) {
    this._playStoryBeat({ text: fullText, fx: this.data.storyFx || 'mist' }, hasNext)
  },

  _finishStoryTypewriter(forceFull) {
    if (this._storyTypeTimer) {
      clearInterval(this._storyTypeTimer)
      this._storyTypeTimer = null
    }
    this._storyTyping = false
    if (forceFull || this.data.chapterText !== this._storyFullText) {
      this.setData({ chapterText: this._storyFullText || '' })
    }
    // 旁白读完后自动进入下一段（无需点继续）
    if (!forceFull && this.data.showChapterIntro && !this.data.showStoryFight) {
      const hold = Math.min(2800, 1200 + String(this._storyFullText || '').length * 28)
      this._scheduleAutoAdvance(hold)
    }
  },

  /** 入道前短黑场（约 0.45s） */
  _playStoryOutro(done) {
    this._clearStoryTimers()
    this._destroyStoryCanvas()
    this.setData({ storyFxOn: false, showStoryFight: false })
    this._storyOutroTimer = setTimeout(() => {
      this._storyOutroTimer = null
      if (typeof done === 'function') done()
    }, 420)
  },

  /** Demo 已弃用旧 canvas 局；保留空壳防止误调 */
  _enterChapterBattle() {
    console.warn('仙途 Demo 不再进入斩尸/打坐 canvas，改为故事通关')
    this._chapterStoryDone = true
    this._onChapterCleared()
  },

  _tickChapterSession(dt) {
    if (!this._chapterActive || !this._chapter || this._chapterClearedLatch) return
    if (this.data.showChapterIntro || this.data.showChapterClear || this.data.showChapterPick || this.data.showChapterOutro) return
    this._chapterElapsed = (this._chapterElapsed || 0) + (dt || 0)

    const ch = this._chapter
    const rules = this._chapterRules || ch.rules || {}
    const bossDelay = rules.bossDelay != null ? rules.bossDelay : 2.5
    // boss 章：开局数秒后强制境主降临
    if (ch.mode === 'boss' && !this._chapterBossArmed && !this._bossActive && (this._chapterElapsed || 0) > bossDelay) {
      this._chapterBossArmed = true
      const combat = getRealmCombat(this._realmLv)
      if (combat) this._spawnRealmGuardian(combat)
    }

    // 剧情战无敌：血量被压低时回一截，避免误杀
    if (rules.invuln && (this._hp || 0) < (this._maxHp || 1) * 0.35) {
      this._hp = Math.max(this._hp || 0, (this._maxHp || 48) * 0.55)
    }

    const st = {
      kills: this._chapterKills || 0,
      qiAbsorb: this._qiAbsorb || 0,
      elapsed: this._chapterElapsed || 0,
      bossDown: !!this._chapterBossDown,
      bossActive: !!this._bossActive,
      storyDone: !!this._chapterStoryDone,
      failed: !!this._over
    }
    const tip = xianChapterPlay.progressTip(ch, st)
    if (tip && tip !== this.data.chapterProgressTip) {
      this.setData({ chapterProgressTip: tip })
    }
    if (xianChapterPlay.checkWin(ch, st) === 'cleared') {
      this._onChapterCleared()
    }
  },

  _onChapterCleared() {
    if (this._chapterClearedLatch) return
    this._chapterClearedLatch = true
    this._clearStoryTimers()
    const ch = this._chapter
    if (!ch) return
    const prog = this._readChapterProgress()
    if (prog.cleared.indexOf(ch.id) < 0) prog.cleared.push(ch.id)
    prog.currentId = ch.nextId || ch.id
    this._writeChapterProgress(prog)
    this._teardownCanvas()
    this._gameStarted = false
    const outro = ch.outro && ch.outro.length ? ch.outro : ['此间事了，再踏前路。']
    this._chapterOutroLine = 0
    this.setData({
      showChapterOutro: true,
      showChapterClear: false,
      showChapterIntro: false,
      gameUiReady: false,
      over: false,
      perfect: false,
      storyFxOn: true,
      storyScene: xianChapterPlay.sceneForChapter(ch),
      storySceneLabel: xianChapterPlay.sceneLabel(xianChapterPlay.sceneForChapter(ch)),
      chapterOutroText: outro[0],
      chapterOutroHasNext: outro.length > 1,
      chapterClearSub: '第 ' + ch.order + ' 章 · ' + (ch.unitCode || '') + ' · ' + xianChapterPlay.modeLabel(ch.mode),
      chapterHasNextChapter: !!ch.nextId,
      chapterTitle: ch.title,
      chapterUnit: ch.unitCode || ''
    })
    this._scheduleAutoAdvance(1800)
    console.log('仙途通关', ch.unitCode, ch.title)
  },

  _onChapterFailed() {
    if (!this._chapterActive || this._chapterClearedLatch) return
    this._teardownCanvas()
    this._gameStarted = false
    this.setData({
      over: true,
      gameUiReady: true,
      showChapterClear: false,
      showChapterIntro: false
    })
  },

  /** 选档结束：挂载画布并开局 */
  _enterGame(progress) {
    this._pendingApplyProgress = progress || null
    this._canvasSoftResume = false
    const canPick = !!(config.isDevOrTrialEnv && config.isDevOrTrialEnv())
    this.setData({
      showContinueGate: false,
      progressLoading: false,
      gameUiReady: true,
      canPickRealm: canPick,
      showRealmPick: false,
      showRealmInfo: false
    }, () => {
      this._canvas = null
      this._ctx = null
      this._loopRunning = false
      this._initCanvas(0)
    })
  },

  _applySavedProgress(p) {
    if (!p) return
    const lv = migrateRealmLv(p.realmLv || 1)
    const r = realmByLv(lv)
    this._realmLv = lv
    this._kills = Math.max(0, p.kills || 0)
    this._stageKills = Math.max(0, Math.min(MINOR_STAGE_KILLS - 1, p.stageKills || 0))
    this._wave = Math.max(1, p.wave || (1 + Math.floor(this._kills / 12)))
    this._swordCount = Math.min(MAX_SWORD_COUNT, Math.max(1, p.swordCount || 1))
    this._corpseDan = Math.min(WAR_INTENT_NEED - 0.01, Math.max(0, p.corpseDan || 0))
    this._qiAbsorb = Math.max(0, Math.min(MORTAL_QI_NEED, p.qiAbsorb || 0))
    this._zombies = []
    this._swords = []
    this._pickups = []
    this._bossActive = false
    this._bossDeferred = false
    this._gengFx = null
    this._breakFx = null
    this._breakMute = 0
    this._spiritFx = null
    this._qiVortexFx = null
    this._perfect = false
    this._perfectFx = null
    this._over = false
    this._helper = null
    this._helperAnnounced = false
    this._maxHp = playerMaxHpByRealm(r)
    this._hp = this._maxHp
    this._maxLingQi = playerMaxLingQi(r)
    this._lingQi = this._maxLingQi
    this._ensureHelper()
    this._syncHudFromState()
  },

  _syncHudFromState() {
    const r = realmByLv(this._realmLv || 1)
    const combat = getRealmCombat(r.lv)
    this.setData({
      kills: this._kills || 0,
      realmLv: r.lv,
      realmName: r.name,
      realmMajorName: r.majorName || r.name,
      realmTierName: r.tierName,
      realmTip: (combat && combat.tip) || r.tip || r.short || '',
      spaceUnlocked: isYuanyingPlus(r.lv),
      swordCount: this._swordCount || 1,
      wave: this._wave || 1,
      hp: this._hp,
      maxHp: this._maxHp,
      lingQi: this._lingQi,
      maxLingQi: this._maxLingQi,
      spaceForce: Math.floor(this._spaceForce || 0),
      maxSpaceForce: SPACE_FORCE_MAX,
      heldFu: (this._heldFu && this._heldFu.label) || '',
      over: !!this._over,
      perfect: !!this._perfect,
      corpseDan: this._corpseDan || 0,
      corpseDanNeed: CORPSE_DAN_NEED
    })
  },

  /** 节流写档；章节模式不写无尽主线档，只靠 hyc_xian_chapters */
  _persistProgress(force) {
    if (this._chapterActive) return
    if (!this._gameStarted || this.data.showContinueGate || this.data.progressLoading || !this.data.gameUiReady) return
    if (this._over || this._perfect) return
    const now = Date.now()
    if (!force && this._lastSaveAt && now - this._lastSaveAt < 4000) return
    const userId = this._resolveXianUserId()
    const payload = {
      userId: userId || 'local',
      realmLv: this._realmLv || 1,
      kills: this._kills || 0,
      stageKills: this._stageKills || 0,
      swordCount: this._swordCount || 1,
      wave: this._wave || 1,
      corpseDan: this._corpseDan || 0,
      qiAbsorb: Math.floor(this._qiAbsorb || 0)
    }
    this._lastSaveAt = now
    this._writeLocalProgress(payload)
    if (!userId) return
    payload.userId = userId
    api.saveXianProgress(payload).then(() => {
      console.log('仙途已存档', payload.realmLv, payload.kills)
    }).catch((err) => {
      console.warn('仙途存档失败', err && err.message)
    })
  },

  _clearRemoteProgress() {
    const userId = this._resolveXianUserId()
    if (!userId) return
    api.clearXianProgress(userId).catch((err) => {
      console.warn('仙途清档失败', err && err.message)
    })
  },

  _loadImages(done) {
    const canvas = this._canvas
    if (!canvas) return
    const animKeys = Object.keys(ANIM_DEFS)
    const realmFxKeys = REALM_FX_KEYS
    const mobKeys = MOB_LOAD_KEYS
    // 玩家+凡人打坐4+草地1+劫尸2+精神2+太极+虚空裂隙+天气2+帮手+境界突破图+怪物立绘(走姿2+攻+闲)
    let left = 1 + MORTAL_MEDITATE_PATHS.length + 1 + 2 + 2 + 1 + 1 + 2 + HELPER_WALK_PATHS.length + HELPER_SKILL_PATHS.length + realmFxKeys.length + mobKeys.length * 4
    for (let k = 0; k < animKeys.length; k++) left += ANIM_DEFS[animKeys[k]].paths.length

    const animImgs = { idle: [], walk: [], attack: [], hurt: [], dead: [] }
    let playerImg = null
    const mortalMeditateImgs = new Array(MORTAL_MEDITATE_PATHS.length)
    let grassImg = null
    let bossWalkImg = null
    let bossSkillImg = null
    let spiritSjImg = null
    let spiritSj02Img = null
    let taijiImg = null
    let voidTearImg = null
    let weatherStormImg = null
    let weatherDawnImg = null
    const realmFxImgs = {}
    const helperWalkImgs = new Array(HELPER_WALK_PATHS.length)
    const helperSkillImgs = new Array(HELPER_SKILL_PATHS.length)
    const mobImgs = {}
    const mobAtkImgs = {}
    const mobWalkImgs = {}

    let bootStarted = false
    const BOOT_FORCE_MS = 6000
    // 微信同时拉太多远程图会报 Error: timeout，限流即可
    const MAX_PARALLEL = 4
    const queue = []
    let active = 0

    const applyLive = () => {
      this._animImgs = animImgs
      this._playerImg = playerImg
      this._mortalMeditateImgs = mortalMeditateImgs
      this._grassImg = grassImg
      this._bossWalkImg = bossWalkImg
      this._bossSkillImg = bossSkillImg
      this._spiritSjImg = spiritSjImg
      this._spiritSj02Img = spiritSj02Img
      this._realmFxImgs = realmFxImgs
      this._taijiImg = taijiImg
      this._voidTearImg = voidTearImg
      this._weatherStormImg = weatherStormImg
      this._weatherDawnImg = weatherDawnImg
      this._helperWalkImgs = helperWalkImgs
      this._helperSkillImgs = helperSkillImgs
      this._mobImgs = mobImgs
      this._mobAtkImgs = mobAtkImgs
      this._mobWalkImgs = mobWalkImgs
    }

    // 凡人开局需要草地 + 至少一帧打坐
    const coreReady = () => !!(grassImg && mortalMeditateImgs[0])

    const startBoot = (reason) => {
      if (bootStarted) return
      bootStarted = true
      if (this._bootTimer) {
        clearTimeout(this._bootTimer)
        this._bootTimer = null
      }
      applyLive()
      this.setData({ hp: Math.ceil(this._hp), maxHp: this._maxHp })
      if (done) done()
    }

    const onOneDone = () => {
      left -= 1
      applyLive()
      if (coreReady()) startBoot('core')
      if (left <= 0) {
        startBoot('all')
        if (!playerImg || !grassImg) {
          console.warn('仙途资源未就绪', ASSET_BASE)
          wx.showToast({ title: '部分资源加载失败', icon: 'none', duration: 2000 })
        }
      }
      pump()
    }

    const pump = () => {
      while (active < MAX_PARALLEL && queue.length) {
        const job = queue.shift()
        active += 1
        const img = canvas.createImage()
        let settled = false
        const settle = (ok) => {
          if (settled) return
          settled = true
          active -= 1
          if (ok) job.onOk(img)
          onOneDone()
        }
        img.onload = () => settle(true)
        img.onerror = () => {
          console.warn('资源加载失败', job.src)
          settle(false)
        }
        try {
          img.src = job.src
        } catch (e) {
          settle(false)
        }
      }
    }

    const loadOne = (src, onOk) => {
      queue.push({ src: src, onOk: onOk })
      pump()
    }

    this._bootTimer = setTimeout(() => startBoot('timeout'), BOOT_FORCE_MS)

    // 优先队列：开局必需 → 常用 → 其余
    loadOne(GRASS_PATH, (img) => { grassImg = img })
    for (let i = 0; i < MORTAL_MEDITATE_PATHS.length; i++) {
      loadOne(MORTAL_MEDITATE_PATHS[i], ((ii) => (img) => { mortalMeditateImgs[ii] = img })(i))
    }
    loadOne(PLAYER_PATH, (img) => { playerImg = img })
    loadOne(TAIJI_PATH, (img) => { taijiImg = img })
    loadOne(VOID_TEAR_PATH, (img) => { voidTearImg = img })
    loadOne(WEATHER_STORM_PATH, (img) => { weatherStormImg = img })
    loadOne(WEATHER_DAWN_PATH, (img) => { weatherDawnImg = img })
    loadOne(BOSS_WALK_PATH, (img) => { bossWalkImg = img })
    loadOne(BOSS_SKILL_PATH, (img) => { bossSkillImg = img })
    loadOne(SPIRIT_SJ_PATH, (img) => { spiritSjImg = img })
    loadOne(SPIRIT_SJ02_PATH, (img) => { spiritSj02Img = img })
    for (let k = 0; k < animKeys.length; k++) {
      const key = animKeys[k]
      const paths = ANIM_DEFS[key].paths
      animImgs[key] = new Array(paths.length)
      for (let i = 0; i < paths.length; i++) {
        loadOne(paths[i], ((kk, ii) => (img) => { animImgs[kk][ii] = img })(key, i))
      }
    }
    for (let i = 0; i < realmFxKeys.length; i++) {
      const fk = realmFxKeys[i]
      loadOne(REALM_FX_PATHS[fk], ((key) => (img) => { realmFxImgs[key] = img })(fk))
    }
    for (let i = 0; i < HELPER_WALK_PATHS.length; i++) {
      loadOne(HELPER_WALK_PATHS[i], ((ii) => (img) => { helperWalkImgs[ii] = img })(i))
    }
    for (let i = 0; i < HELPER_SKILL_PATHS.length; i++) {
      loadOne(HELPER_SKILL_PATHS[i], ((ii) => (img) => { helperSkillImgs[ii] = img })(i))
    }
    for (let i = 0; i < mobKeys.length; i++) {
      const mk = mobKeys[i]
      const def = monsterDef(mk)
      mobWalkImgs[mk] = []
      loadOne(def.art, ((key) => (img) => { mobImgs[key] = img })(mk))
      loadOne(def.artAtk || def.art, ((key) => (img) => { mobAtkImgs[key] = img })(mk))
      const walks = def.artWalk || []
      for (let wi = 0; wi < 2; wi++) {
        const src = walks[wi] || def.art
        loadOne(src, ((key, idx) => (img) => { mobWalkImgs[key][idx] = img })(mk, wi))
      }
    }
  },

  /** 取目标境界的突破配图 */
  _realmFxImage(realm) {
    const key = realm && realm.fx
    if (key && this._realmFxImgs && this._realmFxImgs[key]) return this._realmFxImgs[key]
    return this._spiritSjImg
  },

  /** 是否处于凡人吸纳灵气阶段（未开始打怪） */
  _isMortalCultivate() {
    return (this._realmLv || 1) <= 1 && !this._spiritFx && !this._breakFx
  },

  _resetGame() {
    const w = this._w || 300
    const h = this._h || 500
    this._margin = 28
    this._playerX = w * 0.5
    this._playerY = h * 0.72
    this._prevPlayerX = this._playerX
    this._prevPlayerY = this._playerY
    this._zombies = []
    this._swords = []
    this._realmShots = []
    this._pickups = []
    this._particles = []
    this._trails = []
    this._bolts = []
    this._groundSwords = []
    this._scenery = this._buildScenery(w, h)
    this._focusZombie = null
    this._nextZid = 1
    this._kills = 0
    this._wave = 1
    this._swordCount = 1
    this._spawnAcc = 0
    this._pickupAcc = 0
    this._swordAcc = 0
    this._lootAcc = 0
    this._groundSwordAcc = 3 + Math.random() * 4
    this._lightningAcc = 0
    this._animT = 0
    this._over = false
    this._perfect = false
    this._perfectFx = null
    this._lastTs = 0
    this._raf = null
    this._breakFx = null
    this._breakMute = 0
    this._realmLv = 1
    this._qiAbsorb = 0
    this._mortalHandAcc = 0
    this._freezeT = 0
    this._playerHurtT = 0
    this._swordEnchant = null
    this._heldFu = null
    this._fuThrow = null
    this._playerHideT = 0
    this._stillAcc = 0
    this._meditating = false
    this._lingQiWarnT = 0
    this._corpseDan = 0
    this._gengFx = null
    this._bossActive = false
    this._bossDeferred = false
    this._bossDefeatedDeferred = false
    this._gooShots = []
    this._gooPools = []
    this._demonCrescents = []
    this._enemySwords = []
    this._fireballs = []
    this._insectFx = []
    this._realmAuxAcc = 0
    this._qingyuanShield = 0
    this._spiritFx = null
    this._taijiPressed = false
    this._taijiRestAngle = 0
    this._helper = null
    this._helperAnnounced = false
    this._blinkCd = 0
    this._blinkFx = null
    this._voidBlink = null
    this._spaceForce = 0
    this._spaceForceWarnT = 0
    this._autoBlinkAcc = 0
    const r0 = realmByLv(1)
    this._maxHp = playerMaxHpByRealm(r0)
    this._hp = this._maxHp
    this._maxLingQi = playerMaxLingQi(r0)
    this._lingQi = this._maxLingQi
  },

  /** 山峰 / 河流 / 湖泊（装饰层，不挡碰撞） */
  _buildScenery(w, h) {
    return {
      mountains: [
        { x: w * 0.08, baseY: 118, peaks: [[0, 70], [38, 28], [72, 78], [110, 40], [150, 85]] },
        { x: w * 0.55, baseY: 105, peaks: [[0, 62], [45, 22], [88, 70], [130, 36], [168, 78]] }
      ],
      lakes: [
        { x: w * 0.72, y: h * 0.42, rx: 52, ry: 30 },
        { x: w * 0.22, y: h * 0.58, rx: 40, ry: 24 }
      ],
      river: [
        { x: w * 0.02, y: h * 0.32 },
        { x: w * 0.18, y: h * 0.38 },
        { x: w * 0.35, y: h * 0.34 },
        { x: w * 0.5, y: h * 0.44 },
        { x: w * 0.68, y: h * 0.4 },
        { x: w * 0.9, y: h * 0.5 },
        { x: w * 1.02, y: h * 0.48 }
      ]
    }
  },

  /**
   * 背景图上半是山/树，下半才是可玩草地。
   * 僵尸只落在此矩形内，避免出现在山上/树上。
   */
  _grassRect() {
    const w = this._w || 300
    const h = this._h || 500
    const m = this._margin || 28
    return {
      minX: m,
      maxX: w - m,
      // 约画面中部以下为草地（树线之下）
      minY: Math.floor(h * 0.48),
      maxY: h - m
    }
  },

  /** pad：实体半宽，避免大体型角色中心贴边时身子画出屏幕 */
  _clampToGrass(x, y, pad) {
    const g = this._grassRect()
    const p = Math.max(0, pad || 0)
    return {
      x: Math.max(g.minX + p, Math.min(g.maxX - p, x)),
      y: Math.max(g.minY + p, Math.min(g.maxY - p, y))
    }
  },

  /** 每帧校正主角落点（瞬移目标未钳制时兜底） */
  _ensurePlayerInBounds() {
    if (this._voidBlink) return
    const pad = 18
    const g = this._clampToGrass(this._playerX, this._playerY, pad)
    this._playerX = g.x
    this._playerY = g.y
  },

  /** 草地上随机出土点（远离玩家） */
  _spawnPointOnGrass() {
    const g = this._grassRect()
    let best = null
    let bestD = -1
    for (let i = 0; i < 6; i++) {
      const p = this._clampToGrass(
        g.minX + Math.random() * (g.maxX - g.minX),
        g.minY + Math.random() * (g.maxY - g.minY)
      )
      const dx = p.x - this._playerX
      const dy = p.y - this._playerY
      const d = dx * dx + dy * dy
      if (d > bestD) {
        bestD = d
        best = p
      }
    }
    return best || {
      x: g.minX + Math.random() * (g.maxX - g.minX),
      y: g.minY + Math.random() * (g.maxY - g.minY)
    }
  },

  _stop() {
    this._over = true
    this._loopRunning = false
    if (this._bootTimer) {
      clearTimeout(this._bootTimer)
      this._bootTimer = null
    }
    if (this._raf && this._canvas) {
      this._canvas.cancelAnimationFrame(this._raf)
      this._raf = null
    }
  },

  /** 全地图行走，限制在草地区域（不上山/树） */
  _movePlayerTo(x, y) {
    const g = this._clampToGrass(x, y == null ? this._playerY : y, 18)
    this._playerX = g.x
    if (y != null) this._playerY = g.y
  },

  /** 元婴后：空间之力蓄满 → 撕裂虚空顺移 */
  _trySpaceBlink(x, y) {
    if (!canSpaceBlink(this._realmLv)) return false
    if (this._voidBlink || this._gengFx || this._spiritFx || this._breakFx || this._qiVortexFx) return false
    if ((this._spaceForce || 0) < SPACE_FORCE_MAX - 0.5) {
      if ((this._spaceForceWarnT || 0) <= 0) {
        this._spaceForceWarnT = 1.4
        wx.showToast({ title: '空间之力未满', icon: 'none', duration: 1200 })
      }
      return false
    }
    const g = this._grassRect()
    const tx = Math.max(g.minX + 18, Math.min(g.maxX - 18, x))
    const ty = Math.max(g.minY + 18, Math.min(g.maxY - 18, y == null ? this._playerY : y))
    const dx = tx - this._playerX
    const dy = ty - this._playerY
    if (dx * dx + dy * dy < 36 * 36) return false
    const fromX = this._playerX
    const fromY = this._playerY
    const realm = realmByLv(this._realmLv)
    this._spaceForce = 0
    this.setData({ spaceForce: 0, maxSpaceForce: SPACE_FORCE_MAX })
    this._startVoidBlink(fromX, fromY, tx, ty, realm)
    return true
  },

  /** 撕裂虚空：原地裂开飞入 → 远处裂开飞出 */
  _startVoidBlink(fx, fy, tx, ty, realm) {
    // 起终点一律钳在草地内，避免躲伤 hop 飞出屏幕外
    const from = this._clampToGrass(fx, fy, 18)
    const to = this._clampToGrass(tx, ty, 18)
    this._voidBlink = {
      t: 0,
      dur: VOID_BLINK_DUR,
      fx: from.x,
      fy: from.y,
      tx: to.x,
      ty: to.y,
      color: (realm && realm.color) || '#67e8f9',
      arrived: false,
      hidden: false
    }
    this._blinkFx = null
    // 起裂粒子
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.2
      const s = 30 + Math.random() * 80
      this._particles.push({
        x: from.x, y: from.y - 8,
        vx: Math.cos(a) * s * 0.35,
        vy: Math.sin(a) * s,
        life: 0.35 + Math.random() * 0.25,
        color: i % 2 ? '#67e8f9' : '#e0f2fe'
      })
    }
    console.log('仙途撕裂虚空', Math.round(from.x), Math.round(from.y), '→', Math.round(to.x), Math.round(to.y))
  },

  _updateVoidBlink(dt) {
    const vb = this._voidBlink
    if (!vb) return
    vb.t += dt
    const t = vb.t
    // 飞入缝中后瞬移到目标点并隐身
    if (t >= 0.58 && !vb.arrived) {
      vb.arrived = true
      vb.hidden = true
      const landed = this._clampToGrass(vb.tx, vb.ty, 18)
      vb.tx = landed.x
      vb.ty = landed.y
      this._playerX = landed.x
      this._playerY = landed.y
      this._prevPlayerX = landed.x
      this._prevPlayerY = landed.y
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2
        const s = 35 + Math.random() * 70
        this._particles.push({
          x: vb.tx, y: vb.ty - 10,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 0.3 + Math.random() * 0.25,
          color: '#a5f3fc'
        })
      }
    }
    // 出口飞出时现身
    if (t >= 1.12) vb.hidden = false
    if (t >= vb.dur) this._voidBlink = null
  },

  /** 演出中人物绘制偏移（飞入/飞出缝隙） */
  _voidBlinkDrawPose() {
    const vb = this._voidBlink
    if (!vb) return { x: this._playerX, y: this._playerY, alpha: 1, hide: false }
    const t = vb.t
    if (t < 0.28) {
      return { x: this._playerX, y: this._playerY, alpha: 1, hide: false }
    }
    if (t < 0.58) {
      const u = (t - 0.28) / 0.3
      const e = u * u
      return {
        x: vb.fx + (0 - 0) * e,
        y: vb.fy - 8 - e * 18,
        alpha: 1 - e * 0.95,
        hide: false,
        suckX: vb.fx,
        suckY: vb.fy - 10,
        suckU: e
      }
    }
    if (t < 1.12) {
      return { x: vb.tx, y: vb.ty, alpha: 0, hide: true }
    }
    if (t < 1.45) {
      const u = (t - 1.12) / 0.33
      const e = 1 - Math.pow(1 - u, 2)
      return {
        x: vb.tx,
        y: vb.ty - 16 + e * 16,
        alpha: Math.min(1, e * 1.2),
        hide: false,
        emergeU: e
      }
    }
    return { x: this._playerX, y: this._playerY, alpha: 1, hide: false }
  },

  /** 兼容遁地符等旧裂空粒子 */
  _spawnBlinkFx(fx, fy, tx, ty, realm) {
    const color = (realm && realm.color) || '#f472b6'
    this._blinkFx = { t: 0, dur: 0.32, fx: fx, fy: fy, tx: tx, ty: ty, color: color }
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 40 + Math.random() * 90
      this._particles.push({
        x: fx, y: fy, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.28 + Math.random() * 0.2, color: color
      })
      this._particles.push({
        x: tx, y: ty, vx: Math.cos(a + 1) * s * 0.7, vy: Math.sin(a + 1) * s * 0.7,
        life: 0.28 + Math.random() * 0.2, color: '#fce7f3'
      })
    }
  },

  _voidTearOpenAmount(t) {
    if (t < 0.28) return Math.min(1, t / 0.28)
    if (t < 0.55) return 1
    if (t < 0.85) return Math.max(0, 1 - (t - 0.55) / 0.3)
    if (t < 1.15) return Math.min(1, (t - 0.85) / 0.3)
    if (t < 1.45) return 1
    if (t < VOID_BLINK_DUR) return Math.max(0, 1 - (t - 1.45) / Math.max(0.01, VOID_BLINK_DUR - 1.45))
    return 0
  },

  _voidTearActivePos(vb) {
    if (vb.t < 0.85) return { x: vb.fx, y: vb.fy - 12 }
    return { x: vb.tx, y: vb.ty - 12 }
  },

  _drawVoidTear(ctx, vb) {
    const open = this._voidTearOpenAmount(vb.t)
    if (open <= 0.02) return
    const pos = this._voidTearActivePos(vb)
    const img = this._voidTearImg
    const h = 130 + open * 36
    const w = 8 + open * 48
    ctx.save()
    ctx.translate(pos.x, pos.y)
    // 青白辉光
    ctx.globalAlpha = 0.4 * open
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, h * 0.6)
    glow.addColorStop(0, 'rgba(165,243,252,0.65)')
    glow.addColorStop(1, 'rgba(103,232,249,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.ellipse(0, 0, w * 1.1, h * 0.58, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.97 * Math.min(1, open * 1.3)
    if (img) {
      ctx.drawImage(img, -w / 2, -h / 2, w, h)
    } else {
      // 无立绘时程序化锯齿裂隙（贴合参考图观感）
      ctx.beginPath()
      const segs = 9
      ctx.moveTo(0, -h / 2)
      for (let i = 1; i <= segs; i++) {
        const yy = -h / 2 + (h * i) / segs
        const jagged = (i % 2 === 0 ? 1 : -1) * w * (0.35 + (i % 3) * 0.08)
        ctx.lineTo(jagged, yy)
      }
      for (let i = segs - 1; i >= 0; i--) {
        const yy = -h / 2 + (h * i) / segs
        const jagged = (i % 2 === 0 ? -1 : 1) * w * (0.32 + (i % 3) * 0.07)
        ctx.lineTo(jagged, yy)
      }
      ctx.closePath()
      ctx.fillStyle = '#030303'
      ctx.fill()
      ctx.strokeStyle = 'rgba(186,230,253,0.95)'
      ctx.lineWidth = 1.8
      ctx.stroke()
      // 内缘淡青描边
      ctx.strokeStyle = 'rgba(103,232,249,0.55)'
      ctx.lineWidth = 3
      ctx.stroke()
    }
    // 外延细裂
    ctx.globalAlpha = 0.5 * open
    ctx.strokeStyle = 'rgba(148,163,184,0.85)'
    ctx.lineWidth = 1
    for (let i = 0; i < 6; i++) {
      const side = i % 2 === 0 ? 1 : -1
      const yy = -h * 0.32 + i * h * 0.12
      ctx.beginPath()
      ctx.moveTo(side * w * 0.28, yy)
      ctx.quadraticCurveTo(side * (w * 0.7 + 6), yy + 2, side * (w * 0.9 + 14 + open * 8), yy + (i - 2) * 5)
      ctx.stroke()
    }
    ctx.restore()
  },

  /**
   * 凡人打坐：吸纳天地灵气；风雨雷电随修炼进度变化（无僵尸出土）
   */
  _updateMortalCultivate(dt, realm) {
    if (this._breakMute > 0) {
      this._breakMute = Math.max(0, this._breakMute - dt)
    }
    // 固定打坐位置（画面偏中下）
    const seat = this._clampToGrass(this._w * 0.5, this._h * 0.62)
    this._playerX = seat.x
    this._playerY = seat.y
    this._prevPlayerX = seat.x
    this._prevPlayerY = seat.y

    // 确保场上无僵尸手/怪
    if (this._zombies && this._zombies.length) this._zombies = []

    // 灵气入体
    const before = this._qiAbsorb || 0
    this._qiAbsorb = Math.min(MORTAL_QI_NEED, before + MORTAL_QI_RATE * dt)
    this._spawnQiParticles(dt)
    this._updateMortalWeather(dt)

    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i]
      p.life -= dt
      p.x += (p.vx || 0) * dt
      p.y += (p.vy || 0) * dt
      if (p.life <= 0) this._particles.splice(i, 1)
    }

    if (this._qiAbsorb >= MORTAL_QI_NEED) {
      // 一章一局：禁止凡人破境链；打坐章由 tick / 此处通关
      if (this._chapterActive) {
        if (this._chapter && this._chapter.win && this._chapter.win.type === 'cultivate') {
          this._onChapterCleared()
        }
        return
      }
      this._startMortalBreakthrough()
    }
  },

  /** 凡人打坐天气：静 → 风 → 雨 → 雷暴 → 破晓 */
  _updateMortalWeather(dt) {
    const ratio = Math.min(1, (this._qiAbsorb || 0) / MORTAL_QI_NEED)
    if (!this._mortalWeather) {
      this._mortalWeather = {
        rain: [],
        wind: [],
        flash: 0,
        bolt: null,
        boltCd: 2.5
      }
    }
    const w = this._mortalWeather
    w.flash = Math.max(0, (w.flash || 0) - dt)

    // 风粒子
    const windNeed = ratio < 0.2 ? 4 : (ratio < 0.45 ? 10 : 16)
    while (w.wind.length < windNeed) {
      w.wind.push({
        x: Math.random() * (this._w || 300),
        y: 20 + Math.random() * (this._h || 500) * 0.55,
        len: 18 + Math.random() * 36,
        spd: 80 + Math.random() * 120 + ratio * 80,
        life: 0.4 + Math.random() * 0.6
      })
    }
    for (let i = w.wind.length - 1; i >= 0; i--) {
      const p = w.wind[i]
      p.x += p.spd * dt
      p.y += (Math.sin((this._animT || 0) * 3 + i) * 12) * dt
      p.life -= dt
      if (p.life <= 0 || p.x > (this._w || 300) + 40) w.wind.splice(i, 1)
    }

    // 雨滴（进度过半起）
    if (ratio >= 0.35) {
      const rainNeed = Math.floor(18 + ratio * 55)
      while (w.rain.length < rainNeed) {
        w.rain.push({
          x: Math.random() * ((this._w || 300) + 40) - 20,
          y: Math.random() * (this._h || 500) * 0.7,
          len: 8 + Math.random() * 14,
          spd: 280 + Math.random() * 220 + ratio * 160
        })
      }
    }
    for (let i = w.rain.length - 1; i >= 0; i--) {
      const r = w.rain[i]
      r.y += r.spd * dt
      r.x += (40 + ratio * 50) * dt
      if (r.y > (this._h || 500) * 0.85) {
        if (ratio >= 0.35) {
          r.y = -10 - Math.random() * 40
          r.x = Math.random() * ((this._w || 300) + 40) - 20
        } else {
          w.rain.splice(i, 1)
        }
      }
    }

    // 雷电（进度过 0.62）
    if (ratio >= 0.62) {
      w.boltCd = (w.boltCd || 0) - dt
      if (w.boltCd <= 0) {
        w.boltCd = 1.6 + Math.random() * 2.4 - ratio * 0.8
        w.flash = 0.12 + Math.random() * 0.1
        const bx = (this._w || 300) * (0.2 + Math.random() * 0.6)
        w.bolt = {
          x: bx,
          life: 0.28,
          segs: this._makeLightningPath(bx, 8, (this._h || 500) * 0.42)
        }
      }
    }
    if (w.bolt) {
      w.bolt.life -= dt
      if (w.bolt.life <= 0) w.bolt = null
    }
  },

  _makeLightningPath(x0, y0, y1) {
    const segs = [{ x: x0, y: y0 }]
    let x = x0
    let y = y0
    const steps = 7 + Math.floor(Math.random() * 4)
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      x += (Math.random() - 0.5) * 36
      y = y0 + (y1 - y0) * t
      segs.push({ x: x, y: y })
    }
    return segs
  },

  /** 天地灵气粒子汇聚入丹田 */
  _spawnQiParticles(dt) {
    const px = this._playerX
    const py = this._playerY - 8
    const n = Math.random() < 0.85 ? 2 : 1
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2
      const dist = 48 + Math.random() * 90
      const x = px + Math.cos(ang) * dist
      const y = py + Math.sin(ang) * dist * 0.65
      this._particles.push({
        x: x,
        y: y,
        vx: (px - x) * (1.1 + Math.random() * 0.8),
        vy: (py - y) * (1.1 + Math.random() * 0.8),
        life: 0.55 + Math.random() * 0.35,
        color: Math.random() < 0.45 ? '#67e8f9' : (Math.random() < 0.5 ? '#a5f3fc' : '#e0f2fe')
      })
    }
    // 丹田漩涡点
    if (Math.random() < 0.5) {
      const a = this._animT * 4 + Math.random()
      this._particles.push({
        x: px + Math.cos(a) * 14,
        y: py + 6 + Math.sin(a) * 8,
        vx: -Math.sin(a) * 18,
        vy: Math.cos(a) * 12,
        life: 0.4,
        color: '#22d3ee'
      })
    }
  },

  /** 灵气足够：进入精神领域，突破至炼气，开始斩尸 */
  _startMortalBreakthrough() {
    if (this._spiritFx || this._breakFx) return
    this._qiAbsorb = MORTAL_QI_NEED
    this._zombies = []
    this._swords = []
    this._focusZombie = null
    this._mortalWeather = null
    this._breakMute = 12
    this._ensureSpiritImages()
    const nextLv = firstRealmLvOfMajor('lianqi')
    const nr = realmByLv(nextLv)
    this._spiritFx = {
      t: 0,
      nextLv: nextLv,
      realm: nr,
      sjDur: 1.8,
      sj02Dur: 2.0,
      // 化光：落线 → 入心 → 涟漪，略加长方便看清
      absorbDur: 2.1
    }
    console.log('凡人灵气圆满，突破炼气', {
      sj: !!this._spiritSjImg,
      next: nr.name
    })
  },

  /**
   * 自动御剑：元婴前连续飞；元婴后顺移穿梭
   */
  _updateAutoPilot(dt) {
    if (!this.data.autoPilot || this._dragging || this._over || this._perfect || this._perfectFx) return
    if (this._gengFx || this._spiritFx || this._breakFx || this._qiVortexFx) return

    const px = this._playerX || 0
    const py = this._playerY || 0
    // 挂实例上，避免大文件压缩后局部变量丢失导致 ReferenceError
    this._apMoveX = 0
    this._apMoveY = 0

    if (this._heldFu && !this._fuThrow) {
      this._autoFuAcc = (this._autoFuAcc || 0) + dt
      if (this._autoFuAcc >= 0.55) {
        const z = this._nearestReadyZombie(px, py, null)
        if (z) {
          this._autoFuAcc = 0
          this._throwHeldFu(z.x, z.y - (z.floatY || 0))
        }
      }
    } else {
      this._autoFuAcc = 0
    }

    const dangerR = 100
    const zombies = this._zombies || []
    for (let i = 0; i < zombies.length; i++) {
      const z = zombies[i]
      if (!z || z.state === 'dead' || (z.emerge || 0) < 0.5) continue
      const dx = px - z.x
      const dy = py - (z.y - (z.floatY || 0))
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      if (d < dangerR) {
        const w = (dangerR - d) / dangerR
        this._apMoveX += (dx / d) * w * 2.4
        this._apMoveY += (dy / d) * w * 2.4
      }
    }

    let crescentThreat = false
    const crescents = this._demonCrescents || []
    for (let i = 0; i < crescents.length; i++) {
      const c = crescents[i]
      if (!c || c.mode !== 'attack') continue
      const dx = px - c.x
      const dy = py - c.y
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      if (d < 140) {
        const w = (140 - d) / 140
        this._apMoveX += (dx / d) * w * 3.2
        this._apMoveY += (dy / d) * w * 3.2
        if (d < 70) crescentThreat = true
      }
    }

    const fleeForce = this._apMoveX * this._apMoveX + this._apMoveY * this._apMoveY
    if (fleeForce < 0.55) {
      const loot = this._autoPilotLootTarget()
      if (loot) {
        const dx = loot.x - px
        const dy = loot.y - py
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        this._apMoveX += (dx / d) * 1.15
        this._apMoveY += (dy / d) * 1.15
      }
    }

    const len = Math.sqrt(this._apMoveX * this._apMoveX + this._apMoveY * this._apMoveY)
    if (len < 0.08) return
    const nx = this._apMoveX / len
    const ny = this._apMoveY / len

    if (canSpaceBlink(this._realmLv)) {
      if (this._voidBlink) return
      const speed = 165 + Math.min(50, (this._realmLv || 1) * 4)
      this._movePlayerTo(px + nx * speed * dt, py + ny * speed * dt)
      const forceFull = (this._spaceForce || 0) >= SPACE_FORCE_MAX - 0.5
      if (forceFull && (crescentThreat || fleeForce > 1.2)) {
        this._autoBlinkAcc = (this._autoBlinkAcc || 0) + dt
        const gap = crescentThreat ? 0.85 : VOID_AUTO_GAP
        if (this._autoBlinkAcc >= gap) {
          this._autoBlinkAcc = 0
          const hop = 110 + Math.min(80, (this._realmLv || 1) * 5)
          this._trySpaceBlink(px + nx * hop, py + ny * hop)
        }
      } else if (forceFull) {
        this._autoBlinkAcc = (this._autoBlinkAcc || 0) + dt
        if (this._autoBlinkAcc >= VOID_AUTO_GAP) {
          this._autoBlinkAcc = 0
          const hop = 100 + Math.min(70, (this._realmLv || 1) * 5)
          this._trySpaceBlink(px + nx * hop, py + ny * hop)
        }
      }
      return
    }

    const speed = 155 + Math.min(40, (this._realmLv || 1) * 3)
    this._movePlayerTo(px + nx * speed * dt, py + ny * speed * dt)
  },

  /** 自动飞行要去捡的掉落：低血/低灵优先丹药灵石，其次符箓与出土剑 */
  _autoPilotLootTarget() {
    const needHp = this._hp < this._maxHp * 0.55
    const needQi = this._lingQi < this._maxLingQi * 0.45
    let best = null
    let bestScore = -1e12

    const consider = (x, y, scoreBonus) => {
      const dx = x - this._playerX
      const dy = y - this._playerY
      const d = Math.sqrt(dx * dx + dy * dy)
      let score = 800 - d + (scoreBonus || 0)
      for (let zi = 0; zi < this._zombies.length; zi++) {
        const z = this._zombies[zi]
        if (z.state === 'dead') continue
        const zx = z.x - x
        const zy = z.y - y
        if (zx * zx + zy * zy < 70 * 70) {
          score -= 220
          break
        }
      }
      if (score > bestScore) {
        bestScore = score
        best = { x: x, y: y }
      }
    }

    const list = this._pickups || []
    for (let i = 0; i < list.length; i++) {
      const p = list[i]
      if (isLootTempDisabled(p.key)) continue
      let bonus = 80
      if (needHp && p.key === 'hp') bonus = 420
      else if (needQi && p.key === 'ling') bonus = 400
      else if (p.key === 'hp') bonus = 140
      else if (p.key === 'ling') bonus = 160
      consider(p.x, p.y, bonus)
    }
    return best
  },

  /** 点击选中僵尸：飞剑优先斩它 */
  _tryFocusZombie(x, y) {
    let best = null
    let bestD = 36 * 36
    for (let i = 0; i < this._zombies.length; i++) {
      const z = this._zombies[i]
      if (z.emerge < 0.55) continue
      if (z.state === 'dead') continue
      const dx = z.x - x
      const dy = z.y - y
      const d = dx * dx + dy * dy
      if (d < bestD) {
        bestD = d
        best = z
      }
    }
    this._focusZombie = best
    if (best) {
      this._burst(best.x, best.y - best.r, '#fef08a', 6)
    }
  },

  _loop() {
    if (!this._canvas) return
    if (this._loopRunning) return
    this._loopRunning = true
    const tick = (ts) => {
      this._raf = this._canvas.requestAnimationFrame(tick)
      if (this._paused || this._over || this._perfect || this.data.showRealmInfo || this.data.showRealmPick || this.data.showContinueGate || this.data.progressLoading || this.data.showChapterPick || this.data.showChapterIntro || this.data.showChapterClear || this.data.showChapterOutro) {
        this._draw()
        return
      }
      const dt = this._lastTs ? Math.min(0.05, (ts - this._lastTs) / 1000) : 0.016
      this._lastTs = ts
      if (this._perfectFx) {
        this._updatePerfect(dt)
        this._draw()
        return
      }
      if (this._spiritFx) {
        this._updateSpiritDomain(dt)
        this._draw()
        return
      }
      if (this._qiVortexFx) {
        this._updateQiVortex(dt)
        this._draw()
        return
      }
      this._update(dt)
      this._tickChapterSession(dt)
      this._draw()
    }
    this._raf = this._canvas.requestAnimationFrame(tick)
  },

  _update(dt) {
    this._animT += dt
    this._wave = 1 + Math.floor(this._kills / 12)
    const realm = realmByLv(this._realmLv)
    this._syncPlayerHpCap(realm)

    // 凡人阶段：盘膝吸纳灵气，不进入战斗循环
    if (this._isMortalCultivate()) {
      this._updateMortalCultivate(dt, realm)
      return
    }

    // 自动飞行：捡包、躲尸（拖动时暂停，手控优先；撕裂虚空中暂停）
    if (!this._voidBlink) this._updateAutoPilot(dt)
    if (this._spaceForceWarnT > 0) this._spaceForceWarnT = Math.max(0, this._spaceForceWarnT - dt)
    if (this._blinkFx) {
      this._blinkFx.t += dt
      if (this._blinkFx.t >= this._blinkFx.dur) this._blinkFx = null
    }
    if (this._voidBlink) this._updateVoidBlink(dt)
    this._ensurePlayerInBounds()
    // 元婴起缓慢积蓄空间之力（击杀另有加成）
    if (canSpaceBlink(this._realmLv) && !this._voidBlink) {
      const before = this._spaceForce || 0
      // 受威胁时空间之力回得更快，便于破碎虚空躲伤
      let threat = false
      const crescents = this._demonCrescents || []
      for (let i = 0; i < crescents.length; i++) {
        if (crescents[i].mode === 'attack') {
          const dx = this._playerX - crescents[i].x
          const dy = this._playerY - crescents[i].y
          if (dx * dx + dy * dy < 120 * 120) { threat = true; break }
        }
      }
      if (!threat) {
        const zs = this._zombies || []
        for (let i = 0; i < zs.length; i++) {
          const z = zs[i]
          if (z.state === 'dead') continue
          const dx = this._playerX - z.x
          const dy = this._playerY - z.y
          if (dx * dx + dy * dy < 90 * 90) { threat = true; break }
        }
      }
      const rate = SPACE_FORCE_PASSIVE * (threat ? 1.85 : 1)
      this._spaceForce = Math.min(SPACE_FORCE_MAX, before + rate * dt)
      if (Math.floor(this._spaceForce) !== Math.floor(before) || (before < SPACE_FORCE_MAX && this._spaceForce >= SPACE_FORCE_MAX)) {
        this.setData({ spaceForce: Math.floor(this._spaceForce), maxSpaceForce: SPACE_FORCE_MAX })
      }
    }
    if (this._playerHideT > 0) this._playerHideT = Math.max(0, this._playerHideT - dt)
    if (this._lingQiWarnT > 0) this._lingQiWarnT = Math.max(0, this._lingQiWarnT - dt)
    // 符咒暂时关闭：清掉已持有符
    if (this._heldFu && isLootTempDisabled(this._heldFu.key)) {
      this._heldFu = null
      this._fuThrow = null
      if (this.data.heldFu) this.setData({ heldFu: '' })
    }
    this._updateLingQi(dt, realm)
    this._updateFuThrow(dt, realm)
    this._updateGroundSwords(dt)
    // 御剑遁光拖尾
    this._pushTrail(realm)

    // 战意：与怪交锋时随时间积蓄（取代击杀尸丹）
    this._tickWarIntent(dt)

    // 大庚剑阵进行中
    if (this._gengFx) {
      this._updateGengFormation(dt, realm)
    }

    if (this._breakMute > 0) {
      this._breakMute = Math.max(0, this._breakMute - dt)
    }
    if (this._breakFx) {
      this._breakFx.t += dt
      if (this._breakFx.t >= this._breakFx.duration) this._breakFx = null
    }
    if (this._freezeT > 0) this._freezeT = Math.max(0, this._freezeT - dt)
    if (this._playerHurtT > 0) this._playerHurtT = Math.max(0, this._playerHurtT - dt)

    if (this._focusZombie && this._zombies.indexOf(this._focusZombie) < 0) {
      this._focusZombie = null
    }

    // 每一级场上只保留一只怪；境主战期间 _bossActive 挡重复刷怪
    const guardianMode = isGuardianCombatRealm(realm.lv)
    let spawnEvery = guardianMode ? 0.8 : Math.max(1.55, 2.8 - this._wave * 0.05 - realm.lv * 0.03)
    // 一章一局：按章节 rules.spawnMul 调刷怪节奏（>1 更快）
    if (this._chapterActive && this._chapterRules && this._chapterRules.spawnMul != null) {
      const mul = Math.max(0.15, Number(this._chapterRules.spawnMul) || 1)
      spawnEvery = spawnEvery / mul
    }
    const maxZ = 1
    this._spawnAcc += dt
    // 境主战 / 突破静默期不刷；样板境由 _spawnRealmGuardian 负责
    const canSpawn = guardianMode
      ? (!this._gengFx && this._breakMute <= 0 && !this._spiritFx && this._zombies.length < maxZ && !this._bossActive)
      : (!this._bossActive && !this._gengFx && this._breakMute <= 0 && this._zombies.length < maxZ)
    if (canSpawn && this._spawnAcc >= spawnEvery) {
      this._spawnAcc = 0
      this._spawnZombie()
    }

    this._pickupAcc += dt
    // 物品改为击杀掉落，不再定时刷地面箱
    this._lootAcc = 0

    const shootEvery = Math.max(0.28, 0.55 - realm.lv * 0.04)
    this._swordAcc += dt
    // 按大境界主攻：剑修出剑，其余境界按说明出神光/雷火等
    if (!this._gengFx && !this._spiritFx && !this._breakFx) {
      this._tickRealmPrimaryAttack(dt, realm, shootEvery)
    }
    // 非剑修清掉残留飞剑/环剑感
    if (!realmUsesSwords(realm.lv) && this._swords && this._swords.length) {
      this._swords = []
    }

    // 辅招（与主攻不同的那一式）
    this._tickRealmAuxSkill(dt, realm)
    this._updateRealmShots(dt, realm)

    // 飞剑：穿透斩尸，击杀后追下一只或回身归队
    for (let i = this._swords.length - 1; i >= 0; i--) {
      const s = this._swords[i]
      if (!s.hitIds) s.hitIds = {}
      if (!s.mode) s.mode = 'hunt'

      s.life -= dt
      // 与魔气僵持：短暂对峙后剑气消散归队
      if (s.mode === 'stalemate') {
        s.stalemateT = (s.stalemateT || 0) - dt
        s.x += Math.sin((this._animT || 0) * 42 + (s.id || 0)) * 0.55
        s.y += Math.cos((this._animT || 0) * 38 + (s.id || 0)) * 0.4
        if (s.stalemateT <= 0) {
          s.mode = 'return'
          s.life = 2.2
        }
        continue
      }
      // 寿命到：改为回身，不直接消失
      if (s.life <= 0 && s.mode !== 'return') {
        s.mode = 'return'
        s.life = 2.5
      } else if (s.life <= 0 && s.mode === 'return') {
        this._swords.splice(i, 1)
        continue
      }

      if (s.mode === 'return') {
        const wantAngle = Math.atan2(this._playerY - s.y, this._playerX - s.x)
        let da = wantAngle - s.angle
        while (da > Math.PI) da -= Math.PI * 2
        while (da < -Math.PI) da += Math.PI * 2
        s.angle += Math.max(-7 * dt, Math.min(7 * dt, da))
        s.x += Math.cos(s.angle) * (s.speed * 1.15) * dt
        s.y += Math.sin(s.angle) * (s.speed * 1.15) * dt
        const pdx = s.x - this._playerX
        const pdy = s.y - this._playerY
        if (pdx * pdx + pdy * pdy < 26 * 26) {
          this._swords.splice(i, 1)
        }
        continue
      }

      const target = this._swordTarget(s.x, s.y, s)
      if (target) {
        const ty = target.y != null ? target.y - (target.floatY || 0) : target.y
        const wantAngle = Math.atan2(ty - s.y, target.x - s.x)
        let da = wantAngle - s.angle
        while (da > Math.PI) da -= Math.PI * 2
        while (da < -Math.PI) da += Math.PI * 2
        s.angle += Math.max(-5.5 * dt, Math.min(5.5 * dt, da))
      } else {
        // 无目标：回身身边
        s.mode = 'return'
        continue
      }
      s.x += Math.cos(s.angle) * s.speed * dt
      s.y += Math.sin(s.angle) * s.speed * dt

      // 离开身体后清除穿透标记，允许再次穿过
      for (let zi = 0; zi < this._zombies.length; zi++) {
        const z = this._zombies[zi]
        if (!s.hitIds[z.id]) continue
        const dx = s.x - z.x
        const dy = s.y - (z.y - (z.floatY || 0))
        if (dx * dx + dy * dy > (z.r + 16) * (z.r + 16)) {
          delete s.hitIds[z.id]
        }
      }

      // 穿透：穿过身体造成伤害；魔族可月牙抵挡
      for (let zi = 0; zi < this._zombies.length; zi++) {
        const z = this._zombies[zi]
        if (z.emerge < 0.85 || z.state === 'dead') continue
        if (s.hitIds[z.id]) continue
        const dx = s.x - z.x
        const dy = s.y - (z.y - (z.floatY || 0))
        const hitR = (z.r + 10) * (z.r + 10)
        const blockPad = 28 + Math.min(22, (z.blockDuration || 0) * 16)
        const blockR = (z.r + blockPad) * (z.r + blockPad)
        const d2 = dx * dx + dy * dy
        if (z.resistSkills && d2 <= blockR && this._tryDemonBlockSword(z, s)) {
          break
        }
        if (d2 <= hitR) {
          s.hitIds[z.id] = 1
          this._hitZombie(z, s.dmg, s.x, s.y, realm, s.enchant, false)
          if (z.state === 'dead' || z.hp <= 0) {
            const next = this._nearestReadyZombie(s.x, s.y, null)
            if (!next) s.mode = 'return'
          }
          break
        }
      }

      // 飞剑仍可戳拾取物（不销毁飞剑，仅拾取）
      for (let pi = this._pickups.length - 1; pi >= 0; pi--) {
        const p = this._pickups[pi]
        const dx = s.x - p.x
        const dy = s.y - p.y
        if (dx * dx + dy * dy < 22 * 22) {
          this._collectPickup(pi)
          break
        }
      }

      if (s.y < -60 || s.y > this._h + 60 || s.x < -60 || s.x > this._w + 60) {
        s.mode = 'return'
      }
    }

    // 掉落物浮动：靠近拾取（丹药即时）；禁用类掉落当场清掉
    for (let i = this._pickups.length - 1; i >= 0; i--) {
      const p = this._pickups[i]
      if (isLootTempDisabled(p.key)) {
        this._pickups.splice(i, 1)
        continue
      }
      p.bob = (p.bob || 0) + dt * 3
      p.spin += dt * 4
      p.life = (p.life == null ? 18 : p.life) - dt
      if (p.life <= 0) {
        this._pickups.splice(i, 1)
        continue
      }
      const dx = p.x - this._playerX
      const dy = p.y - this._playerY
      if (dx * dx + dy * dy < 34 * 34) this._collectPickup(i)
    }

    const baseSpeed = 26 + this._wave * 2.8
    for (let i = this._zombies.length - 1; i >= 0; i--) {
      const z = this._zombies[i]
      z.frameT += dt
      // 击退惯性
      if (z.kx || z.ky) {
        z.x += (z.kx || 0) * dt
        z.y += (z.ky || 0) * dt
        z.kx = (z.kx || 0) * Math.max(0, 1 - dt * 6)
        z.ky = (z.ky || 0) * Math.max(0, 1 - dt * 6)
      }

      if (z.state === 'dead') {
        // 元婴大庚「插地→消散→剑归」由剑阵流程结算长老，避免中途 breakthrough
        if (this._gengFx && this._gengFx.style === 'void64' && (z.isRealmGuardian || z.isDemon)) {
          continue
        }
        const deadLen = z.isBoss ? 0.55 : (ANIM_DEFS.dead.paths.length / ANIM_DEFS.dead.fps)
        if (z.frameT >= deadLen) {
          const wasBoss = !!z.isBoss
          const wasGuardian = !!z.isRealmGuardian
          const wasHeart = !!z.isHeartDemon
          if (this._focusZombie === z) this._focusZombie = null
          this._dropLootFromZombie(z)
          this._zombies.splice(i, 1)
          this._registerKill(wasBoss || wasGuardian ? {
            boss: true,
            realmGuardian: wasGuardian,
            heartDemon: wasHeart,
            skipDan: true
          } : null)
        }
        continue
      }

      // 元素状态倒计时与持续伤害
      this._tickZombieElements(z, dt, realm)
      if ((z.timeSlow || 0) > 0) z.timeSlow = Math.max(0, z.timeSlow - dt)

      if (z.state === 'hurt') {
        const hurtLen = ANIM_DEFS.hurt.paths.length / ANIM_DEFS.hurt.fps
        if (z.frameT >= hurtLen) {
          z.state = 'walk'
          z.frameT = 0
        }
        continue
      }

      // 出土动画期间播放种类出场特效
      if (z.state === 'emerge' || z.emerge < 1) {
        z.state = 'emerge'
        const before = z.emerge || 0
        z.emerge = Math.min(1, before + dt / (z.isBoss ? 0.7 : 1.05))
        if (z.emerge > 0.15 && before <= 0.15) this._emitMonsterFx(z, 'emerge', 0.45)
        if (z.emerge >= 1) {
          z.state = 'walk'
          z.frameT = 0
          z.emerge = 1
          this._emitMonsterFx(z, 'emerge', 1)
        }
        continue
      }

      // 全种类战斗（含升级前随机 Boss）
      if (z.atkFx) {
        z.atkFx.t += dt
        if (z.atkFx.t >= z.atkFx.dur) z.atkFx = null
      }
      this._updateMonsterCombat(z, dt, realm, baseSpeed)
      continue
    }

    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i]
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.life <= 0) this._particles.splice(i, 1)
    }
    for (let i = this._trails.length - 1; i >= 0; i--) {
      this._trails[i].life -= dt
      if (this._trails[i].life <= 0) this._trails.splice(i, 1)
    }

    this._updateGoo(dt, realm)
    this._updateDemonCrescents(dt, realm)
    this._updateEnemySwords(dt)
    this._updateHelper(dt, realm)

    if (this.data.wave !== this._wave || this.data.hp !== Math.ceil(this._hp) || this.data.lingQi !== Math.floor(this._lingQi || 0)) {
      this.setData({
        wave: this._wave,
        hp: Math.ceil(this._hp),
        maxHp: this._maxHp,
        lingQi: Math.floor(this._lingQi || 0),
        maxLingQi: this._maxLingQi || 0
      })
    }
  },

  _collectPickup(index) {
    const p = this._pickups[index]
    if (!p) return
    if (isLootTempDisabled(p.key)) {
      this._pickups.splice(index, 1)
      return
    }
    const def = LOOT_DEFS[p.key] || LOOT_DEFS.hp
    if (p.key === 'sword') {
      this._swordCount = Math.min(MAX_SWORD_COUNT, this._swordCount + 1)
      this.setData({ swordCount: this._swordCount })
    } else if (def.kind === 'pill' || def.kind === 'stone') {
      if (def.heal) this._healPlayer(Math.floor(this._maxHp * def.heal))
      if (def.qi) this._addLingQi(def.qi)
    } else if (def.kind === 'fu') {
      // 符箓先入手，点按再扔
      this._heldFu = { key: p.key, label: def.label, color: def.color, mark: def.mark }
      this.setData({ heldFu: def.label })
      this._burst(this._playerX, this._playerY, def.color, 12)
    }
    this._burst(p.x, p.y, def.color, 10)
    this._pickups.splice(index, 1)
  },

  /** 元素状态：持续掉血 / 计时 */
  _tickZombieElements(z, dt, realm) {
    if (z.elecT > 0) {
      z.elecT -= dt
      z.elecTick = (z.elecTick || 0) + dt
      if (z.elecTick >= 0.45) {
        z.elecTick = 0
        z.hp -= 1 + Math.floor(realm.lv * 0.35)
        this._burst(z.x, z.y - 8, '#67e8f9', 3)
      }
    }
    if (z.fireT > 0) {
      z.fireT -= dt
      z.fireTick = (z.fireTick || 0) + dt
      if (z.fireTick >= 0.4) {
        z.fireTick = 0
        z.hp -= 1 + Math.floor(realm.lv * 0.45)
        this._burst(z.x, z.y - 6, '#fb923c', 4)
      }
    }
    if (z.iceT > 0) z.iceT -= dt
    if (z.windT > 0) {
      z.windT -= dt
      if (z.windT <= 0) z.floatY = 0
    }
    if (z.hp <= 0 && z.state !== 'dead') {
      z.state = 'dead'
      z.frameT = 0
      this._emitMonsterFx(z, 'death', 1)
    }
  },

  _hitZombie(z, dmg, fromX, fromY, realm, enchant, knockback) {
    if (!z || z.state === 'dead') return
    let bonus = 0
    if (enchant === 'elec') bonus = 2
    if (enchant === 'fire') bonus = 2
    if (enchant === 'wind') bonus = 1
    if (enchant === 'ice') bonus = 1
    let real = dmg + bonus
    // 境主抗性：境界越高减伤越高
    if (z.resistSkills && (z.dmgResist || 0) > 0) {
      real = Math.max(1, Math.floor(real * (1 - z.dmgResist)))
    }
    z.hp -= real
    this._burst(z.x, z.y, (LOOT_DEFS[enchant] && LOOT_DEFS[enchant].color) || '#fde68a', 5)
    // 飞剑穿透不击退，仅受伤闪白
    if (knockback !== false) {
      const dx = z.x - fromX
      const dy = z.y - fromY
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      z.kx = (dx / dist) * (enchant === 'wind' ? 40 : 140)
      z.ky = (dy / dist) * (enchant === 'wind' ? 40 : 140)
    }
    z.flash = 0.25
    this._applyEnchantToZombie(z, enchant)
    if (z.hp <= 0) {
      z.state = 'dead'
      z.frameT = 0
      this._emitMonsterFx(z, 'death', z.isBoss ? 1.4 : 1)
    } else if ((z.iceT || 0) <= 0 && (z.windT || 0) <= 0) {
      z.state = 'hurt'
      z.frameT = 0
      this._emitMonsterFx(z, 'hurt', 1)
    }
  },

  /** 飞剑附魔打中后：电缠 / 燃火 / 冰冻 / 风困 */
  _applyEnchantToZombie(z, enchant) {
    if (!enchant) return
    if (enchant === 'elec') {
      z.elecT = Math.max(z.elecT || 0, 3.6)
      z.elecTick = 0
    } else if (enchant === 'fire') {
      z.fireT = Math.max(z.fireT || 0, 4.2)
      z.fireTick = 0
    } else if (enchant === 'ice') {
      z.iceT = Math.max(z.iceT || 0, 3.2)
      z.windT = 0
      z.floatY = 0
    } else if (enchant === 'wind') {
      z.windT = Math.max(z.windT || 0, 3.8)
      z.windCx = z.x
      z.windCy = z.y
      z.windA = Math.random() * Math.PI * 2
      z.windR = 28 + Math.random() * 14
      z.iceT = 0
    }
  },

  _syncPlayerHpCap(realm) {
    const cap = playerMaxHpByRealm(realm)
    if (cap !== this._maxHp) {
      const ratio = this._hp / (this._maxHp || 1)
      this._maxHp = cap
      this._hp = Math.min(cap, Math.max(this._hp, Math.ceil(cap * Math.max(ratio, 0.55))))
    }
    const qiCap = playerMaxLingQi(realm)
    if (qiCap !== this._maxLingQi) {
      const qr = (this._lingQi || 0) / (this._maxLingQi || 1)
      this._maxLingQi = qiCap
      this._lingQi = Math.min(qiCap, Math.max(this._lingQi || 0, Math.ceil(qiCap * Math.max(qr, 0.45))))
      this.setData({ lingQi: Math.floor(this._lingQi), maxLingQi: this._maxLingQi })
    }
  },

  _healPlayer(n) {
    this._hp = Math.min(this._maxHp, this._hp + n)
    this.setData({ hp: Math.ceil(this._hp), maxHp: this._maxHp })
  },

  _addLingQi(n) {
    const max = this._maxLingQi || LING_QI_BASE
    this._lingQi = Math.max(0, Math.min(max, (this._lingQi || 0) + n))
    this.setData({ lingQi: Math.floor(this._lingQi), maxLingQi: max })
  },

  /** 战斗中静止打坐回灵；移动则中断 */
  _updateLingQi(dt, realm) {
    if (this._isMortalCultivate() || this._over || this._perfect || this._gengFx || this._spiritFx) {
      this._meditating = false
      this._stillAcc = 0
      return
    }
    const moved = this._dragging || (
      Math.abs(this._playerX - this._prevPlayerX) + Math.abs(this._playerY - this._prevPlayerY) > 1.2
    )
    if (moved) {
      this._stillAcc = 0
      this._meditating = false
      return
    }
    this._stillAcc = (this._stillAcc || 0) + dt
    if (this._stillAcc < 0.45) {
      this._meditating = false
      return
    }
    this._meditating = true
    if ((this._lingQi || 0) < (this._maxLingQi || 0)) {
      this._addLingQi(LING_QI_MEDITATE * dt * (1 + Math.min(0.5, realm.lv * 0.03)))
    }
  },

  /** 场景出土飞剑：暂时关闭 */
  _updateGroundSwords() {
    this._groundSwords = []
  },

  /** 点按扔出持有符箓 */
  _throwHeldFu(tx, ty) {
    if (!this._heldFu || this._fuThrow) return false
    const def = LOOT_DEFS[this._heldFu.key]
    if (!def) return false
    let aimX = tx
    let aimY = ty
    const focus = this._focusZombie
    if (focus && focus.state !== 'dead') {
      aimX = focus.x
      aimY = focus.y - (focus.floatY || 0)
    }
    this._fuThrow = {
      t: 0,
      wind: 0.28,
      fly: 0.32,
      key: this._heldFu.key,
      color: def.color,
      label: def.label,
      mark: def.mark || '符',
      sx: this._playerX,
      sy: this._playerY - 18,
      tx: aimX,
      ty: aimY,
      done: false
    }
    this._heldFu = null
    this.setData({ heldFu: '' })
    return true
  },

  _updateFuThrow(dt, realm) {
    const fx = this._fuThrow
    if (!fx) return
    fx.t += dt
    if (!fx.done && fx.t >= fx.wind + fx.fly) {
      fx.done = true
      this._applyFuEffect(fx.key, fx.tx, fx.ty, realm)
      this._burst(fx.tx, fx.ty, fx.color, 22)
    }
    if (fx.t >= fx.wind + fx.fly + 0.2) this._fuThrow = null
  },

  /** 符箓落地效果：雷/火/冰范围、遁地闪避、隐身、缚尸 */
  _applyFuEffect(key, x, y, realm) {
    const lv = realm.lv || 1
    if (key === 'fu_earth') {
      const g = this._grassRect()
      const ang = Math.random() * Math.PI * 2
      const hop = 90 + Math.random() * 50
      const nx = Math.max(g.minX, Math.min(g.maxX, this._playerX + Math.cos(ang) * hop))
      const ny = Math.max(g.minY, Math.min(g.maxY, this._playerY + Math.sin(ang) * hop))
      this._spawnBlinkFx(this._playerX, this._playerY, nx, ny, realm)
      this._playerX = nx
      this._playerY = ny
      this._burst(nx, ny, '#a3e635', 16)
      return
    }
    if (key === 'fu_hide') {
      this._playerHideT = 5.2
      this._burst(this._playerX, this._playerY, '#c4b5fd', 18)
      return
    }
    const R = key === 'fu_lei' ? 110 : (key === 'fu_bind' ? 95 : 88)
    const R2 = R * R
    for (let i = 0; i < this._zombies.length; i++) {
      const z = this._zombies[i]
      if (z.state === 'dead' || z.emerge < 0.5) continue
      const dx = z.x - x
      const dy = (z.y - (z.floatY || 0)) - y
      if (dx * dx + dy * dy > R2) continue
      if (key === 'fu_lei') {
        this._hitZombie(z, 10 + lv * 2.2, x, y, realm, null, true)
        z.elecT = Math.max(z.elecT || 0, 2.8)
      } else if (key === 'fu_fire') {
        this._hitZombie(z, 6 + lv * 1.4, x, y, realm, null, true)
        z.fireT = Math.max(z.fireT || 0, 4.5)
        z.fireTick = 0
      } else if (key === 'fu_ice') {
        z.iceT = Math.max(z.iceT || 0, 4.0)
        z.floatY = 0
        z.state = 'hurt'
        z.frameT = 0
        this._burst(z.x, z.y, '#93c5fd', 8)
      } else if (key === 'fu_bind') {
        z.iceT = Math.max(z.iceT || 0, 3.2)
        z.bindT = 3.2
        z.state = 'hurt'
        z.frameT = 0
        this._burst(z.x, z.y, '#f9a8d4', 8)
      }
    }
  },

  _hurtPlayer(dmg, fromX, fromY) {
    if (this._perfect || this._over) return
    if (this._voidBlink) return
    if (this._isMortalCultivate() || (this._realmLv || 1) <= 1) return
    if ((this._playerHideT || 0) > 0) return
    // 元婴后：破碎虚空瞬移躲伤（空间之力足够时自动裂空脱身）
    if (canSpaceBlink(this._realmLv) && (this._spaceForce || 0) >= 42) {
      const dx0 = this._playerX - (fromX == null ? this._playerX : fromX)
      const dy0 = this._playerY - (fromY == null ? this._playerY : fromY)
      const d0 = Math.sqrt(dx0 * dx0 + dy0 * dy0) || 1
      const hop = 118 + Math.min(70, (realmByLv(this._realmLv).majorIndex || 0) * 8)
      const raw = this._clampToGrass(
        this._playerX + (dx0 / d0) * hop,
        this._playerY + (dy0 / d0) * hop,
        18
      )
      const cost = Math.min(this._spaceForce, 55)
      this._spaceForce = Math.max(0, (this._spaceForce || 0) - cost)
      this.setData({ spaceForce: Math.floor(this._spaceForce), maxSpaceForce: SPACE_FORCE_MAX })
      const realm = realmByLv(this._realmLv)
      this._startVoidBlink(this._playerX, this._playerY, raw.x, raw.y, realm)
      this._burst(this._playerX, this._playerY, '#67e8f9', 10)
      wx.showToast({ title: '破碎虚空 · 躲伤', icon: 'none', duration: 700 })
      return
    }
    // 筑基青元护体剑盾
    let real = dmg
    if ((this._qingyuanShield || 0) > 0) {
      real = Math.max(1, Math.floor(dmg * 0.55))
      this._burst(this._playerX, this._playerY, '#67e8f9', 4)
    }
    // 章节剧情战：受伤但不致死
    if (this._chapterActive && this._chapterRules && this._chapterRules.invuln) {
      real = Math.min(real, Math.max(1, Math.floor((this._hp || 1) * 0.12)))
      if ((this._hp - real) < 1) real = Math.max(0, (this._hp || 1) - 1)
    }
    this._hp -= real
    this._playerHurtT = 0.35
    this._burst(this._playerX, this._playerY, '#f87171', 8)
    // 轻击退
    const dx = this._playerX - fromX
    const dy = this._playerY - fromY
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    this._movePlayerTo(this._playerX + (dx / dist) * 18, this._playerY + (dy / dist) * 18)
    this.setData({ hp: Math.max(0, Math.ceil(this._hp)), maxHp: this._maxHp })
    if (this._hp <= 0) {
      if (this._chapterActive && this._chapterRules && this._chapterRules.invuln) {
        this._hp = Math.max(1, Math.floor((this._maxHp || 48) * 0.4))
        this.setData({ hp: Math.ceil(this._hp) })
        return
      }
      this._gameOver()
    }
  },

  _pushTrail(realm) {
    const dx = this._playerX - this._prevPlayerX
    const dy = this._playerY - this._prevPlayerY
    const moved = dx * dx + dy * dy > 2.5
    // 撕裂虚空中不画遁光尾；其余境界（含元婴遁光飞行）均保留
    if (this._voidBlink) {
      this._prevPlayerX = this._playerX
      this._prevPlayerY = this._playerY
      return
    }
    if (moved) {
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const ux = dx / dist
      const uy = dy / dist
      // 彗星：靠近人物的头亮且粗，越往后越细越虚
      const segs = 7 + Math.min(5, Math.floor(realm.lv / 2))
      for (let i = 0; i < segs; i++) {
        const t = i / Math.max(1, segs - 1) // 0=头(近身) 1=尾
        const back = 3 + i * 4.5
        const maxLife = 0.55 + realm.lv * 0.025
        this._trails.push({
          x: this._playerX - ux * back + (Math.random() - 0.5) * (1 + t * 3),
          y: this._playerY - uy * back + 8 + (Math.random() - 0.5) * (1 + t * 2),
          life: maxLife * (1 - t * 0.72),
          maxLife: maxLife,
          color: t < 0.25 ? '#f8fafc' : (t < 0.55 ? realm.color : '#94a3b8'),
          r: Math.max(0.8, (9 + realm.lv * 0.4) * (1 - t * 0.88)),
          comet: true,
          ghost: t
        })
      }
    }
    this._prevPlayerX = this._playerX
    this._prevPlayerY = this._playerY
  },

  _updateLightning(dt, realm) {
    // 天雷玩法已移除，保留空实现避免旧调用报错
  },

  _spawnBoltWarn() {},

  _spawnBoltVisual(x, y, dur) {},

  _spawnLoot(key, atX, atY) {
    // 硬拦截：灵石 / 符咒 / 剑类掉落一律不生成
    if (isLootTempDisabled(key)) return
    const def = LOOT_DEFS[key]
    if (!def) return
    let p
    if (atX != null && atY != null) {
      p = this._clampToGrass(atX + (Math.random() - 0.5) * 24, atY + (Math.random() - 0.5) * 18)
    } else {
      const g = this._grassRect()
      p = this._clampToGrass(
        g.minX + Math.random() * (g.maxX - g.minX),
        g.minY + Math.random() * (g.maxY - g.minY)
      )
    }
    this._pickups.push({
      key,
      x: p.x,
      y: p.y,
      spin: 0,
      bob: Math.random() * 3,
      life: def.kind === 'fu' ? 18 : 14,
      speed: 0
    })
  },

  _spawnRandomLoot(atX, atY) {
    // 暂时只掉红色回血丹（回灵丹外形太像灵石，一并停掉以免误认）
    this._spawnLoot('hp', atX, atY)
  },

  /** 僵尸死亡随机掉落（Boss 必掉 1～2 件） */
  _dropLootFromZombie(z) {
    if (!z || z.handOnly) return
    const chance = z.isBoss ? 1 : 0.62
    if (Math.random() > chance) return
    const n = z.isBoss ? (1 + (Math.random() < 0.55 ? 1 : 0)) : 1
    for (let i = 0; i < n; i++) {
      this._spawnRandomLoot(z.x, z.y - (z.floatY || 0))
    }
  },

  /** 飞剑追击目标：只追僵尸；无目标则由外层改为回身 */
  _swordTarget(x, y, sword) {
    const hitIds = (sword && sword.hitIds) || {}
    if (
      this._focusZombie &&
      this._focusZombie.emerge >= 0.85 &&
      this._focusZombie.state !== 'dead' &&
      !hitIds[this._focusZombie.id]
    ) {
      return this._focusZombie
    }
    const fresh = this._nearestReadyZombie(x, y, hitIds)
    if (fresh) return fresh
    return this._nearestReadyZombie(x, y, null)
  },

  _nearestReadyZombie(x, y, excludeIds) {
    let best = null
    let bestD = 1e12
    for (let i = 0; i < this._zombies.length; i++) {
      const z = this._zombies[i]
      if (z.emerge < 0.85) continue
      if (z.state === 'dead') continue
      if (excludeIds && excludeIds[z.id]) continue
      const dx = z.x - x
      const dy = z.y - (z.floatY || 0) - y
      const d = dx * dx + dy * dy
      if (d < bestD) {
        bestD = d
        best = z
      }
    }
    return best
  },

  _nearestPickup(x, y) {
    let best = null
    let bestD = 1e12
    for (let i = 0; i < this._pickups.length; i++) {
      const p = this._pickups[i]
      if (p.key !== 'sword' && p.key !== 'hp') continue
      const dx = p.x - x
      const dy = p.y - y
      const d = dx * dx + dy * dy
      if (d < bestD) {
        bestD = d
        best = p
      }
    }
    return best
  },

  /** 草地上出土普通怪物；大境巅峰改为刷唯一境主 */
  _spawnZombie() {
    if (isGuardianCombatRealm(this._realmLv)) {
      this._spawnRealmGuardian(getRealmCombat(this._realmLv))
      return
    }
    const realm = realmByLv(this._realmLv)
    const typeKey = pickMonsterKey(this._wave, this._realmLv)
    const def = monsterDef(typeKey)
    const hp = Math.floor((10 + Math.floor(this._wave * 3.5) + (realm.majorIndex || 1) * 5 + Math.floor(this._kills / 25)) * def.hpMul * 1.35)
    const r = (20 + Math.min(8, this._wave * 0.35)) * realm.bodyScale * def.rMul
    let pos = this._spawnPointOnGrass()
    const pdx = pos.x - this._playerX
    const pdy = pos.y - this._playerY
    if (pdx * pdx + pdy * pdy < 110 * 110) {
      pos = this._spawnPointOnGrass()
    }
    pos = this._clampToGrass(pos.x, pos.y)
    let hpFinal = hp
    if (this._chapterActive && this._chapterRules && this._chapterRules.hpMul != null) {
      hpFinal = Math.max(4, Math.floor(hp * Number(this._chapterRules.hpMul)))
    }
    const z = this._makeMonster({
      typeKey: typeKey,
      x: pos.x,
      y: pos.y,
      r: r,
      hp: hpFinal,
      maxHp: hpFinal,
      isBoss: false
    })
    // 元婴之后：每大境界独立生成的敌修人形（不用主角贴图）
    if (isAfterYuanying(this._realmLv)) {
      const kit = getGuardianKit(this._realmLv)
      z.proceduralBody = true
      z.handOnly = true
      z.gDraw = kit.gDraw
      z.tint = realm.color || kit.crescentColor
      z.glow = realm.glow || kit.crescentGlow
      z.crescentColor = kit.crescentColor
      z.crescentGlow = kit.crescentGlow
      // 碰撞半径随体型软封顶，避免后期胖到出屏
      const softR = Math.min(z.r, 28)
      z.r = softR
      const lookName = ({
        sha: '煞影修士', voidbeast: '虚空修士', mutate: '真灵修士', overlord: '霸体修士',
        leibeast: '雷劫修士', timeprison: '时囚修士', tianmo: '天魔修士', sanshi: '三尸修士',
        chaos: '混沌修士', demon: '魔影修士'
      })[kit.gDraw] || ((realm.majorName || realm.name || '') + '修士')
      z.typeName = lookName
    }
    this._zombies.push(z)
  },

  /** 炼气～道祖：唯一境主，击败后突破 */
  _spawnRealmGuardian(combat) {
    if (!combat || this._bossActive || this._gengFx || this._spiritFx || this._breakFx) return
    for (let i = 0; i < (this._zombies || []).length; i++) {
      if (this._zombies[i].state !== 'dead') return
    }
    const realm = realmByLv(this._realmLv)
    const def = monsterDef(combat.typeKey)
    const hpBars = Math.max(2, combat.hpBars || 3)
    const hpPerBar = Math.floor(combat.hpPerBar || 90)
    const hp = hpPerBar * hpBars
    const r = 30 * realm.bodyScale * (def.rMul || 1) * (combat.rMul || 1)
    let pos = this._spawnPointOnGrass()
    const pdx = pos.x - this._playerX
    const pdy = pos.y - this._playerY
    if (pdx * pdx + pdy * pdy < 120 * 120) {
      pos = this._spawnPointOnGrass()
    }
    pos = this._clampToGrass(pos.x, pos.y)
    const boss = this._makeMonster({
      typeKey: combat.typeKey,
      x: pos.x,
      y: pos.y,
      r: r,
      hp: hp,
      maxHp: hp,
      hpBars: hpBars,
      hpPerBar: hpPerBar,
      isBoss: true
    })
    boss.isRealmGuardian = true
    boss.typeName = combat.guardianName || def.name
    if (combat.tint) {
      boss.tint = combat.tint
      boss.glow = combat.tint
    }
    // 境主抵抗套件（按大境界档案：移动/攻击/抵挡/死亡）
    const kit = getGuardianKit(realm.lv)
    boss.resistSkills = !!kit.resistSkills
    boss.isDemon = !!kit.isDemon
    boss.isShadowSelf = !!kit.isShadowSelf
    boss.blockCdMax = kit.blockCdMax
    boss.blockDuration = kit.blockDuration
    boss.dmgResist = kit.dmgResist
    boss.atk = kit.atk
    boss.atkRange = kit.atkRange
    boss.mirrorSwords = !!kit.mirrorSwords
    boss.mirrorBlink = !!kit.mirrorBlink
    boss.mirrorUltPulse = !!kit.mirrorUltPulse
    boss.crescentColor = kit.crescentColor
    boss.crescentGlow = kit.crescentGlow
    boss.gMove = kit.gMove
    boss.gBlock = kit.gBlock
    boss.gDraw = kit.gDraw
    boss.emergeStyle = kit.gEmerge || boss.emergeStyle
    boss.hurtStyle = kit.gHurt || boss.hurtStyle
    boss.deathStyle = kit.gDeath || boss.deathStyle
    boss.skillCd = kit.skillCd * (0.85 + Math.random() * 0.3)
    // 元婴之后境主：与主角同人物立绘，按境界染色
    if (isAfterYuanying(realm.lv)) {
      boss.proceduralBody = true
      boss.handOnly = true
      boss.r = Math.min(boss.r, 36)
    }
    if (kit.isShadowSelf) {
      boss.alphaMul = 0.9
      boss.tint = '#0a0a0a'
      boss.glow = '#7f1d1d'
    }
    this._zombies.push(boss)
    this._focusZombie = boss
    this._bossActive = true
    this._burst(pos.x, pos.y, kit.isShadowSelf ? '#7f1d1d' : (combat.tint || '#86efac'), 16)
    this._emitMonsterFx(boss, 'emerge', 1)
    wx.showToast({
      title: (combat.guardianName || '境主') + '降临 · 击败可突破',
      icon: 'none',
      duration: 1800
    })
    console.log('仙途境主降临', {
      realm: realm.name,
      name: combat.guardianName,
      ult: combat.ultName,
      resist: kit.dmgResist,
      blockCd: kit.blockCdMax,
      shadow: !!kit.isShadowSelf,
      hp: hp,
      bars: hpBars
    })
  },

  /** @deprecated 已并入 _spawnRealmGuardian / REALM_COMBAT[5] */
  _spawnYuanyingGuardian() {
    const combat = getRealmCombat(firstRealmLvOfMajor(YUANYING_MAJOR_KEY))
    if (combat) this._spawnRealmGuardian(combat)
  },

  /** 组装怪物实例（普通 / Boss 共用） */
  _makeMonster(opt) {
    const def = monsterDef(opt.typeKey)
    return {
      id: this._nextZid++,
      typeKey: def.key,
      typeName: def.name,
      isBoss: !!opt.isBoss,
      isRealmGuardian: !!opt.isRealmGuardian,
      x: opt.x,
      y: opt.y,
      r: opt.r,
      hp: opt.hp,
      maxHp: opt.maxHp,
      hpBars: opt.hpBars || 1,
      hpPerBar: opt.hpPerBar || opt.maxHp,
      speedBonus: (Math.random() * 10) * (def.speedMul || 1),
      speedMul: def.speedMul || 1,
      dmgMul: def.dmgMul || 1,
      atk: def.atk,
      atkRange: def.atkRange || 18,
      useBossArt: !!def.useBossArt,
      tint: def.tint,
      glow: def.glow,
      alphaMul: def.alpha == null ? 1 : def.alpha,
      emergeStyle: def.emerge,
      hurtStyle: def.hurt,
      deathStyle: def.death,
      frameT: 0,
      emerge: 0,
      state: 'emerge',
      kx: 0,
      ky: 0,
      flash: 0,
      facing: 0,
      skillCd: 0.8 + Math.random(),
      skillT: 0,
      skillFired: false,
      dashT: 0,
      phaseCd: 0,
      isDemon: !!def.isDemon,
      resistSkills: !!def.resistSkills
    }
  },

  /** 击杀入账；勇气由交锋时间积蓄；元婴境主击败后突破 */
  _registerKill(opt) {
    const isBoss = !!(opt && opt.boss)
    const isGuardian = !!(opt && opt.realmGuardian)
    this._kills += 1
    if (this._chapterActive) this._chapterKills = (this._chapterKills || 0) + 1
    if (canSpaceBlink(this._realmLv)) {
      const before = this._spaceForce || 0
      this._spaceForce = Math.min(SPACE_FORCE_MAX, before + SPACE_FORCE_PER_KILL)
      this.setData({ spaceForce: Math.floor(this._spaceForce), maxSpaceForce: SPACE_FORCE_MAX })
    }

    const cur = realmByLv(this._realmLv)
    this.setData({
      kills: this._kills,
      wave: this._wave,
      realmLv: cur.lv,
      realmName: cur.name,
      realmTierName: cur.tierName,
      corpseDan: Math.floor(this._corpseDan || 0),
      corpseDanNeed: WAR_INTENT_NEED
    })
    this._persistProgress(false)

    if (isBoss || isGuardian) {
      this._bossActive = false
      const wasHeart = !!(opt && opt.heartDemon)
      if (this._gengFx) {
        this._bossDefeatedDeferred = true
        this._bossDefeatedDeferredHeart = wasHeart
      } else {
        this._onBossDefeated({ skipHeartDemon: wasHeart })
      }
    } else if (!this._chapterActive && !isGuardianCombatRealm(this._realmLv)) {
      // 小境界：击杀积蓄，满则灵气旋涡入丹田升层（章节模式禁用）
      this._stageKills = (this._stageKills || 0) + 1
      this._maybeMinorRealmUp()
    }
  },

  /** 小境界升层：天地灵气漩涡灌入丹田 */
  _maybeMinorRealmUp() {
    if (this._chapterActive) return
    if (this._qiVortexFx || this._spiritFx || this._breakFx || this._over || this._perfect) return
    if (isGuardianCombatRealm(this._realmLv)) return
    if ((this._realmLv || 1) >= REALMS.length) return
    const cur = realmByLv(this._realmLv)
    const nextLv = (this._realmLv || 1) + 1
    const next = realmByLv(nextLv)
    if (!next || next.majorKey !== cur.majorKey) return
    if ((this._stageKills || 0) < MINOR_STAGE_KILLS) return
    this._startQiVortexUp(nextLv)
  },

  _startQiVortexUp(nextLv) {
    if (this._qiVortexFx || this._spiritFx || this._breakFx) return
    const nr = realmByLv(nextLv)
    this._stageKills = 0
    this._breakMute = 2.4
    this._zombies = []
    this._swords = []
    this._focusZombie = null
    this._qiVortexFx = {
      t: 0,
      dur: 2.35,
      nextLv: nextLv,
      realm: nr
    }
    wx.showToast({ title: '灵气入丹 · ' + nr.name, icon: 'none', duration: 1600 })
    console.log('仙途小境界升层', nr.name)
  },

  _updateQiVortex(dt) {
    const fx = this._qiVortexFx
    if (!fx) return
    fx.t += dt
    this._animT += dt
    const px = this._playerX
    const py = this._playerY + 10
    // 天地灵气粒子卷入丹田
    if (Math.random() < 0.85) {
      const ang = Math.random() * Math.PI * 2
      const dist = 70 + Math.random() * 110
      this._particles.push({
        x: px + Math.cos(ang) * dist,
        y: py + Math.sin(ang) * dist * 0.55 - 30,
        vx: (px - (px + Math.cos(ang) * dist)) * (1.2 + Math.random()),
        vy: (py - (py + Math.sin(ang) * dist * 0.55 - 30)) * (1.2 + Math.random()),
        life: 0.45 + Math.random() * 0.35,
        color: Math.random() < 0.4 ? '#67e8f9' : (Math.random() < 0.5 ? '#a5f3fc' : '#e0f2fe'),
        vortex: true
      })
    }
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i]
      p.life -= dt
      if (p.vortex) {
        const dx = px - p.x
        const dy = py - p.y
        const a = Math.atan2(dy, dx) + 1.15
        p.vx = Math.cos(a) * 90 + dx * 2.2
        p.vy = Math.sin(a) * 90 + dy * 2.2
      }
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.life <= 0) this._particles.splice(i, 1)
    }
    if (fx.t >= fx.dur) this._finishQiVortex()
  },

  _finishQiVortex() {
    const fx = this._qiVortexFx
    if (!fx) return
    const nr = fx.realm
    const nextLv = fx.nextLv
    this._qiVortexFx = null
    this._realmLv = nextLv
    this._stageKills = 0
    this._burst(this._playerX, this._playerY + 8, '#67e8f9', 18)
    this._burst(this._playerX, this._playerY + 8, '#22d3ee', 10)
    this._syncRealmHud(nr)
    this._syncPlayerHpCap(nr)
    this._healPlayer(Math.floor(this._maxHp * 0.12))
    this._breakMute = 0.6
    this._persistProgress(true)
    console.log('仙途灵气旋涡入丹田完成', nr.name)
  },

  /** 同步头顶 HUD 境界/提示 */
  _syncRealmHud(realm) {
    const r = realm || realmByLv(this._realmLv)
    const combat = getRealmCombat(r.lv)
    this.setData({
      realmLv: r.lv,
      realmName: r.name,
      realmMajorName: r.majorName || r.name,
      realmTierName: r.tierName,
      realmTip: (combat && combat.tip) || r.tip || r.short || '',
      spaceUnlocked: isYuanyingPlus(r.lv),
      spaceForce: Math.floor(this._spaceForce || 0),
      maxSpaceForce: SPACE_FORCE_MAX
    })
  },

  /** 勇气：交锋积蓄，满则本境大招 / 大庚剑阵 */
  _tickWarIntent(dt) {
    if (this._isMortalCultivate() || this._over || this._perfect) return
    if (this._gengFx || this._spiritFx || this._breakFx) return
    if (this._breakMute > 0) return
    // 境主战时仍可积蓄勇气（样板境 + 元婴）
    if (this._bossActive && !isGuardianCombatRealm(this._realmLv)) return
    let fighting = false
    const list = this._zombies || []
    for (let i = 0; i < list.length; i++) {
      const z = list[i]
      if (z.state !== 'dead' && (z.emerge == null || z.emerge > 0.45)) {
        fighting = true
        break
      }
    }
    if (!fighting) return
    const combat = getRealmCombat(this._realmLv)
    const rate = combat && combat.warRate
      ? combat.warRate
      : (isYuanyingRealm(this._realmLv) ? WAR_INTENT_RATE_YUAN : WAR_INTENT_RATE)
    const before = this._corpseDan || 0
    this._corpseDan = Math.min(WAR_INTENT_NEED, before + rate * dt)
    if (Math.floor(this._corpseDan) !== Math.floor(before) || (before < WAR_INTENT_NEED && this._corpseDan >= WAR_INTENT_NEED)) {
      this.setData({
        corpseDan: Math.floor(this._corpseDan),
        corpseDanNeed: WAR_INTENT_NEED
      })
    }
    if (this._corpseDan >= WAR_INTENT_NEED) {
      this._corpseDan = 0
      this.setData({ corpseDan: 0 })
      this._startGengFormation()
    }
  },

  /** 经验满条：清小尸，召唤升级劫尸（境主样板境跳过） */
  _maybeStartBossChallenge() {
    if (isGuardianCombatRealm(this._realmLv)) return
    if (this._bossActive || this._perfect || this._over || this._breakFx || this._spiritFx) return
    if ((this._realmLv || 1) <= 1) return
    if ((this._realmLv || 1) >= REALMS.length) return
    const need = REALMS[this._realmLv].kills
    if (this._kills < need) return
    // 剑阵进行中延迟到结束后再召唤
    if (this._gengFx) {
      this._bossDeferred = true
      return
    }
    this._startBossChallenge()
  },

  _startBossChallenge() {
    if (this._bossActive || this._perfect || this._over) return
    this._bossDeferred = false
    const realm = realmByLv(this._realmLv)
    const zombies = this._zombies || []
    for (let i = 0; i < zombies.length; i++) {
      this._burst(zombies[i].x, zombies[i].y, '#1f2937', 8)
    }
    this._zombies = []
    this._gooShots = []
    this._gooPools = []
    this._demonCrescents = []
    this._focusZombie = null
    this._spawnAcc = 0
    this._bossActive = true

    const g = this._grassRect()
    const pos = this._clampToGrass(
      this._playerX < this._w * 0.5 ? g.maxX - 36 : g.minX + 36,
      (g.minY + g.maxY) * 0.55
    )
    const typeKey = pickMonsterKey(this._wave + 2, this._realmLv)
    const def = monsterDef(typeKey)
    const hpBars = bossHpBars(this._realmLv)
    const hpPerBar = Math.floor((70 + (this._realmLv || 1) * 28 + Math.floor(this._wave * 4)) * def.hpMul)
    const hp = hpPerBar * hpBars
    const r = (36 + Math.min(14, (this._realmLv || 1) * 1.5)) * def.rMul
    const boss = this._makeMonster({
      typeKey: typeKey,
      x: pos.x,
      y: pos.y,
      r: r,
      hp: hp,
      maxHp: hp,
      hpBars: hpBars,
      hpPerBar: hpPerBar,
      isBoss: true
    })
    boss.skillCd = 1.2
    this._zombies.push(boss)
    this._focusZombie = boss
    this._burst(pos.x, pos.y, def.tint || '#111827', 18)
    this._emitMonsterFx(boss, 'emerge', 1)
    wx.showToast({ title: def.name + '·劫降临！击败后突破', icon: 'none', duration: 1800 })
    console.log('仙途劫怪降临', { type: def.name, realm: realm.name, hp, bars: hpBars })
  },

  /** 击败劫尸/境主后：元婴后或随机心魔试炼；再播精神领域突破 */
  _onBossDefeated(opt) {
    this._bossActive = false
    this._gooShots = []
    this._gooPools = []
    this._demonCrescents = []
    this._enemySwords = []
    const zombies = this._zombies || []
    for (let i = 0; i < zombies.length; i++) {
      this._burst(zombies[i].x, zombies[i].y, '#fde68a', 8)
    }
    this._zombies = []
    this._swords = []
    this._focusZombie = null
    this._spawnAcc = 0

    // 一章一局：禁止破境链；境主章击败即通关
    if (this._chapterActive) {
      if (this._chapter && this._chapter.mode === 'boss') {
        this._chapterBossDown = true
        this._onChapterCleared()
      }
      return
    }

    // 已在道祖且心魔/境主已尽 → 大圆满
    if ((this._realmLv || 1) >= REALMS.length) {
      this._breakMute = 2
      this._onRealmBreakthrough(realmByLv(REALMS.length))
      this._persistProgress(true)
      return
    }

    // 元婴之后：击杀境主后随机出现主角黑色心魔（可与主角飞剑互挡）
    const skipHeart = !!(opt && opt.skipHeartDemon)
    const curMajor = realmByLv(this._realmLv).majorIndex || 0
    if (!skipHeart && curMajor > yuanyingMajorIndex()) {
      const chance = Math.min(0.92, 0.62 + (curMajor - yuanyingMajorIndex()) * 0.05)
      if (Math.random() < chance) {
        this._spawnHeartDemonClone()
        return
      }
    }

    const nextLv = Math.min(REALMS.length, (this._realmLv || 1) + 1)
    const nr = realmByLv(nextLv)
    this._breakMute = 12
    this._ensureSpiritImages()
    this._spiritFx = {
      t: 0,
      nextLv: nextLv,
      realm: nr,
      sjDur: 1.8,
      sj02Dur: 2.0,
      absorbDur: 2.1
    }
    console.log('仙途精神领域展开', nr.name, {
      sj: !!this._spiritSjImg,
      sj02: !!this._spiritSj02Img
    })
  },

  /**
   * 心魔·黑影：按主角体型生成全黑剪影（血红眼+尖牙），黑飞剑与主角互挡
   */
  _spawnHeartDemonClone() {
    const realm = realmByLv(this._realmLv)
    const kit = getHeartDemonKit(realm.lv)
    const hpBars = kit.hpBars
    const hpPerBar = kit.hpPerBar
    const hp = hpBars * hpPerBar
    const r = Math.min(34, 26 * Math.min(1.35, realm.bodyScale || 1))
    let pos = this._spawnPointOnGrass()
    const pdx = pos.x - this._playerX
    const pdy = pos.y - this._playerY
    if (pdx * pdx + pdy * pdy < 100 * 100) {
      pos = this._spawnPointOnGrass()
    }
    pos = this._clampToGrass(pos.x, pos.y)
    const clone = this._makeMonster({
      typeKey: 'shadow_self',
      x: pos.x,
      y: pos.y,
      r: r,
      hp: hp,
      maxHp: hp,
      hpBars: hpBars,
      hpPerBar: hpPerBar,
      isBoss: true
    })
    clone.isRealmGuardian = true
    clone.isHeartDemon = true
    clone.isShadowSelf = true
    clone.isDemon = true
    clone.typeName = '心魔·黑影'
    clone.resistSkills = true
    clone.blockCdMax = kit.blockCdMax
    clone.blockDuration = kit.blockDuration
    clone.dmgResist = kit.dmgResist
    clone.atk = 'mirror_hero'
    clone.atkRange = 300
    clone.skillCd = 0.35
    clone.swordAcc = 0
    clone.swordEvery = kit.swordEvery
    clone.swordCount = kit.swordCount
    clone.mirrorBlink = !!kit.mirrorBlink
    clone.crescentColor = '#7f1d1d'
    clone.crescentGlow = '#fecaca'
    clone.tint = '#0a0a0a'
    clone.glow = '#7f1d1d'
    clone.alphaMul = 1
    clone.emerge = 0.35
    this._zombies.push(clone)
    this._focusZombie = clone
    this._bossActive = true
    this._breakMute = 0.6
    this._burst(pos.x, pos.y, '#7f1d1d', 20)
    this._burst(pos.x, pos.y, '#0a0a0a', 12)
    wx.showToast({ title: '心魔现世 · 黑影持剑', icon: 'none', duration: 2000 })
    console.log('仙途心魔黑影', { realm: realm.name, hp, swords: kit.swordCount })
  },

  /** 精神领域图缺失时补载（不阻塞演出） */
  _ensureSpiritImages() {
    const canvas = this._canvas
    if (!canvas) return
    if (!this._realmFxImgs) this._realmFxImgs = {}
    const load = (src, onOk) => {
      const img = canvas.createImage()
      img.onload = () => onOk(img)
      img.onerror = () => {
        console.warn('精神领域图加载失败', src)
      }
      img.src = src
    }
    if (!this._spiritSjImg) {
      load(SPIRIT_SJ_PATH, (img) => {
        this._spiritSjImg = img
        console.log('精神领域图就绪 _spiritSjImg', img.width, img.height)
      })
    }
    if (!this._spiritSj02Img) {
      load(SPIRIT_SJ02_PATH, (img) => {
        this._spiritSj02Img = img
        console.log('精神领域图就绪 _spiritSj02Img', img.width, img.height)
      })
    }
    if (!this._grassImg) {
      load(GRASS_PATH, (img) => {
        this._grassImg = img
      })
    }
    const keys = REALM_FX_KEYS
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (this._realmFxImgs[key]) continue
      load(REALM_FX_PATHS[key], ((k) => (img) => {
        this._realmFxImgs[k] = img
      })(key))
    }
  },

  /** 精神领域演出：sj → sj02 → 化光入眉心 → 突破 */
  _updateSpiritDomain(dt) {
    const fx = this._spiritFx
    if (!fx) return
    fx.t += dt
    this._animT += dt
    const total = fx.sjDur + fx.sj02Dur + fx.absorbDur
    const absorbStart = fx.sjDur + fx.sj02Dur
    if (fx.t >= absorbStart && fx.t < total) {
      const u = (fx.t - absorbStart) / fx.absorbDur
      // 落线阶段：粒子沿中轴汇向圆心
      if (u < 0.72 && Math.random() < 0.4) {
        const cx = this._w * 0.5
        const cy = this._h * 0.48
        const tipY = cy * (u / 0.72)
        this._particles.push({
          x: cx + (Math.random() - 0.5) * 10,
          y: tipY - 8 - Math.random() * 24,
          vx: (Math.random() - 0.5) * 12,
          vy: 40 + Math.random() * 50,
          life: 0.28,
          color: '#fffbeb'
        })
      }
    }
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i]
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.life <= 0) this._particles.splice(i, 1)
    }
    if (fx.t >= total) {
      this._finishSpiritDomain()
    }
  },

  _finishSpiritDomain() {
    const fx = this._spiritFx
    if (!fx) return
    const nr = fx.realm
    const nextLv = fx.nextLv
    this._spiritFx = null
    this._realmLv = nextLv
    this._stageKills = 0
    this._syncRealmHud(nr)
    this._burst(this._playerX, this._playerY - 30, '#fff7ed', 28)
    console.log('仙途劫尸击败，突破', nr.name)
    this._onRealmBreakthrough(nr)
    this._ensureHelper()
    this._persistProgress(true)
  },

  /** 元婴起召唤灵狐帮手（跟随飘游 + 化作流光突袭） */
  /** 灵狐已关闭 */
  _ensureHelper() {
    this._helper = null
  },

  _updateHelper(dt, realm) {
    this._helper = null
  },

  _helperSkillHit(h, realm) {},

  _drawHelper(ctx) {},

  /** 各类怪物战斗 AI（含升级前随机 Boss） */
  _updateMonsterCombat(z, dt, realm, baseSpeed) {
    if ((z.iceT || 0) > 0) {
      z.state = 'idle'
      return
    }
    if ((z.windT || 0) > 0) {
      z.state = 'idle'
      z.windA = (z.windA || 0) + dt * 2.4
      const wr = z.windR || 36
      z.x = (z.windCx || z.x) + Math.cos(z.windA) * wr
      z.y = (z.windCy || z.y) + Math.sin(z.windA) * wr * 0.55
      z.floatY = 22 + Math.sin(this._animT * 6 + z.id) * 6
      return
    }
    if (this._gengFx) {
      z.state = 'idle'
      return
    }

    z.skillCd = (z.skillCd || 0) - dt
    z.phaseCd = (z.phaseCd || 0) - dt
    // 隐身符：怪物找不到目标，原地徘徊
    if ((this._playerHideT || 0) > 0) {
      z.state = 'walk'
      z.facing = (z.facing || 0) + dt * 1.2
      z.x += Math.cos(z.facing) * (baseSpeed * 0.25) * dt
      z.y += Math.sin(z.facing) * (baseSpeed * 0.25) * dt
      const c = this._clampToGrass(z.x, z.y)
      z.x = c.x
      z.y = c.y
      return
    }
    const dx = this._playerX - z.x
    const dy = this._playerY - z.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    z.facing = Math.atan2(dy, dx)
    const atk = z.atk || 'melee'
    const dmgBase = (z.isBoss ? 12 + realm.lv * 2.6 : 8 + realm.lv * 1.8) * (z.dmgMul || 1)
    const range = (z.atkRange || 18) + (z.isBoss ? 6 : 0)

    if (z.state === 'skill') {
      z.skillT = (z.skillT || 0) + dt
      if (atk === 'spit') {
        if (z.skillT >= 0.2 && !z.skillFired) {
          z.skillFired = true
          this._fireBossGoo(z, realm, z.isBoss ? 1 : 0.55)
          this._emitMonsterFx(z, 'attack', 1)
        }
        if (z.skillT >= 0.85) {
          z.state = 'walk'
          z.skillCd = z.isBoss ? Math.max(2.2, 3.4 - realm.lv * 0.08) : 2.6
          z.skillFired = false
          z.skillT = 0
        }
        return
      }
      if (atk === 'scream') {
        if (z.skillT >= 0.28 && !z.skillFired) {
          z.skillFired = true
          this._emitMonsterFx(z, 'attack', 1)
          if (dist <= range) this._hurtPlayer(dmgBase * 0.85, z.x, z.y)
        }
        if (z.skillT >= 0.75) {
          z.state = 'walk'
          z.skillCd = z.isBoss ? 2.8 : 3.2
          z.skillFired = false
          z.skillT = 0
        }
        return
      }
      if (atk === 'slam') {
        if (z.skillT >= 0.35 && !z.skillFired) {
          z.skillFired = true
          this._emitMonsterFx(z, 'attack', 1)
          if (dist <= range + 10) this._hurtPlayer(dmgBase * 1.25, z.x, z.y)
        }
        if (z.skillT >= 0.9) {
          z.state = 'walk'
          z.skillCd = z.isBoss ? 2.4 : 2.8
          z.skillFired = false
          z.skillT = 0
        }
        return
      }
      if (atk === 'crescent') {
        if (z.skillT >= 0.22 && !z.skillFired) {
          z.skillFired = true
          this._emitMonsterFx(z, 'attack', 1)
          this._fireDemonCrescent(z, realm, dmgBase)
        }
        if (z.skillT >= 0.7) {
          z.state = 'walk'
          z.skillCd = Math.max(1.05, (z.blockCdMax || 0.4) * 4.2)
          z.skillFired = false
          z.skillT = 0
        }
        return
      }
      if (atk === 'phase') {
        // 虚空/时间：闪现贴近后撕裂斩
        if (z.skillT >= 0.15 && !z.skillFired) {
          z.skillFired = true
          const ang = Math.atan2(dy, dx)
          const g = this._clampToGrass(
            this._playerX - Math.cos(ang) * 42,
            this._playerY - Math.sin(ang) * 42
          )
          this._burst(z.x, z.y, z.tint || '#2dd4bf', 8)
          z.x = g.x
          z.y = g.y
          this._burst(g.x, g.y, z.crescentGlow || '#99f6e4', 10)
          this._emitMonsterFx(z, 'attack', 1)
          this._hurtPlayer(dmgBase * 1.05, z.x, z.y)
        }
        if (z.skillT >= 0.65) {
          z.state = 'walk'
          z.skillCd = Math.max(1.2, 2.4 - (realm.majorIndex || 0) * 0.08)
          z.skillFired = false
          z.skillT = 0
        }
        return
      }
      if (atk === 'claw') {
        if (z.skillT >= 0.2 && !z.skillFired) {
          z.skillFired = true
          this._emitMonsterFx(z, 'attack', 1)
          if (dist <= range + 8) this._hurtPlayer(dmgBase * 1.1, z.x, z.y)
        }
        if (z.skillT >= 0.55) {
          z.state = 'walk'
          z.skillCd = 1.6
          z.skillFired = false
          z.skillT = 0
        }
        return
      }
      // 心魔黑影：镜像主角御剑
      if (atk === 'mirror_hero') {
        if (z.skillT >= 0.12 && !z.skillFired) {
          z.skillFired = true
          this._emitMonsterFx(z, 'attack', 1)
          this._fireShadowSwords(z, realm)
          if (z.mirrorBlink && Math.random() < 0.45) {
            const ang = Math.atan2(this._playerY - z.y, this._playerX - z.x)
            const nx = this._playerX - Math.cos(ang) * 48
            const ny = this._playerY - Math.sin(ang) * 48
            const g = this._clampToGrass(nx, ny)
            this._spawnBlinkFx(z.x, z.y, g.x, g.y, realm)
            z.x = g.x
            z.y = g.y
            this._burst(g.x, g.y, '#7f1d1d', 10)
          }
        }
        if (z.skillT >= 0.55) {
          z.state = 'walk'
          z.skillCd = 0.2
          z.skillFired = false
          z.skillT = 0
        }
        return
      }
      // dash / phase 收尾
      if (z.skillT >= 0.55) {
        z.state = 'walk'
        z.skillCd = 1.6
        z.skillFired = false
        z.skillT = 0
        z.dashT = 0
      }
      return
    }

    if (z.state === 'attack') {
      const atkLen = z.isBoss ? 0.55 : (ANIM_DEFS.attack.paths.length / ANIM_DEFS.attack.fps)
      if (z.frameT >= atkLen * 0.45 && !z.hitDone) {
        z.hitDone = true
        this._emitMonsterFx(z, 'attack', 0.8)
        this._hurtPlayer(dmgBase, z.x, z.y)
      }
      if (z.frameT >= atkLen) {
        z.state = 'walk'
        z.frameT = 0
        z.hitDone = false
      }
      return
    }

    // 疾尸冲刺段
    if ((z.dashT || 0) > 0) {
      z.dashT -= dt
      z.state = 'skill'
      const spd = (baseSpeed * 3.2 + z.speedBonus) * dt
      z.x += (dx / dist) * spd
      z.y += (dy / dist) * spd
      const clamped = this._clampToGrass(z.x, z.y, Math.min(32, (z.r || 16) * 0.5))
      z.x = clamped.x
      z.y = clamped.y
      if (dist <= z.r + 16 && !z.skillFired) {
        z.skillFired = true
        this._hurtPlayer(dmgBase * 1.1, z.x, z.y)
        this._emitMonsterFx(z, 'attack', 1)
      }
      return
    }

    z.floatY = 0
    z.state = 'walk'
    const slow = (z.timeSlow || 0) > 0 ? 0.35 : 1
    let moveMul = (z.speedMul || 1) * (z.isBoss ? 0.78 : 1) * slow
    const gMove = z.gMove || ''
    // 境主移动：按说明区分步态
    if (z.isRealmGuardian && gMove) {
      if (gMove === 'puppet') {
        // 傀儡：顿挫迈步
        moveMul *= (Math.floor((this._animT || 0) * 4) % 2 === 0) ? 1.15 : 0.35
      } else if (gMove === 'float' || gMove === 'time' || gMove === 'void') {
        z.floatY = 10 + Math.sin((this._animT || 0) * 3.2 + z.id) * 6
        moveMul *= gMove === 'void' ? 0.92 : 0.85
      } else if (gMove === 'heavy' || gMove === 'chaos') {
        moveMul *= 0.62
        if (Math.sin((this._animT || 0) * 2.2) > 0.7) moveMul *= 1.4
      } else if (gMove === 'demon' || gMove === 'warp') {
        moveMul *= 1.05
        if (gMove === 'warp' && Math.random() < 0.012) {
          const ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.2
          const hop = 36 + Math.random() * 28
          const g = this._clampToGrass(z.x + Math.cos(ang) * hop, z.y + Math.sin(ang) * hop)
          this._burst(z.x, z.y, z.tint || '#a78bfa', 6)
          z.x = g.x
          z.y = g.y
        }
      } else if (gMove === 'storm') {
        moveMul *= 1.12
        z.floatY = 4 + Math.abs(Math.sin((this._animT || 0) * 8)) * 5
      } else if (gMove === 'shamble') {
        moveMul *= 0.9 + Math.sin((this._animT || 0) * 5) * 0.08
      }
    }
    const spd = (baseSpeed * moveMul + z.speedBonus) * dt
    z.x += (dx / dist) * spd
    z.y += (dy / dist) * spd
    // 按体型内缩，避免大半身子贴出屏幕边
    const clamped = this._clampToGrass(z.x, z.y, Math.min(32, (z.r || 16) * 0.5))
    z.x = clamped.x
    z.y = clamped.y
    if ((z.floatY || 0) > 14) z.floatY = 14

    if (atk === 'spit' && (z.skillCd || 0) <= 0 && dist < range && dist > 50) {
      z.state = 'skill'
      z.skillT = 0
      z.skillFired = false
      z.frameT = 0
      z.atkFx = { style: 'spit', t: 0, dur: 0.9 }
      return
    }
    if (atk === 'scream' && (z.skillCd || 0) <= 0 && dist < range) {
      z.state = 'skill'
      z.skillT = 0
      z.skillFired = false
      z.frameT = 0
      z.atkFx = { style: 'scream', t: 0, dur: 0.8 }
      return
    }
    if (atk === 'slam' && (z.skillCd || 0) <= 0 && dist < range + 24) {
      z.state = 'skill'
      z.skillT = 0
      z.skillFired = false
      z.frameT = 0
      z.atkFx = { style: 'slam', t: 0, dur: 0.95 }
      return
    }
    if (atk === 'crescent' && (z.skillCd || 0) <= 0 && dist < range && dist > 36) {
      z.state = 'skill'
      z.skillT = 0
      z.skillFired = false
      z.frameT = 0
      z.atkFx = { style: 'crescent', t: 0, dur: 0.75 }
      return
    }
    if (atk === 'phase' && (z.skillCd || 0) <= 0 && dist < range + 40) {
      z.state = 'skill'
      z.skillT = 0
      z.skillFired = false
      z.frameT = 0
      z.atkFx = { style: 'phase', t: 0, dur: 0.7 }
      return
    }
    if (atk === 'claw' && (z.skillCd || 0) <= 0 && dist < range + 12) {
      z.state = 'skill'
      z.skillT = 0
      z.skillFired = false
      z.frameT = 0
      z.atkFx = { style: 'claw', t: 0, dur: 0.6 }
      return
    }
    if (atk === 'mirror_hero' && (z.skillCd || 0) <= 0) {
      z.swordAcc = (z.swordAcc || 0) + dt
      if (z.swordAcc >= (z.swordEvery || 0.45)) {
        z.swordAcc = 0
        z.state = 'skill'
        z.skillT = 0
        z.skillFired = false
        z.frameT = 0
        z.atkFx = { style: 'mirror', t: 0, dur: 0.6 }
      }
      return
    }
    if (atk === 'dash' && (z.skillCd || 0) <= 0 && dist < 160 && dist > 40) {
      z.dashT = 0.42
      z.skillCd = z.isBoss ? 2.2 : 2.6
      z.skillFired = false
      z.state = 'skill'
      z.skillT = 0
      this._emitMonsterFx(z, 'attack', 0.5)
      return
    }
    if (atk === 'phase' && (z.phaseCd || 0) <= 0 && dist > 55 && dist < 200) {
      const hop = Math.min(90, dist * 0.55)
      z.x += (dx / dist) * hop
      z.y += (dy / dist) * hop
      const c2 = this._clampToGrass(z.x, z.y)
      z.x = c2.x
      z.y = c2.y
      z.phaseCd = z.isBoss ? 1.8 : 2.4
      z.state = 'skill'
      z.skillT = 0
      z.skillFired = true
      this._emitMonsterFx(z, 'attack', 0.7)
      return
    }
    if (dist <= z.r + (z.atkRange || 18) * 0.55) {
      z.state = 'attack'
      z.frameT = 0
      z.hitDone = false
      z.atkFx = { style: z.atk || 'melee', t: 0, dur: z.isBoss ? 0.6 : 0.48 }
    }
  },

  /** 黑液喷吐：弹道 + 落地毒潭；scale 控制普通喷尸威力 */
  _fireBossGoo(z, realm, scale) {
    const sc = scale == null ? 1 : scale
    const dx = this._playerX - z.x
    const dy = this._playerY - z.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const ux = dx / dist
    const uy = dy / dist
    if (!this._gooShots) this._gooShots = []
    const n = sc > 0.8 ? 6 : 3
    for (let i = 0; i < n; i++) {
      const spread = (i - (n - 1) / 2) * 0.08
      const c = Math.cos(spread)
      const s = Math.sin(spread)
      const vx = (ux * c - uy * s) * (140 + i * 10) * (0.85 + sc * 0.2)
      const vy = (ux * s + uy * c) * (140 + i * 10) * (0.85 + sc * 0.2)
      this._gooShots.push({
        x: z.x + ux * (z.r * 0.55),
        y: z.y + uy * (z.r * 0.25) - 8,
        vx,
        vy,
        r: (7 + i * 1.2) * sc,
        life: 1.05,
        dmg: Math.max(3, Math.floor((5 + realm.lv * 1.6) * sc * (z.dmgMul || 1)))
      })
    }
    this._burst(z.x + ux * 20, z.y + uy * 12, z.tint || '#0f172a', 8)
  },

  /** 怪物出场 / 受伤 / 死亡 / 攻击差异化特效 */
  _emitMonsterFx(z, kind, power) {
    if (!z) return
    const p = power == null ? 1 : power
    const style = kind === 'emerge' ? z.emergeStyle
      : (kind === 'hurt' ? z.hurtStyle
        : (kind === 'death' ? z.deathStyle : z.atk))
    const color = z.tint || '#86efac'
    const n = Math.floor(8 * p + (z.isBoss ? 8 : 2))
    const x = z.x
    const y = z.y - (z.floatY || 0)
    if (kind === 'attack') {
      z.atkFx = { style: z.atk || 'melee', t: 0, dur: z.isBoss ? 0.55 : 0.42 }
    }
    if (kind === 'emerge') {
      if (style === 'dirt' || style === 'quake') {
        for (let i = 0; i < n; i++) {
          this._particles.push({
            x: x + (Math.random() - 0.5) * 28, y: y + 10,
            vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 50,
            life: 0.35 + Math.random() * 0.25, color: style === 'quake' ? '#a8a29e' : '#92400e'
          })
        }
      } else if (style === 'burst') {
        this._burst(x, y, color, 10 + Math.floor(8 * p))
      } else if (style === 'goo') {
        this._burst(x, y, '#312e81', 10)
      } else if (style === 'fade') {
        for (let i = 0; i < n; i++) {
          this._particles.push({
            x: x, y: y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
            life: 0.5, color: '#a5f3fc'
          })
        }
      } else if (style === 'howl') {
        this._burst(x, y, '#f9a8d4', 14)
      }
      return
    }
    if (kind === 'hurt') {
      if (style === 'slash') this._burst(x, y - 4, '#bbf7d0', 8)
      else if (style === 'ink') this._burst(x, y, '#4c1d95', 9)
      else if (style === 'crack') this._burst(x, y, '#fdba74', 10)
      else if (style === 'ripple') this._burst(x, y, '#67e8f9', 9)
      else if (style === 'pulse') this._burst(x, y, '#f472b6', 9)
      else this._burst(x, y, color, 7)
      return
    }
    if (kind === 'death') {
      if (style === 'explode') this._burst(x, y, '#fb7185', 22)
      else if (style === 'vanish') {
        for (let i = 0; i < 16; i++) {
          const a = (Math.PI * 2 * i) / 16
          this._particles.push({
            x: x, y: y, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80,
            life: 0.5, color: '#cffafe'
          })
        }
      } else if (style === 'rift') {
        // 虚空裂隙死亡：黑缝撕开再收束
        for (let i = 0; i < 18; i++) {
          const a = (Math.PI * 2 * i) / 18
          this._particles.push({
            x: x, y: y,
            vx: Math.cos(a) * (40 + Math.random() * 90),
            vy: Math.sin(a) * (40 + Math.random() * 90),
            life: 0.55 + Math.random() * 0.25,
            color: i % 2 ? '#0f172a' : '#67e8f9'
          })
        }
        this._burst(x, y, '#2dd4bf', 14)
      } else if (style === 'rubble') this._burst(x, y, '#a8a29e', 18)
      else if (style === 'splatter') this._burst(x, y, '#312e81', 16)
      else if (style === 'scatter') this._burst(x, y, '#4ade80', 16)
      else this._burst(x, y, color, 14)
      return
    }
    // attack burst：按攻击类型加方向粒子，配合动作立绘
    const ang = z.facing || 0
    const ux = Math.cos(ang)
    const uy = Math.sin(ang)
    if (style === 'dash') {
      this._burst(x, y, '#86efac', 12)
      for (let i = 0; i < 10; i++) {
        this._particles.push({
          x: x - ux * (8 + i * 3), y: y - uy * (4 + i * 2),
          vx: -ux * (40 + Math.random() * 60), vy: -uy * (20 + Math.random() * 40) + (Math.random() - 0.5) * 30,
          life: 0.25 + Math.random() * 0.2, color: '#bbf7d0'
        })
      }
    } else if (style === 'spit') {
      this._burst(x + ux * 16, y + uy * 10, '#7c3aed', 12)
      for (let i = 0; i < 8; i++) {
        this._particles.push({
          x: x + ux * 18, y: y + uy * 8 - 4,
          vx: ux * (30 + Math.random() * 50) + (Math.random() - 0.5) * 40,
          vy: uy * (20 + Math.random() * 40) - 20 - Math.random() * 30,
          life: 0.35, color: i % 2 ? '#a78bfa' : '#312e81'
        })
      }
    } else if (style === 'slam') {
      this._burst(x, y + 8, '#fb923c', 18)
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI * 2 * i) / 12
        this._particles.push({
          x: x, y: y + 10,
          vx: Math.cos(a) * (60 + Math.random() * 40), vy: Math.sin(a) * 20 - 30 - Math.random() * 40,
          life: 0.4, color: i % 2 ? '#fdba74' : '#a8a29e'
        })
      }
    } else if (style === 'phase') {
      this._burst(x, y, '#22d3ee', 14)
      for (let i = 0; i < 10; i++) {
        this._particles.push({
          x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
          life: 0.45, color: '#a5f3fc'
        })
      }
    } else if (style === 'scream') {
      this._burst(x, y, '#f472b6', 16)
      for (let i = 0; i < 14; i++) {
        const a = (Math.PI * 2 * i) / 14
        this._particles.push({
          x: x, y: y,
          vx: Math.cos(a) * (70 + Math.random() * 40), vy: Math.sin(a) * (70 + Math.random() * 40),
          life: 0.35, color: i % 2 ? '#f9a8d4' : '#fb7185'
        })
      }
    } else {
      this._burst(x + ux * 10, y + uy * 6, color, 12)
      for (let i = -2; i <= 2; i++) {
        const a = ang + i * 0.28
        this._particles.push({
          x: x, y: y,
          vx: Math.cos(a) * (50 + Math.random() * 40), vy: Math.sin(a) * (50 + Math.random() * 40),
          life: 0.28, color: '#bbf7d0'
        })
      }
    }
  },

  _updateGoo(dt, realm) {
    const shots = this._gooShots || []
    for (let i = shots.length - 1; i >= 0; i--) {
      const g = shots[i]
      g.life -= dt
      g.x += g.vx * dt
      g.y += g.vy * dt
      g.vy += 40 * dt
      const pdx = g.x - this._playerX
      const pdy = g.y - this._playerY
      if (pdx * pdx + pdy * pdy < (18 + g.r) * (18 + g.r)) {
        this._hurtPlayer(g.dmg, g.x, g.y)
        this._spawnGooPool(g.x, g.y, realm)
        shots.splice(i, 1)
        continue
      }
      if (g.life <= 0) {
        this._spawnGooPool(g.x, g.y, realm)
        shots.splice(i, 1)
      }
    }
    const pools = this._gooPools || []
    for (let i = pools.length - 1; i >= 0; i--) {
      const p = pools[i]
      p.life -= dt
      p.tick = (p.tick || 0) - dt
      if (p.tick <= 0) {
        p.tick = 0.45
        const dx = p.x - this._playerX
        const dy = p.y - this._playerY
        if (dx * dx + dy * dy < (p.r + 14) * (p.r + 14)) {
          this._hurtPlayer(p.dmg, p.x, p.y)
        }
      }
      if (p.life <= 0) pools.splice(i, 1)
    }
  },

  _spawnGooPool(x, y, realm) {
    if (!this._gooPools) this._gooPools = []
    const p = this._clampToGrass(x, y)
    this._gooPools.push({
      x: p.x,
      y: p.y,
      r: 22 + Math.min(10, realm.lv),
      life: 3.2,
      tick: 0.2,
      dmg: 4 + Math.floor(realm.lv * 1.2)
    })
  },

  /** 魔族/境主主动月牙魔气弹（心魔用暗红） */
  _fireDemonCrescent(z, realm, dmgBase) {
    if (!this._demonCrescents) this._demonCrescents = []
    const dx = this._playerX - z.x
    const dy = this._playerY - (z.y - (z.floatY || 0))
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const speed = 145 + realm.lv * 4
    const col = z.crescentColor || '#4c1d95'
    this._demonCrescents.push({
      id: (this._nextCrescentId = (this._nextCrescentId || 1) + 1),
      mode: 'attack',
      x: z.x + (dx / dist) * (z.r * 0.55),
      y: z.y - (z.floatY || 0) - 6 + (dy / dist) * (z.r * 0.2),
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      ang: Math.atan2(dy, dx),
      life: 2.4 + Math.min(1.2, (z.blockDuration || 0.7) * 0.5),
      r: 16,
      dmg: Math.max(5, Math.floor((dmgBase || 10) * 0.75)),
      ownerId: z.id,
      color: col,
      glow: z.crescentGlow || '#a78bfa'
    })
    this._burst(z.x, z.y - 8, col, 8)
  },

  /** 心魔镜像飞剑：黑色剑气；可与主角飞剑对撞抵消 */
  _fireShadowSwords(z, realm) {
    if (!this._enemySwords) this._enemySwords = []
    const n = Math.max(1, Math.min(8, z.swordCount || 3))
    const dx = this._playerX - z.x
    const dy = this._playerY - (z.y - 10)
    const base = Math.atan2(dy, dx)
    const spread = Math.min(1.1, 0.14 * n)
    const orbitR = 18
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + (this._animT || 0)
      const ang = n === 1 ? base : (base - spread / 2 + (i / Math.max(1, n - 1)) * spread)
      this._enemySwords.push({
        x: z.x + Math.cos(a) * orbitR * 0.3,
        y: z.y - 12 + Math.sin(a) * orbitR * 0.2,
        angle: ang,
        speed: 255 + realm.lv * 14,
        life: 3.2,
        dmg: 5 + Math.floor(realm.lv * 0.95),
        color: '#0a0a0a',
        ownerId: z.id
      })
    }
    this._burst(z.x, z.y - 8, '#1c1917', 6)
    this._burst(z.x, z.y - 8, '#7f1d1d', 4)
  },

  _updateEnemySwords(dt) {
    const list = this._enemySwords || []
    const playerSwords = this._swords || []
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i]
      s.life -= dt
      s.x += Math.cos(s.angle) * s.speed * dt
      s.y += Math.sin(s.angle) * s.speed * dt

      // 与主角飞剑互挡：对撞双方消失
      let clashed = false
      for (let pi = playerSwords.length - 1; pi >= 0; pi--) {
        const ps = playerSwords[pi]
        if (ps.mode === 'return' || ps.mode === 'stalemate') continue
        const dx = ps.x - s.x
        const dy = ps.y - s.y
        if (dx * dx + dy * dy < 22 * 22) {
          this._burst(s.x, s.y, '#f8fafc', 8)
          this._burst(s.x, s.y, '#7f1d1d', 6)
          ps.mode = 'return'
          ps.life = Math.min(ps.life || 2, 1.2)
          list.splice(i, 1)
          clashed = true
          break
        }
      }
      if (clashed) continue

      const pdx = s.x - this._playerX
      const pdy = s.y - this._playerY
      if (pdx * pdx + pdy * pdy < 20 * 20) {
        this._hurtPlayer(s.dmg, s.x, s.y)
        this._burst(s.x, s.y, '#7f1d1d', 8)
        list.splice(i, 1)
        continue
      }
      if (s.life <= 0 || s.x < -40 || s.y < -40 || s.x > this._w + 40 || s.y > this._h + 40) {
        list.splice(i, 1)
      }
    }
  },

  _drawEnemySwords(ctx) {
    const list = this._enemySwords || []
    for (let i = 0; i < list.length; i++) {
      const s = list[i]
      ctx.save()
      ctx.translate(s.x, s.y)
      ctx.rotate(s.angle)
      // 黑剑 + 暗红刃光
      this._paintInkSword(ctx, '#0a0a0a', 1)
      ctx.globalAlpha = 0.55
      ctx.strokeStyle = '#7f1d1d'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(-6, 0)
      ctx.lineTo(16, 0)
      ctx.stroke()
      ctx.restore()
    }
  },

  /**
   * 魔族/境主抵挡飞剑：月牙魔气与剑在空中僵持后消散
   * @returns {boolean} 是否成功抵挡
   */
  _tryDemonBlockSword(z, s) {
    if (!z || !s || !z.resistSkills) return false
    if (s.mode === 'stalemate' || s.mode === 'return') return false
    // 冷却：同一剑短时不重复挡
    if (s._blockCd && s._blockCd > (this._animT || 0)) return false
    if ((z.blockCd || 0) > 0) return false
    const blockDur = z.blockDuration || 0.72
    z.blockCd = z.blockCdMax || 0.38
    if (!this._demonCrescents) this._demonCrescents = []
    // 月牙迎向剑尖，空中僵持（时长随境界增长）
    const tipX = s.x + Math.cos(s.angle || 0) * 12
    const tipY = s.y + Math.sin(s.angle || 0) * 12
    const midX = tipX * 0.65 + z.x * 0.35
    const midY = tipY * 0.65 + (z.y - (z.floatY || 0)) * 0.35
    const ang = Math.atan2(tipY - (z.y - (z.floatY || 0)), tipX - z.x)
    const col = z.crescentColor || '#7c3aed'
    const glow = z.crescentGlow || '#a78bfa'
    // 抵挡外形随境主档：骨盾/傀儡丝/金丹/月牙/虚空缝等
    const block = z.gBlock || 'moon'
    let r = 18 + Math.min(8, blockDur * 6)
    let shape = 'crescent'
    if (block === 'bone' || block === 'puppet') { r += 2; shape = 'arc' }
    else if (block === 'jindan' || block === 'lei') { shape = 'ring' }
    else if (block === 'void' || block === 'dao' || block === 'time') { shape = 'rift' }
    else if (block === 'tri') { shape = 'triple' }
    this._demonCrescents.push({
      id: (this._nextCrescentId = (this._nextCrescentId || 1) + 1),
      mode: 'block',
      blockShape: shape,
      x: midX,
      y: midY,
      vx: 0,
      vy: 0,
      ang: ang,
      life: blockDur,
      r: r,
      dmg: 0,
      ownerId: z.id,
      swordRef: s,
      color: col,
      glow: glow
    })
    s.mode = 'stalemate'
    s.stalemateT = blockDur
    s.hitIds = s.hitIds || {}
    s.hitIds[z.id] = 1
    s._blockCd = (this._animT || 0) + blockDur + 0.05
    this._burst(midX, midY, col, 8)
    this._burst(midX, midY, glow, 5)
    return true
  },

  _updateDemonCrescents(dt, realm) {
    const list = this._demonCrescents || []
    // 魔族挡招冷却
    for (let zi = 0; zi < (this._zombies || []).length; zi++) {
      const z = this._zombies[zi]
      if ((z.blockCd || 0) > 0) z.blockCd = Math.max(0, z.blockCd - dt)
    }
    for (let i = list.length - 1; i >= 0; i--) {
      const c = list[i]
      c.life -= dt
      if (c.mode === 'attack') {
        c.x += c.vx * dt
        c.y += c.vy * dt
        // 飞剑可挡月牙
        let blocked = false
        const swords = this._swords || []
        for (let si = 0; si < swords.length; si++) {
          const s = swords[si]
          if (s.mode === 'stalemate' || s.mode === 'return') continue
          const dx = s.x - c.x
          const dy = s.y - c.y
          if (dx * dx + dy * dy < (c.r + 12) * (c.r + 12)) {
            blocked = true
            this._burst(c.x, c.y, '#a78bfa', 8)
            s.hitIds = s.hitIds || {}
            break
          }
        }
        if (blocked) {
          list.splice(i, 1)
          continue
        }
        const pdx = c.x - this._playerX
        const pdy = c.y - this._playerY
        if (pdx * pdx + pdy * pdy < (18 + c.r) * (18 + c.r)) {
          this._hurtPlayer(c.dmg, c.x, c.y)
          this._burst(c.x, c.y, '#581c87', 10)
          list.splice(i, 1)
          continue
        }
      } else if (c.mode === 'block') {
        // 与剑一起微颤
        c.x += Math.sin((this._animT || 0) * 40) * 0.45
        c.y += Math.cos((this._animT || 0) * 36) * 0.35
        if (c.swordRef) {
          c.swordRef.x = c.x + Math.cos(c.ang) * 10
          c.swordRef.y = c.y + Math.sin(c.ang) * 10
        }
      }
      if (c.life <= 0) list.splice(i, 1)
    }
  },

  /**
   * 大招：勇气满触发
   * 元婴专属大庚剑阵（经典圆阵剑尖朝内）；其余境界用本境招式
   */
  _startGengFormation() {
    if (this._perfect || this._over) return
    if (this._bossActive && !isGuardianCombatRealm(this._realmLv)) return
    let alive = 0
    for (let i = 0; i < (this._zombies || []).length; i++) {
      if (this._zombies[i].state !== 'dead') alive++
    }
    if (!alive) this._spawnZombie()

    const combat = getRealmCombat(this._realmLv)
    this._swords = []
    this._focusZombie = null
    this._demonCrescents = []
    this._enemySwords = []
    this.setData({ corpseDan: 0 })

    const ult = combat && combat.ultimate
    const name = (combat && combat.ultName) || '大招'
    if (ult === 'blink_jian') {
      wx.showToast({ title: name, icon: 'none', duration: 1400 })
      this._startBlinkJianUlt()
      return
    }
    if (ult === 'wuxing_array') {
      wx.showToast({ title: name, icon: 'none', duration: 1400 })
      this._startWuxingArrayUlt()
      return
    }
    if (ult === 'jianying') {
      wx.showToast({ title: name, icon: 'none', duration: 1400 })
      this._startJianyingUlt()
      return
    }
    if (ult === 'yuanci') {
      wx.showToast({ title: name, icon: 'none', duration: 1400 })
      this._startYuanciUlt()
      return
    }
    if (ult === 'xuantian') {
      wx.showToast({ title: name, icon: 'none', duration: 1400 })
      this._startXuantianUlt(name)
      return
    }
    if (ult === 'avatar' || ult === 'niepan') {
      wx.showToast({ title: name, icon: 'none', duration: 1400 })
      this._startAvatarUlt(ult === 'niepan' ? 'niepan' : 'avatar', name)
      return
    }
    if (ult === 'time_law' || ult === 'shennian') {
      wx.showToast({ title: name, icon: 'none', duration: 1400 })
      this._startTimeLawUlt(ult, name)
      return
    }
    if (ult === 'dao_crush') {
      wx.showToast({ title: name, icon: 'none', duration: 1400 })
      this._startDaoCrushUlt()
      return
    }
    // 仅元婴：经典大庚剑阵（圆阵、剑尖朝内）
    if (ult === 'geng_classic' || isYuanyingRealm(this._realmLv)) {
      wx.showToast({ title: '大庚剑阵', icon: 'none', duration: 1500 })
      this._startClassicGengFormation()
      return
    }
    // 未配置境界：不放旧版大庚
    console.warn('仙途无本境大招配置', this._realmLv)
  },

  _startClassicGengFormation() {
    const w = this._w
    const h = this._h
    const cx = w * 0.5
    const cy = h * 0.42
    const radius = Math.min(w, h) * 0.32
    const px = this._playerX
    const py = this._playerY
    const orbitR = 30
    const swords = []
    for (let i = 0; i < GENG_SWORD_COUNT; i++) {
      const a = (Math.PI * 2 * i) / GENG_SWORD_COUNT
      const sx = px + Math.cos(a) * orbitR
      const sy = py + Math.sin(a) * orbitR
      swords.push({
        a: a,
        tx: cx + Math.cos(a) * radius,
        ty: cy + Math.sin(a) * radius,
        tipIn: a + Math.PI,
        tipOut: a,
        x: px,
        y: py,
        tipAngle: a,
        scale: 0,
        delay: (i / GENG_SWORD_COUNT) * 0.55
      })
    }
    const links = []
    for (let i = 0; i < GENG_SWORD_COUNT; i += 2) {
      links.push({ a: i, b: (i + 31) % GENG_SWORD_COUNT })
    }
    this._gengFx = {
      style: 'classic',
      t: 0,
      phase: 'gather',
      cx: cx,
      cy: cy,
      radius: radius,
      swords: swords,
      links: links,
      gatherDur: 1.1,
      flyDur: 1.5,
      suckDur: 2.2,
      zapDur: 4.2,
      endDur: 1.0,
      killed: false,
      killAt: 3.5,
      orbitR: orbitR
    }
    this._breakMute = 10.5
  },

  /** 对境主按最大生命比例造成伤害（样板大招共用） */
  _dealGuardianRatioHit(target, ratio, fromX, fromY, realm, enchant) {
    if (!target || target.state === 'dead') return
    const dmg = Math.max(6, Math.floor((target.maxHp || 100) * ratio))
    this._hitZombie(target, dmg, fromX, fromY, realm, enchant || null, true)
  },

  /** 炼气大招：眨眼剑法 — 残影突刺连斩 */
  _startBlinkJianUlt() {
    let target = null
    for (let i = 0; i < (this._zombies || []).length; i++) {
      if (this._zombies[i].state !== 'dead') {
        target = this._zombies[i]
        break
      }
    }
    const tx = target ? target.x : this._w * 0.5
    const ty = target ? target.y : this._h * 0.5
    this._gengFx = {
      style: 'blink_jian',
      t: 0,
      phase: 'wind',
      windDur: 0.28,
      dashDur: 0.35,
      slashDur: 1.15,
      endDur: 0.35,
      targetId: target ? target.id : null,
      targetX: tx,
      targetY: ty,
      fromX: this._playerX,
      fromY: this._playerY,
      ghosts: [],
      slashHits: 0,
      title: '眨眼剑法'
    }
    this._breakMute = 2.4
    this._playerHideT = Math.max(this._playerHideT || 0, 0.9)
  },

  _updateBlinkJianUlt(dt, realm) {
    const fx = this._gengFx
    if (!fx) return
    fx.t += dt
    const target = this._findGengTarget(fx)
    if (target) {
      fx.targetX = target.x
      fx.targetY = target.y
    }
    const tx = fx.targetX
    const ty = fx.targetY

    if (fx.phase === 'wind') {
      // 蓄势：脚下尘土
      if (Math.random() < 0.5) {
        this._particles.push({
          x: this._playerX + (Math.random() - 0.5) * 20,
          y: this._playerY + 10,
          vx: (Math.random() - 0.5) * 40,
          vy: -20 - Math.random() * 30,
          life: 0.25,
          color: '#86efac'
        })
      }
      if (fx.t >= fx.windDur) {
        fx.phase = 'dash'
        fx.t = 0
        fx.fromX = this._playerX
        fx.fromY = this._playerY
      }
      return
    }

    if (fx.phase === 'dash') {
      const u = Math.min(1, fx.t / fx.dashDur)
      const e = 1 - Math.pow(1 - u, 3)
      // 闪到目标侧后方
      const ang = Math.atan2(ty - fx.fromY, tx - fx.fromX)
      const destX = tx - Math.cos(ang) * 28
      const destY = ty - Math.sin(ang) * 28
      this._playerX = fx.fromX + (destX - fx.fromX) * e
      this._playerY = fx.fromY + (destY - fx.fromY) * e
      const g = this._clampToGrass(this._playerX, this._playerY)
      this._playerX = g.x
      this._playerY = g.y
      if ((fx.ghosts || []).length < 10 || Math.random() < 0.35) {
        fx.ghosts.push({
          x: this._playerX,
          y: this._playerY,
          life: 0.45,
          a: ang
        })
      }
      if (fx.ghosts.length > 14) fx.ghosts.splice(0, fx.ghosts.length - 14)
      if (fx.t >= fx.dashDur) {
        fx.phase = 'slash'
        fx.t = 0
        fx.slashHits = 0
        fx.nextSlash = 0
      }
      return
    }

    if (fx.phase === 'slash') {
      for (let i = (fx.ghosts || []).length - 1; i >= 0; i--) {
        fx.ghosts[i].life -= dt
        if (fx.ghosts[i].life <= 0) fx.ghosts.splice(i, 1)
      }
      fx.nextSlash = (fx.nextSlash || 0) - dt
      if (fx.nextSlash <= 0 && fx.slashHits < 5 && target && target.state !== 'dead') {
        fx.nextSlash = 0.18
        fx.slashHits += 1
        const a = Math.atan2(ty - this._playerY, tx - this._playerX) + (fx.slashHits % 2 ? 0.4 : -0.4)
        fx.ghosts.push({ x: this._playerX, y: this._playerY - 8, life: 0.35, a: a, slash: true })
        this._dealGuardianRatioHit(target, 0.075, this._playerX, this._playerY, realm, null)
        this._burst(tx, ty, '#bbf7d0', 8)
        // 偶发火弹点缀
        if (fx.slashHits === 3) {
          this._burst(tx, ty, '#fb923c', 10)
          if (target.state !== 'dead') {
            target.fireT = Math.max(target.fireT || 0, 2.2)
            target.fireTick = 0
          }
        }
      }
      if (fx.t >= fx.slashDur) {
        fx.phase = 'end'
        fx.t = 0
      }
      return
    }

    if (fx.phase === 'end') {
      if (fx.t >= fx.endDur) this._finishGengFx()
    }
  },

  /** 筑基大招：颠倒五行阵困敌 + 青元剑芒贯体 */
  _startWuxingArrayUlt() {
    let target = null
    for (let i = 0; i < (this._zombies || []).length; i++) {
      if (this._zombies[i].state !== 'dead') {
        target = this._zombies[i]
        break
      }
    }
    const tx = target ? target.x : this._w * 0.5
    const ty = target ? target.y : this._h * 0.5
    const petals = []
    const colors = ['#22c55e', '#38bdf8', '#fbbf24', '#f87171', '#a78bfa']
    for (let i = 0; i < 5; i++) {
      petals.push({
        a: (Math.PI * 2 * i) / 5 - Math.PI / 2,
        color: colors[i],
        beamU: 0
      })
    }
    if (target) {
      target.bindT = 3.2
      target.iceT = Math.max(target.iceT || 0, 2.5)
      target.state = 'hurt'
      target.frameT = 0
    }
    this._qingyuanShield = Math.max(this._qingyuanShield || 0, 4.5)
    this._gengFx = {
      style: 'wuxing_array',
      t: 0,
      phase: 'form',
      formDur: 0.7,
      trapDur: 1.1,
      pierceDur: 1.4,
      endDur: 0.4,
      targetId: target ? target.id : null,
      targetX: tx,
      targetY: ty,
      petals: petals,
      radius: 54,
      pierceHits: 0,
      title: '颠倒五行阵'
    }
    this._breakMute = 3.8
  },

  _updateWuxingArrayUlt(dt, realm) {
    const fx = this._gengFx
    if (!fx) return
    fx.t += dt
    const target = this._findGengTarget(fx)
    if (target) {
      fx.targetX = target.x
      fx.targetY = target.y
      // 阵中禁锢
      if (fx.phase === 'trap' || fx.phase === 'pierce') {
        target.bindT = Math.max(target.bindT || 0, 0.4)
        target.iceT = Math.max(target.iceT || 0, 0.4)
      }
    }
    const tx = fx.targetX
    const ty = fx.targetY

    if (fx.phase === 'form') {
      if (fx.t >= fx.formDur) {
        fx.phase = 'trap'
        fx.t = 0
      }
      return
    }
    if (fx.phase === 'trap') {
      if (Math.random() < 0.35) {
        const a = Math.random() * Math.PI * 2
        this._particles.push({
          x: tx + Math.cos(a) * fx.radius,
          y: ty + Math.sin(a) * fx.radius * 0.7,
          vx: Math.cos(a + Math.PI) * 30,
          vy: Math.sin(a + Math.PI) * 30,
          life: 0.3,
          color: fx.petals[Math.floor(Math.random() * 5)].color
        })
      }
      if (fx.t >= fx.trapDur) {
        fx.phase = 'pierce'
        fx.t = 0
        fx.pierceHits = 0
        fx.nextPierce = 0
      }
      return
    }
    if (fx.phase === 'pierce') {
      fx.nextPierce = (fx.nextPierce || 0) - dt
      if (fx.nextPierce <= 0 && fx.pierceHits < 5) {
        fx.nextPierce = 0.22
        const idx = fx.pierceHits
        fx.pierceHits += 1
        if (fx.petals[idx]) fx.petals[idx].beamU = 1
        if (target && target.state !== 'dead') {
          this._dealGuardianRatioHit(target, 0.08, tx, ty, realm, null)
          this._burst(tx, ty, fx.petals[idx].color, 7)
        }
      }
      for (let i = 0; i < fx.petals.length; i++) {
        if (fx.petals[i].beamU > 0) fx.petals[i].beamU = Math.max(0, fx.petals[i].beamU - dt * 1.8)
      }
      if (fx.t >= fx.pierceDur) {
        fx.phase = 'end'
        fx.t = 0
      }
      return
    }
    if (fx.phase === 'end') {
      if (fx.t >= fx.endDur) this._finishGengFx()
    }
  },

  /** 结丹大招：剑影分光 + 噬金虫收尾 */
  _startJianyingUlt() {
    let target = null
    for (let i = 0; i < (this._zombies || []).length; i++) {
      if (this._zombies[i].state !== 'dead') {
        target = this._zombies[i]
        break
      }
    }
    const tx = target ? target.x : this._w * 0.5
    const ty = target ? target.y : this._h * 0.5
    const shadows = []
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8
      shadows.push({
        a: a,
        x: this._playerX,
        y: this._playerY,
        ox: Math.cos(a) * 42,
        oy: Math.sin(a) * 28,
        hit: false
      })
    }
    this._gengFx = {
      style: 'jianying',
      t: 0,
      phase: 'split',
      splitDur: 0.55,
      swarmDur: 1.5,
      convergeDur: 0.7,
      endDur: 0.35,
      targetId: target ? target.id : null,
      targetX: tx,
      targetY: ty,
      shadows: shadows,
      insects: [],
      title: '剑影分光'
    }
    this._breakMute = 3.4
  },

  _updateJianyingUlt(dt, realm) {
    const fx = this._gengFx
    if (!fx) return
    fx.t += dt
    const target = this._findGengTarget(fx)
    if (target) {
      fx.targetX = target.x
      fx.targetY = target.y
    }
    const tx = fx.targetX
    const ty = fx.targetY
    const px = this._playerX
    const py = this._playerY

    if (fx.phase === 'split') {
      const u = Math.min(1, fx.t / fx.splitDur)
      const e = 1 - Math.pow(1 - u, 2)
      for (let i = 0; i < fx.shadows.length; i++) {
        const s = fx.shadows[i]
        s.x = px + s.ox * e
        s.y = py - 10 + s.oy * e
      }
      if (fx.t >= fx.splitDur) {
        fx.phase = 'swarm'
        fx.t = 0
      }
      return
    }

    if (fx.phase === 'swarm') {
      const u = Math.min(1, fx.t / fx.swarmDur)
      for (let i = 0; i < fx.shadows.length; i++) {
        const s = fx.shadows[i]
        const spin = s.a + u * Math.PI * 2.2
        const rr = 42 - u * 18
        s.x = tx + Math.cos(spin) * rr
        s.y = ty + Math.sin(spin) * rr * 0.65
        if (!s.hit && u > 0.2 + i * 0.08) {
          s.hit = true
          if (target && target.state !== 'dead') {
            this._dealGuardianRatioHit(target, 0.04, s.x, s.y, realm, null)
            this._burst(s.x, s.y, '#fde68a', 5)
          }
        }
      }
      // 噬金虫粒子
      if (Math.random() < 0.55) {
        fx.insects.push({
          x: tx + (Math.random() - 0.5) * 50,
          y: ty + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 60,
          vy: (Math.random() - 0.5) * 60,
          life: 0.4
        })
      }
      for (let i = fx.insects.length - 1; i >= 0; i--) {
        const bug = fx.insects[i]
        bug.life -= dt
        bug.x += bug.vx * dt
        bug.y += bug.vy * dt
        if (bug.life <= 0) fx.insects.splice(i, 1)
      }
      if (fx.t >= fx.swarmDur) {
        fx.phase = 'converge'
        fx.t = 0
        if (target && target.state !== 'dead') {
          this._dealGuardianRatioHit(target, 0.12, tx, ty, realm, 'fire')
          this._burst(tx, ty, '#f59e0b', 16)
        }
      }
      return
    }

    if (fx.phase === 'converge') {
      const u = Math.min(1, fx.t / fx.convergeDur)
      for (let i = 0; i < fx.shadows.length; i++) {
        const s = fx.shadows[i]
        s.x = s.x + (px - s.x) * u * 0.2
        s.y = s.y + (py - s.y) * u * 0.2
      }
      if (fx.t >= fx.convergeDur) {
        fx.phase = 'end'
        fx.t = 0
      }
      return
    }

    if (fx.phase === 'end') {
      if (fx.t >= fx.endDur) this._finishGengFx()
    }
  },

  /** 化神：元磁神光 — 吸扯 + 五行磁光贯体 */
  _startYuanciUlt() {
    let target = this._pickUltTarget()
    const tx = target ? target.x : this._w * 0.5
    const ty = target ? target.y : this._h * 0.5
    if (target) {
      target.bindT = 2.8
      target.windT = Math.max(target.windT || 0, 2.5)
      target.windCx = tx
      target.windCy = ty
      target.windA = 0
      target.windR = 36
    }
    this._gengFx = {
      style: 'yuanci',
      t: 0,
      phase: 'pull',
      pullDur: 0.7,
      blastDur: 1.3,
      endDur: 0.35,
      targetId: target ? target.id : null,
      targetX: tx,
      targetY: ty,
      hits: 0,
      title: '元磁神光',
      color: '#22d3ee'
    }
    this._breakMute = 2.6
  },

  _updateYuanciUlt(dt, realm) {
    const fx = this._gengFx
    if (!fx) return
    fx.t += dt
    const target = this._findGengTarget(fx)
    if (target) {
      fx.targetX = target.x
      fx.targetY = target.y
    }
    const tx = fx.targetX
    const ty = fx.targetY
    if (fx.phase === 'pull') {
      if (target && target.state !== 'dead') {
        const dx = this._playerX - target.x
        const dy = this._playerY - target.y
        target.x += dx * dt * 1.4
        target.y += dy * dt * 1.4
      }
      if (fx.t >= fx.pullDur) {
        fx.phase = 'blast'
        fx.t = 0
        fx.hits = 0
        fx.nextHit = 0
      }
      return
    }
    if (fx.phase === 'blast') {
      fx.nextHit = (fx.nextHit || 0) - dt
      if (fx.nextHit <= 0 && fx.hits < 5 && target && target.state !== 'dead') {
        fx.nextHit = 0.2
        fx.hits += 1
        this._dealGuardianRatioHit(target, 0.075, this._playerX, this._playerY, realm, null)
        this._burst(tx, ty, '#67e8f9', 8)
      }
      if (fx.t >= fx.blastDur) {
        fx.phase = 'end'
        fx.t = 0
      }
      return
    }
    if (fx.phase === 'end' && fx.t >= fx.endDur) this._finishGengFx()
  },

  /** 炼虚/大罗：玄天斩灵剑 / 时间本源斩 — 毁灭之丝横斩 */
  _startXuantianUlt(title) {
    let target = this._pickUltTarget()
    const tx = target ? target.x : this._w * 0.5
    const ty = target ? target.y : this._h * 0.5
    const fx0 = this._playerX
    const fy0 = this._playerY - 10
    const ang = Math.atan2(ty - fy0, tx - fx0)
    this._gengFx = {
      style: 'xuantian',
      t: 0,
      phase: 'charge',
      chargeDur: 0.55,
      slashDur: 0.95,
      afterDur: 0.75,
      endDur: 0.35,
      targetId: target ? target.id : null,
      targetX: tx,
      targetY: ty,
      fromX: fx0,
      fromY: fy0,
      hitBits: 0,
      title: title || '玄天斩灵剑',
      threads: [],
      // 三斩：主斩 + 两道斜斩弧，错开时间
      arcs: [
        { delay: 0.02, span: 1.15, width: 5, offset: 0, ratio: 0.16 },
        { delay: 0.22, span: 0.95, width: 3.5, offset: -0.42, ratio: 0.12 },
        { delay: 0.42, span: 1.05, width: 3.2, offset: 0.48, ratio: 0.12 }
      ],
      baseAng: ang,
      sparks: []
    }
    this._breakMute = 2.6
  },

  _updateXuantianUlt(dt, realm) {
    const fx = this._gengFx
    if (!fx) return
    fx.t += dt
    const target = this._findGengTarget(fx)
    if (target) {
      fx.targetX = target.x
      fx.targetY = target.y
      fx.baseAng = Math.atan2(fx.targetY - fx.fromY, fx.targetX - fx.fromX)
    }
    if (fx.phase === 'charge') {
      if (Math.random() < 0.7) {
        const a = (this._animT || 0) * 6 + Math.random() * 6
        fx.threads.push({
          x: this._playerX + Math.cos(a) * (18 + Math.random() * 22),
          y: this._playerY - 22 + Math.sin(a) * (10 + Math.random() * 14),
          life: 0.4,
          r: 4 + Math.random() * 8
        })
      }
      for (let i = fx.threads.length - 1; i >= 0; i--) {
        fx.threads[i].life -= dt
        if (fx.threads[i].life <= 0) fx.threads.splice(i, 1)
      }
      if (fx.t >= fx.chargeDur) {
        fx.phase = 'slash'
        fx.t = 0
        fx.hitBits = 0
      }
      return
    }
    if (fx.phase === 'slash') {
      const arcs = fx.arcs || []
      for (let i = 0; i < arcs.length; i++) {
        const arc = arcs[i]
        if (fx.t >= arc.delay && !(fx.hitBits & (1 << i)) && target && target.state !== 'dead') {
          fx.hitBits |= (1 << i)
          this._dealGuardianRatioHit(target, arc.ratio || 0.12, fx.fromX, fx.fromY, realm, i === 0 ? 'wind' : null)
          this._burst(fx.targetX, fx.targetY, i === 0 ? '#f8fafc' : '#94a3b8', i === 0 ? 16 : 10)
          for (let k = 0; k < 6; k++) {
            const sa = fx.baseAng + (Math.random() - 0.5) * 1.2
            fx.sparks.push({
              x: fx.targetX,
              y: fx.targetY,
              vx: Math.cos(sa) * (80 + Math.random() * 120),
              vy: Math.sin(sa) * (80 + Math.random() * 120),
              life: 0.35 + Math.random() * 0.25
            })
          }
        }
      }
      for (let i = (fx.sparks || []).length - 1; i >= 0; i--) {
        const sp = fx.sparks[i]
        sp.life -= dt
        sp.x += sp.vx * dt
        sp.y += sp.vy * dt
        if (sp.life <= 0) fx.sparks.splice(i, 1)
      }
      if (fx.t >= fx.slashDur) {
        fx.phase = 'after'
        fx.t = 0
      }
      return
    }
    if (fx.phase === 'after') {
      for (let i = (fx.sparks || []).length - 1; i >= 0; i--) {
        const sp = fx.sparks[i]
        sp.life -= dt
        sp.x += sp.vx * dt * 0.4
        sp.y += sp.vy * dt * 0.4
        if (sp.life <= 0) fx.sparks.splice(i, 1)
      }
      if (fx.t >= fx.afterDur) {
        fx.phase = 'end'
        fx.t = 0
      }
      return
    }
    if (fx.phase === 'end' && fx.t >= fx.endDur) this._finishGengFx()
  },

  /** 合体惊蛰 / 大乘涅槃：真灵变身近战爆发 */
  _startAvatarUlt(kind, title) {
    let target = this._pickUltTarget()
    const tx = target ? target.x : this._w * 0.5
    const ty = target ? target.y : this._h * 0.5
    this._gengFx = {
      style: 'avatar',
      kind: kind || 'avatar',
      t: 0,
      phase: 'morph',
      morphDur: 0.5,
      smashDur: 1.2,
      endDur: 0.4,
      targetId: target ? target.id : null,
      targetX: tx,
      targetY: ty,
      hits: 0,
      title: title || '惊蛰十二变',
      scale: 1
    }
    this._breakMute = 2.4
    this._qingyuanShield = Math.max(this._qingyuanShield || 0, 3.5)
  },

  _updateAvatarUlt(dt, realm) {
    const fx = this._gengFx
    if (!fx) return
    fx.t += dt
    const target = this._findGengTarget(fx)
    if (target) {
      fx.targetX = target.x
      fx.targetY = target.y
    }
    if (fx.phase === 'morph') {
      fx.scale = 1 + Math.min(1, fx.t / fx.morphDur) * (fx.kind === 'niepan' ? 0.55 : 0.35)
      if (fx.t >= fx.morphDur) {
        fx.phase = 'smash'
        fx.t = 0
        fx.hits = 0
        fx.nextHit = 0
      }
      return
    }
    if (fx.phase === 'smash') {
      fx.scale = fx.kind === 'niepan' ? 1.55 : 1.35
      fx.nextHit = (fx.nextHit || 0) - dt
      if (fx.nextHit <= 0 && fx.hits < 4 && target && target.state !== 'dead') {
        fx.nextHit = 0.25
        fx.hits += 1
        const ratio = fx.kind === 'niepan' ? 0.1 : 0.085
        this._dealGuardianRatioHit(target, ratio, this._playerX, this._playerY, realm, null)
        this._burst(fx.targetX, fx.targetY, fx.kind === 'niepan' ? '#fb7185' : '#a78bfa', 10)
      }
      if (fx.t >= fx.smashDur) {
        fx.phase = 'end'
        fx.t = 0
      }
      return
    }
    if (fx.phase === 'end') {
      fx.scale = Math.max(1, fx.scale - dt)
      if (fx.t >= fx.endDur) this._finishGengFx()
    }
  },

  /** 真仙/金仙/太乙：时间法则 / 灵域 / 神念囚笼 */
  _startTimeLawUlt(kind, title) {
    let target = this._pickUltTarget()
    const tx = target ? target.x : this._w * 0.5
    const ty = target ? target.y : this._h * 0.5
    if (target) {
      target.bindT = 3.5
      target.iceT = Math.max(target.iceT || 0, 3.2)
      target.timeSlow = 3.5
    }
    this._gengFx = {
      style: 'time_law',
      kind: kind || 'time_law',
      t: 0,
      phase: 'domain',
      domainDur: 0.8,
      strikeDur: 1.4,
      endDur: 0.35,
      targetId: target ? target.id : null,
      targetX: tx,
      targetY: ty,
      hits: 0,
      title: title || '时间法则',
      pillars: []
    }
    for (let i = 0; i < 6; i++) {
      this._gengFx.pillars.push({
        a: (Math.PI * 2 * i) / 6,
        u: 0
      })
    }
    this._breakMute = 2.8
  },

  _updateTimeLawUlt(dt, realm) {
    const fx = this._gengFx
    if (!fx) return
    fx.t += dt
    const target = this._findGengTarget(fx)
    if (target) {
      fx.targetX = target.x
      fx.targetY = target.y
      target.bindT = Math.max(target.bindT || 0, 0.5)
      target.timeSlow = Math.max(target.timeSlow || 0, 0.5)
    }
    if (fx.phase === 'domain') {
      const u = Math.min(1, fx.t / fx.domainDur)
      for (let i = 0; i < fx.pillars.length; i++) fx.pillars[i].u = u
      if (fx.t >= fx.domainDur) {
        fx.phase = 'strike'
        fx.t = 0
        fx.hits = 0
        fx.nextHit = 0
      }
      return
    }
    if (fx.phase === 'strike') {
      fx.nextHit = (fx.nextHit || 0) - dt
      if (fx.nextHit <= 0 && fx.hits < 5 && target && target.state !== 'dead') {
        fx.nextHit = 0.22
        fx.hits += 1
        const ratio = fx.kind === 'shennian' ? 0.08 : 0.07
        this._dealGuardianRatioHit(target, ratio, fx.targetX, fx.targetY, realm, 'elec')
        this._burst(fx.targetX, fx.targetY, '#fde68a', 7)
      }
      if (fx.t >= fx.strikeDur) {
        fx.phase = 'end'
        fx.t = 0
      }
      return
    }
    if (fx.phase === 'end' && fx.t >= fx.endDur) this._finishGengFx()
  },

  /** 道祖：时间大道 + 掌天瓶吸源 */
  _startDaoCrushUlt() {
    let target = this._pickUltTarget()
    const tx = target ? target.x : this._w * 0.5
    const ty = target ? target.y : this._h * 0.5
    if (target) {
      target.bindT = 4
      target.timeSlow = 4
    }
    this._gengFx = {
      style: 'dao_crush',
      t: 0,
      phase: 'rise',
      riseDur: 0.6,
      crushDur: 1.6,
      endDur: 0.5,
      targetId: target ? target.id : null,
      targetX: tx,
      targetY: ty,
      hits: 0,
      title: '时间大道',
      bottleU: 0
    }
    this._breakMute = 3.0
  },

  _updateDaoCrushUlt(dt, realm) {
    const fx = this._gengFx
    if (!fx) return
    fx.t += dt
    const target = this._findGengTarget(fx)
    if (target) {
      fx.targetX = target.x
      fx.targetY = target.y
      target.timeSlow = Math.max(target.timeSlow || 0, 0.6)
    }
    if (fx.phase === 'rise') {
      fx.bottleU = Math.min(1, fx.t / fx.riseDur)
      if (fx.t >= fx.riseDur) {
        fx.phase = 'crush'
        fx.t = 0
        fx.hits = 0
        fx.nextHit = 0
      }
      return
    }
    if (fx.phase === 'crush') {
      fx.bottleU = 1
      fx.nextHit = (fx.nextHit || 0) - dt
      if (fx.nextHit <= 0 && fx.hits < 6 && target && target.state !== 'dead') {
        fx.nextHit = 0.22
        fx.hits += 1
        this._dealGuardianRatioHit(target, 0.09, fx.targetX, fx.targetY, realm, null)
        this._burst(fx.targetX, fx.targetY, '#fff7ed', 8)
        this._healPlayer(2)
      }
      if (fx.t >= fx.crushDur) {
        fx.phase = 'end'
        fx.t = 0
      }
      return
    }
    if (fx.phase === 'end' && fx.t >= fx.endDur) this._finishGengFx()
  },

  _pickUltTarget() {
    for (let i = 0; i < (this._zombies || []).length; i++) {
      if (this._zombies[i].state !== 'dead') return this._zombies[i]
    }
    return null
  },

  /** 炼气～道祖交锋辅招 */
  _tickRealmAuxSkill(dt, realm) {
    const combat = getRealmCombat(this._realmLv)
    if (!combat || this._gengFx || this._spiritFx || this._breakFx) return
    if (this._qingyuanShield > 0) this._qingyuanShield = Math.max(0, this._qingyuanShield - dt)

    this._updateFireballs(dt, realm)
    this._updateInsectFx(dt, realm)

    const kit = getRealmAtkKit(realm.majorKey || combat.key)
    // 主攻已是同招时，辅招跳过，避免叠打
    const aux = combat.aux
    const skipDup =
      (kit.primary === 'shiling' && aux === 'shiling') ||
      (kit.primary === 'leihai' && (aux === 'leihai' || aux === 'pixie_lei'))
    if (skipDup) {
      if (aux === 'qingyuan' || aux === 'baimai') {
        this._qingyuanShield = Math.max(this._qingyuanShield || 0, aux === 'baimai' ? 0.35 : 0.2)
      }
      return
    }

    let target = this._pickCombatTarget()
    if (!target) return

    if ((target.timeSlow || 0) > 0) target.timeSlow = Math.max(0, target.timeSlow - dt)

    this._realmAuxAcc = (this._realmAuxAcc || 0) + dt
    if (aux === 'huodan') {
      if (this._realmAuxAcc >= 2.2) {
        this._realmAuxAcc = 0
        this._launchFireball(target, realm)
      }
    } else if (aux === 'qingyuan') {
      this._qingyuanShield = Math.max(this._qingyuanShield || 0, 0.2)
      if (this._realmAuxAcc >= 2.8) {
        this._realmAuxAcc = 0
        this._launchQingyuanBeam(target, realm)
      }
    } else if (aux === 'shijin') {
      if (this._realmAuxAcc >= 1.8) {
        this._realmAuxAcc = 0
        this._spawnInsectBurst(target)
      }
    } else if (aux === 'pixie_lei' || aux === 'leihai') {
      if (this._realmAuxAcc >= 2.4) {
        this._realmAuxAcc = 0
        this._hitZombie(target, 6 + realm.lv, target.x, target.y - 40, realm, 'elec', false)
        target.elecT = Math.max(target.elecT || 0, 2.2)
        this._burst(target.x, target.y - 20, '#fde047', 12)
      }
    } else if (aux === 'fansheng' || aux === 'avatar_tick' || aux === 'xuansha') {
      if (this._realmAuxAcc >= 2.0) {
        this._realmAuxAcc = 0
        this._hitZombie(target, 5 + Math.floor(realm.lv * 0.8), this._playerX, this._playerY, realm, null, true)
        this._burst(target.x, target.y, realm.color || '#22d3ee', 8)
      }
    } else if (aux === 'shiling') {
      if (this._realmAuxAcc >= 2.6) {
        this._realmAuxAcc = 0
        this._hitZombie(target, 8 + realm.lv, target.x, target.y, realm, 'fire', false)
        target.fireT = Math.max(target.fireT || 0, 3.0)
        this._burst(target.x, target.y, '#e2e8f0', 14)
      }
    } else if (aux === 'baimai') {
      this._qingyuanShield = Math.max(this._qingyuanShield || 0, 0.35)
      if (this._realmAuxAcc >= 2.5) {
        this._realmAuxAcc = 0
        this._hitZombie(target, 6 + realm.lv, this._playerX, this._playerY, realm, null, true)
      }
    } else if (aux === 'time_press') {
      if (this._realmAuxAcc >= 2.2) {
        this._realmAuxAcc = 0
        target.timeSlow = Math.max(target.timeSlow || 0, 2.0)
        target.bindT = Math.max(target.bindT || 0, 1.2)
        this._hitZombie(target, 5 + realm.lv, target.x, target.y, realm, null, false)
        this._burst(target.x, target.y, '#c4b5fd', 10)
      }
    } else if (aux === 'bottle') {
      if (this._realmAuxAcc >= 2.8) {
        this._realmAuxAcc = 0
        this._hitZombie(target, 10 + realm.lv, target.x, target.y, realm, null, false)
        this._healPlayer(4)
        this._burst(target.x, target.y, '#fff7ed', 12)
      }
    }
  },

  /** 当前战斗目标：锁定优先，否则最近活怪 */
  _pickCombatTarget() {
    let target = this._focusZombie
    if (target && target.state !== 'dead' && (target.emerge || 0) > 0.5) return target
    for (let i = 0; i < (this._zombies || []).length; i++) {
      const z = this._zombies[i]
      if (z.state !== 'dead' && (z.emerge || 0) > 0.5) return z
    }
    return null
  },

  /**
   * 大境界主攻：剑修出剑；化神元磁、炼虚斩气、合体真灵爪等按说明
   */
  _tickRealmPrimaryAttack(dt, realm, shootEvery) {
    const kit = getRealmAtkKit(realm.majorKey)
    const every = kit.interval || shootEvery || 0.5
    if (kit.primary === 'sword') {
      if (this._swordAcc >= every && !(this._swords && this._swords.length)) {
        this._swordAcc = 0
        this._launchSwords(realm)
      }
      return
    }
    if (this._swordAcc < every) return
    const target = this._pickCombatTarget()
    if (!target) return
    this._swordAcc = 0
    const cost = Math.max(2, Math.ceil(2 + (realm.lv || 1) * 0.08))
    if ((this._lingQi || 0) < cost) {
      if (this._lingQiWarnT <= 0) {
        this._lingQiWarnT = 1.6
        wx.showToast({ title: '灵气不足 · 打坐吸纳', icon: 'none', duration: 1200 })
      }
      return
    }
    this._addLingQi(-cost)
    this._launchRealmPrimaryShot(kit.primary, target, realm)
  },

  _launchRealmPrimaryShot(kind, target, realm) {
    if (!this._realmShots) this._realmShots = []
    const tx = target.x
    const ty = target.y - (target.floatY || 0)
    const dx = tx - this._playerX
    const dy = ty - (this._playerY - 10)
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const baseDmg = 3 + Math.floor((realm.lv || 1) * 0.9)
    const color = realm.color || '#67e8f9'
    const n = kind === 'leihai' ? 3 : (kind === 'time_silk' ? 2 : 1)
    for (let i = 0; i < n; i++) {
      const spread = (i - (n - 1) / 2) * 0.18
      const ang = Math.atan2(dy, dx) + spread
      const speed = kind === 'dao_ray' ? 320 : (kind === 'void_slash' ? 380 : 260)
      this._realmShots.push({
        kind: kind,
        x: this._playerX,
        y: this._playerY - 10,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        ang: ang,
        life: 1.8,
        r: kind === 'spirit_claw' ? 14 : 8,
        dmg: baseDmg + (kind === 'dao_ray' || kind === 'origin_slash' ? 4 : 0),
        color: color,
        enchant: kind === 'leihai' || kind === 'yuanci' ? 'elec' : (kind === 'shiling' ? 'fire' : null),
        hitIds: {}
      })
    }
    this._burst(this._playerX, this._playerY - 10, color, 6)
  },

  _updateRealmShots(dt, realm) {
    const list = this._realmShots || []
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i]
      s.life -= dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      if (s.life <= 0) {
        list.splice(i, 1)
        continue
      }
      // 神念/真灵：近身直接结算后消散
      if (s.kind === 'spirit_claw' || s.kind === 'shennian') {
        for (let zi = 0; zi < (this._zombies || []).length; zi++) {
          const z = this._zombies[zi]
          if (z.state === 'dead' || (z.emerge || 0) < 0.5) continue
          const dx = z.x - s.x
          const dy = z.y - (z.floatY || 0) - s.y
          if (dx * dx + dy * dy < (z.r + s.r) * (z.r + s.r)) {
            this._hitZombie(z, s.dmg, s.x, s.y, realm, s.enchant, true)
            if (s.kind === 'shennian') {
              z.bindT = Math.max(z.bindT || 0, 1.1)
              z.timeSlow = Math.max(z.timeSlow || 0, 0.8)
            }
            this._burst(z.x, z.y, s.color, 8)
            list.splice(i, 1)
            break
          }
        }
        continue
      }
      let hit = false
      for (let zi = 0; zi < (this._zombies || []).length; zi++) {
        const z = this._zombies[zi]
        if (z.state === 'dead' || (z.emerge || 0) < 0.5) continue
        if (s.hitIds[z.id]) continue
        const dx = z.x - s.x
        const dy = z.y - (z.floatY || 0) - s.y
        if (dx * dx + dy * dy < (z.r + s.r + 4) * (z.r + s.r + 4)) {
          s.hitIds[z.id] = 1
          this._hitZombie(z, s.dmg, s.x, s.y, realm, s.enchant, false)
          if (s.kind === 'shiling') z.fireT = Math.max(z.fireT || 0, 2.2)
          if (s.kind === 'leihai' || s.kind === 'yuanci') z.elecT = Math.max(z.elecT || 0, 1.6)
          if (s.kind === 'time_silk' || s.kind === 'origin_slash') {
            z.timeSlow = Math.max(z.timeSlow || 0, 1.4)
          }
          this._burst(z.x, z.y, s.color, 7)
          // 斩类可穿透一只
          if (s.kind !== 'void_slash' && s.kind !== 'origin_slash' && s.kind !== 'time_silk') {
            hit = true
            break
          }
        }
      }
      if (hit) list.splice(i, 1)
    }
  },

  _drawRealmShots(ctx) {
    const list = this._realmShots || []
    for (let i = 0; i < list.length; i++) {
      const s = list[i]
      ctx.save()
      ctx.translate(s.x, s.y)
      ctx.rotate(s.ang || 0)
      ctx.globalAlpha = 0.9
      if (s.kind === 'yuanci') {
        ctx.strokeStyle = '#67e8f9'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(-10, 0)
        ctx.lineTo(16, 0)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(8, 0, 6, 0, Math.PI * 2)
        ctx.stroke()
      } else if (s.kind === 'void_slash' || s.kind === 'origin_slash') {
        ctx.strokeStyle = s.color
        ctx.lineWidth = 2.5
        ctx.shadowColor = s.color
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.moveTo(-18, -2)
        ctx.quadraticCurveTo(0, 8, 20, 0)
        ctx.stroke()
        ctx.shadowBlur = 0
      } else if (s.kind === 'shiling') {
        ctx.fillStyle = 'rgba(248,250,252,0.85)'
        ctx.beginPath()
        ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fb7185'
        ctx.beginPath()
        ctx.arc(4, 0, 4, 0, Math.PI * 2)
        ctx.fill()
      } else if (s.kind === 'leihai') {
        ctx.strokeStyle = '#fde047'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(-8, -4)
        ctx.lineTo(0, 2)
        ctx.lineTo(10, -3)
        ctx.stroke()
      } else if (s.kind === 'time_silk') {
        ctx.strokeStyle = '#fdba74'
        ctx.lineWidth = 1.5
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(-14, 0)
        ctx.lineTo(16, 0)
        ctx.stroke()
        ctx.setLineDash([])
      } else if (s.kind === 'spirit_claw') {
        ctx.strokeStyle = '#a78bfa'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(-6, -8)
        ctx.lineTo(10, 0)
        ctx.lineTo(-6, 8)
        ctx.stroke()
      } else if (s.kind === 'shennian') {
        ctx.fillStyle = 'rgba(231,229,228,0.55)'
        ctx.beginPath()
        ctx.arc(0, 0, 10, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#a8a29e'
        ctx.lineWidth = 1.5
        ctx.stroke()
      } else if (s.kind === 'dao_ray') {
        ctx.fillStyle = '#fff7ed'
        ctx.beginPath()
        ctx.moveTo(-6, -3)
        ctx.lineTo(22, 0)
        ctx.lineTo(-6, 3)
        ctx.closePath()
        ctx.fill()
      } else {
        ctx.fillStyle = s.color || '#fff'
        ctx.beginPath()
        ctx.arc(0, 0, 5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
  },

  _launchFireball(target, realm) {
    if (!this._fireballs) this._fireballs = []
    const dx = target.x - this._playerX
    const dy = target.y - this._playerY
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    this._fireballs.push({
      x: this._playerX,
      y: this._playerY - 12,
      vx: (dx / dist) * 220,
      vy: (dy / dist) * 220,
      life: 2.2,
      r: 7,
      dmg: 4 + Math.floor((realm.lv || 2) * 1.5)
    })
    this._burst(this._playerX, this._playerY - 12, '#fb923c', 6)
  },

  _updateFireballs(dt, realm) {
    const list = this._fireballs || []
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i]
      b.life -= dt
      b.x += b.vx * dt
      b.y += b.vy * dt
      if (Math.random() < 0.4) {
        this._particles.push({
          x: b.x,
          y: b.y,
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          life: 0.2,
          color: Math.random() > 0.5 ? '#fb923c' : '#fde047'
        })
      }
      let hit = false
      for (let zi = 0; zi < (this._zombies || []).length; zi++) {
        const z = this._zombies[zi]
        if (z.state === 'dead') continue
        const dx = b.x - z.x
        const dy = b.y - (z.y - (z.floatY || 0))
        if (dx * dx + dy * dy < (z.r + b.r) * (z.r + b.r)) {
          this._hitZombie(z, b.dmg, b.x, b.y, realm, 'fire', true)
          z.fireT = Math.max(z.fireT || 0, 2.8)
          z.fireTick = 0
          this._burst(b.x, b.y, '#fb923c', 10)
          hit = true
          break
        }
      }
      if (hit || b.life <= 0) list.splice(i, 1)
    }
  },

  _launchQingyuanBeam(target, realm) {
    const dx = target.x - this._playerX
    const dy = target.y - this._playerY
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    // 瞬时剑芒：直线粒子 + 伤害
    for (let i = 0; i < 10; i++) {
      const u = i / 10
      this._particles.push({
        x: this._playerX + dx * u,
        y: this._playerY - 8 + dy * u,
        vx: (dx / dist) * 40,
        vy: (dy / dist) * 40,
        life: 0.28,
        color: '#67e8f9'
      })
    }
    this._hitZombie(target, 7 + (realm.lv || 3) * 2, this._playerX, this._playerY, realm, null, true)
    this._burst(target.x, target.y, '#38bdf8', 8)
  },

  _spawnInsectBurst(target) {
    if (!this._insectFx) this._insectFx = []
    for (let i = 0; i < 10; i++) {
      this._insectFx.push({
        x: this._playerX + (Math.random() - 0.5) * 30,
        y: this._playerY + (Math.random() - 0.5) * 24,
        tx: target.x + (Math.random() - 0.5) * 20,
        ty: target.y + (Math.random() - 0.5) * 16,
        life: 0.7 + Math.random() * 0.3,
        hit: false
      })
    }
  },

  _updateInsectFx(dt, realm) {
    const list = this._insectFx || []
    for (let i = list.length - 1; i >= 0; i--) {
      const bug = list[i]
      bug.life -= dt
      bug.x += (bug.tx - bug.x) * Math.min(1, dt * 5)
      bug.y += (bug.ty - bug.y) * Math.min(1, dt * 5)
      if (!bug.hit && bug.life < 0.35) {
        bug.hit = true
        for (let zi = 0; zi < (this._zombies || []).length; zi++) {
          const z = this._zombies[zi]
          if (z.state === 'dead') continue
          const dx = bug.x - z.x
          const dy = bug.y - z.y
          if (dx * dx + dy * dy < (z.r + 14) * (z.r + 14)) {
            this._hitZombie(z, 2 + Math.floor((realm.lv || 4) * 0.6), bug.x, bug.y, realm, null, false)
            break
          }
        }
      }
      if (bug.life <= 0) list.splice(i, 1)
    }
  },

  /** 元婴大庚：天圆竖剑 → 汇聚 → 长老下拉剑圈 → 点指贯体 5s → 插地 → 长老消散 → 剑归 */
  _startVoidGengFormation() {
    const w = this._w
    const h = this._h
    const px = this._playerX
    const py = this._playerY
    let target = null
    for (let i = 0; i < (this._zombies || []).length; i++) {
      const z = this._zombies[i]
      if (z.state !== 'dead') {
        target = z
        break
      }
    }
    const tx = target ? target.x : w * 0.5
    const ty = target ? target.y : h * 0.5
    // 人物移到阵心
    const mid = this._clampToGrass((px + tx) * 0.5, (py + ty) * 0.5)
    this._playerX = mid.x
    this._playerY = mid.y
    const cx = mid.x
    const cy = mid.y
    const skyR = Math.min(w, h) * 0.38
    const swords = []
    // 插地：横 7 竖 8 = 56，余下 8 把插在外围
    const plantCols = 7
    const plantRows = 8
    for (let i = 0; i < GENG_SWORD_COUNT; i++) {
      const a = (Math.PI * 2 * i) / GENG_SWORD_COUNT - Math.PI / 2
      const skyX = cx + Math.cos(a) * skyR
      const skyY = Math.max(40, cy - Math.min(h * 0.4, 170)) + Math.sin(a) * skyR * 0.28
      let plantX
      let plantY
      if (i < plantCols * plantRows) {
        const col = i % plantCols
        const row = Math.floor(i / plantCols)
        plantX = tx - ((plantCols - 1) * 15) * 0.5 + col * 15
        plantY = ty - ((plantRows - 1) * 13) * 0.5 + row * 13
      } else {
        const j = i - plantCols * plantRows
        const aa = (Math.PI * 2 * j) / 8
        plantX = tx + Math.cos(aa) * 62
        plantY = ty + Math.sin(aa) * 48
      }
      swords.push({
        i: i,
        a: a,
        x: skyX,
        y: skyY - 50,
        skyX: skyX,
        skyY: skyY,
        tipAngle: Math.PI / 2,
        scale: 0,
        delay: (i / GENG_SWORD_COUNT) * 0.35,
        plantX: plantX,
        plantY: plantY,
        piercePhase: (i / GENG_SWORD_COUNT) * 0.85
      })
    }
    this._gengFx = {
      style: 'void64',
      t: 0,
      phase: 'sky',
      swords: swords,
      links: [],
      cx: cx,
      cy: cy - 90,
      ringR: skyR,
      targetId: target ? target.id : null,
      targetX: tx,
      targetY: ty,
      skyDur: 1.25,
      convergeDur: 1.05,
      pullDur: 1.0,
      pointDur: 0.6,
      pierceDur: 5.0,
      plantDur: 1.2,
      vanishDur: 0.85,
      recallDur: 1.4,
      endDur: 0.45,
      killed: false,
      dmgAcc: 0,
      pierceDealt: 0,
      // 贯体过程磨血，收尾必斩杀长老（对应「死亡后剑归」演出）
      pierceHpRatio: 0.55
    }
    this._breakMute = 14.5
  },

  /** 为场上僵尸分配剑阵内散开落点（不全挤中间） */
  _assignGengScatterTargets(fx) {
    const list = this._zombies || []
    for (let i = 0; i < list.length; i++) {
      const z = list[i]
      if (z.state === 'dead') continue
      const a = Math.random() * Math.PI * 2
      const rr = fx.radius * (0.18 + Math.random() * 0.6)
      z.gengFromX = z.x
      z.gengFromY = z.y
      z.gengTx = fx.cx + Math.cos(a) * rr
      z.gengTy = fx.cy + Math.sin(a) * rr * 0.92
      z.gengScale = 1
      z.emerge = 1
      z.floatY = 0
    }
  },

  _updateGengFormation(dt, realm) {
    const fx = this._gengFx
    if (!fx) return
    if (fx.style === 'void64') {
      this._updateVoidGengFormation(dt, realm)
      return
    }
    if (fx.style === 'blink_jian') {
      this._updateBlinkJianUlt(dt, realm)
      return
    }
    if (fx.style === 'wuxing_array') {
      this._updateWuxingArrayUlt(dt, realm)
      return
    }
    if (fx.style === 'jianying') {
      this._updateJianyingUlt(dt, realm)
      return
    }
    if (fx.style === 'yuanci') {
      this._updateYuanciUlt(dt, realm)
      return
    }
    if (fx.style === 'xuantian') {
      this._updateXuantianUlt(dt, realm)
      return
    }
    if (fx.style === 'avatar') {
      this._updateAvatarUlt(dt, realm)
      return
    }
    if (fx.style === 'time_law') {
      this._updateTimeLawUlt(dt, realm)
      return
    }
    if (fx.style === 'dao_crush') {
      this._updateDaoCrushUlt(dt, realm)
      return
    }
    fx.t += dt
    const px = this._playerX
    const py = this._playerY

    // 身上汇聚：剑从人物身上陆续抽出，环绕成形
    if (fx.phase === 'gather') {
      for (let i = 0; i < fx.swords.length; i++) {
        const s = fx.swords[i]
        const local = Math.max(0, fx.t - s.delay)
        const u = Math.min(1, local / 0.45)
        const ease = 1 - Math.pow(1 - u, 2)
        const r = fx.orbitR * (0.15 + 0.85 * ease)
        s.x = px + Math.cos(s.a) * r
        s.y = py + Math.sin(s.a) * r
        s.tipAngle = s.tipOut
        s.scale = ease
      }
      if (fx.t >= fx.gatherDur) {
        fx.phase = 'fly'
        fx.t = 0
        for (let i = 0; i < fx.swords.length; i++) {
          const s = fx.swords[i]
          s.fromX = s.x
          s.fromY = s.y
          s.scale = 1
        }
      }
      return
    }

    if (fx.phase === 'fly') {
      const u = Math.min(1, fx.t / fx.flyDur)
      for (let i = 0; i < fx.swords.length; i++) {
        const s = fx.swords[i]
        const iu = Math.min(1, Math.max(0, (u * 1.15) - (i / GENG_SWORD_COUNT) * 0.15))
        const e = 1 - Math.pow(1 - iu, 3)
        const fx0 = s.fromX != null ? s.fromX : px
        const fy0 = s.fromY != null ? s.fromY : py
        s.x = fx0 + (s.tx - fx0) * e
        s.y = fy0 + (s.ty - fy0) * e
        let da = s.tipIn - s.tipOut
        while (da > Math.PI) da -= Math.PI * 2
        while (da < -Math.PI) da += Math.PI * 2
        s.tipAngle = s.tipOut + da * e
        s.scale = 1
      }
      if (fx.t >= fx.flyDur) {
        for (let i = 0; i < fx.swords.length; i++) {
          const s = fx.swords[i]
          s.x = s.tx
          s.y = s.ty
          s.tipAngle = s.tipIn
        }
        fx.phase = 'suck'
        fx.t = 0
        this._assignGengScatterTargets(fx)
      }
      return
    }

    if (fx.phase === 'suck') {
      const u = Math.min(1, fx.t / fx.suckDur)
      const ease = 1 - Math.pow(1 - u, 2)
      for (let i = 0; i < this._zombies.length; i++) {
        const z = this._zombies[i]
        if (z.state === 'dead') continue
        const fx0 = z.gengFromX != null ? z.gengFromX : z.x
        const fy0 = z.gengFromY != null ? z.gengFromY : z.y
        const tx = z.gengTx != null ? z.gengTx : fx.cx
        const ty = z.gengTy != null ? z.gengTy : fx.cy
        z.x = fx0 + (tx - fx0) * ease
        z.y = fy0 + (ty - fy0) * ease
        z.gengScale = 1 - 0.58 * ease
        z.emerge = 1
        z.state = 'hurt'
        z.frameT = 0
      }
      if (fx.t >= fx.suckDur) {
        fx.phase = 'zap'
        fx.t = 0
        fx.killed = false
      }
      return
    }

    if (fx.phase === 'zap') {
      for (let i = 0; i < this._zombies.length; i++) {
        const z = this._zombies[i]
        if (z.state === 'dead') continue
        z.gengScale = 0.42
        z.x += Math.sin((this._animT || 0) * 28 + z.id) * 0.35
        z.y += Math.cos((this._animT || 0) * 24 + z.id) * 0.25
        z.state = 'hurt'
      }
      if (!fx.killed && fx.t >= fx.killAt) {
        fx.killed = true
        for (let i = this._zombies.length - 1; i >= 0; i--) {
          const z = this._zombies[i]
          if (z.state === 'dead') continue
          this._burst(z.x, z.y, '#fbbf24', 14)
          this._burst(z.x, z.y, '#fef08a', 10)
          // 境主：大庚只砍一段血，不秒杀
          if (z.isRealmGuardian || z.isBoss) {
            this._dealGuardianRatioHit(z, 0.26, fx.cx, fx.cy, realm, 'elec')
            z.gengScale = 1
            z.state = z.hp <= 0 ? 'dead' : 'hurt'
            z.frameT = 0
            if (z.hp <= 0) {
              this._dropLootFromZombie(z)
              const wasGuardian = !!z.isRealmGuardian
              const wasHeart = !!z.isHeartDemon
              this._zombies.splice(i, 1)
              this._registerKill({
                skipDan: true,
                boss: true,
                realmGuardian: wasGuardian,
                heartDemon: wasHeart
              })
            }
          } else {
            this._dropLootFromZombie(z)
            this._zombies.splice(i, 1)
            this._registerKill({ skipDan: true })
          }
        }
        this._focusZombie = null
      }
      if (fx.t >= fx.zapDur) {
        fx.phase = 'end'
        fx.t = 0
      }
      return
    }

    if (fx.phase === 'end') {
      if (fx.t >= fx.endDur) {
        this._gengFx = null
        this._corpseDan = 0
        this.setData({ corpseDan: 0 })
        if (this._bossDeferred) this._maybeStartBossChallenge()
        if (this._bossDefeatedDeferred) {
          this._bossDefeatedDeferred = false
          const skip = !!this._bossDefeatedDeferredHeart
          this._bossDefeatedDeferredHeart = false
          this._onBossDefeated({ skipHeartDemon: skip })
        }
      }
    }
  },

  _findGengTarget(fx, allowDead) {
    if (!fx) return null
    const list = this._zombies || []
    if (fx.targetId != null) {
      for (let i = 0; i < list.length; i++) {
        if (list[i].id === fx.targetId) {
          if (allowDead || list[i].state !== 'dead') return list[i]
        }
      }
    }
    for (let i = 0; i < list.length; i++) {
      if (allowDead || list[i].state !== 'dead') return list[i]
    }
    return null
  },

  _finishGengFx() {
    this._gengFx = null
    this._corpseDan = 0
    this.setData({ corpseDan: 0 })
    if (this._bossDeferred) this._maybeStartBossChallenge()
    if (this._bossDefeatedDeferred) {
      this._bossDefeatedDeferred = false
      const skip = !!this._bossDefeatedDeferredHeart
      this._bossDefeatedDeferredHeart = false
      this._onBossDefeated({ skipHeartDemon: skip })
    }
  },

  _updateVoidGengFormation(dt, realm) {
    const fx = this._gengFx
    if (!fx) return
    fx.t += dt
    const px = this._playerX
    const py = this._playerY
    const target = this._findGengTarget(fx)
    if (target) {
      fx.targetX = target.x
      fx.targetY = target.y
    }
    const tx = fx.targetX
    const ty = fx.targetY

    // 天空：大圆圈上竖立 72 雷剑
    if (fx.phase === 'sky') {
      for (let i = 0; i < fx.swords.length; i++) {
        const s = fx.swords[i]
        const local = Math.max(0, fx.t - s.delay)
        const u = Math.min(1, local / 0.45)
        const ease = 1 - Math.pow(1 - u, 2)
        s.x = s.skyX
        s.y = s.skyY - 36 + ease * 36
        s.tipAngle = Math.PI / 2
        s.scale = ease
      }
      if (fx.t >= fx.skyDur) {
        fx.phase = 'converge'
        fx.t = 0
        for (let i = 0; i < fx.swords.length; i++) {
          const s = fx.swords[i]
          s.fromX = s.x
          s.fromY = s.y
          s.scale = 1
        }
      }
      return
    }

    // 汇聚：圆圈收拢到人物上空
    if (fx.phase === 'converge') {
      const u = Math.min(1, fx.t / fx.convergeDur)
      const ring = fx.ringR * (1 - 0.35 * u)
      fx.cx = px
      fx.cy = py - 88
      for (let i = 0; i < fx.swords.length; i++) {
        const s = fx.swords[i]
        const destX = fx.cx + Math.cos(s.a) * ring
        const destY = fx.cy + Math.sin(s.a) * ring * 0.42
        const iu = Math.min(1, Math.max(0, u * 1.12 - s.delay * 0.4))
        const e = 1 - Math.pow(1 - iu, 3)
        s.x = s.fromX + (destX - s.fromX) * e
        s.y = s.fromY + (destY - s.fromY) * e
        s.tipAngle = Math.PI / 2
        s.scale = 1
      }
      if (fx.t >= fx.convergeDur) {
        fx.phase = 'pull'
        fx.t = 0
        for (let i = 0; i < fx.swords.length; i++) {
          const s = fx.swords[i]
          s.fromX = s.x
          s.fromY = s.y
        }
      }
      return
    }

    // 魔族把剑圆拉到自己下方，人物仍在圆中
    if (fx.phase === 'pull') {
      const u = Math.min(1, fx.t / fx.pullDur)
      const ease = 1 - Math.pow(1 - u, 2)
      const ring = fx.ringR * 0.55
      fx.cx = px + (tx - px) * 0.35 * ease
      fx.cy = py + ((ty + 36) - py) * ease
      // 魔族略微上提，像在拽阵
      if (target && target.state !== 'dead') {
        target.floatY = 10 + ease * 16
        target.state = 'skill'
      }
      for (let i = 0; i < fx.swords.length; i++) {
        const s = fx.swords[i]
        const destX = fx.cx + Math.cos(s.a) * ring
        const destY = fx.cy + Math.sin(s.a) * ring * 0.5
        s.x = s.fromX + (destX - s.fromX) * ease
        s.y = s.fromY + (destY - s.fromY) * ease
        s.tipAngle = Math.PI / 2
        s.scale = 1
      }
      if (fx.t >= fx.pullDur) {
        fx.phase = 'point'
        fx.t = 0
        if (target) target.floatY = 0
      }
      return
    }

    if (fx.phase === 'point') {
      fx.cx = px
      fx.cy = ty + 28
      const ring = fx.ringR * 0.5
      for (let i = 0; i < fx.swords.length; i++) {
        const s = fx.swords[i]
        s.x = fx.cx + Math.cos(s.a) * ring
        s.y = fx.cy + Math.sin(s.a) * ring * 0.48
        s.tipAngle = Math.atan2(ty - s.y, tx - s.x)
        s.scale = 1.05
      }
      if (fx.t >= fx.pointDur) {
        fx.phase = 'pierce'
        fx.t = 0
        fx.dmgAcc = 0
        fx.pierceDealt = 0
        for (let i = 0; i < fx.swords.length; i++) {
          const s = fx.swords[i]
          s.fromX = s.x
          s.fromY = s.y
        }
      }
      return
    }

    if (fx.phase === 'pierce') {
      for (let i = 0; i < fx.swords.length; i++) {
        const s = fx.swords[i]
        const cycle = ((fx.t * 1.4 + s.piercePhase) % 1)
        const pass = cycle < 0.6 ? cycle / 0.6 : 1
        const ease = pass * pass
        const overX = tx + Math.sin(i * 1.7) * 8
        const overY = ty + 48
        s.x = s.fromX + (overX - s.fromX) * ease
        s.y = s.fromY + (overY - s.fromY) * ease
        s.tipAngle = Math.atan2(overY - s.fromY, overX - s.fromX)
        s.scale = 0.95 + Math.sin(fx.t * 20 + i) * 0.08
        if (cycle > 0.9) {
          s.fromX = fx.cx + Math.cos(s.a) * fx.ringR * 0.45
          s.fromY = fx.cy + Math.sin(s.a) * fx.ringR * 0.4
        }
      }
      // 贯体持续削血；收尾斩杀长老
      fx.dmgAcc += dt
      if (target && target.state !== 'dead' && fx.dmgAcc >= 0.22) {
        fx.dmgAcc = 0
        const budget = Math.max(80, Math.floor(target.maxHp * (fx.pierceHpRatio || 0.55)))
        const left = Math.max(0, budget - (fx.pierceDealt || 0))
        if (left > 0) {
          const ticks = Math.max(1, Math.ceil(fx.pierceDur / 0.22))
          const tickDmg = Math.max(4, Math.ceil(budget / ticks))
          const deal = Math.min(left, tickDmg)
          fx.pierceDealt = (fx.pierceDealt || 0) + deal
          this._hitZombie(target, deal, tx, ty, realm, 'elec', false)
          this._burst(tx, ty, '#fef08a', 4)
        }
      }
      if (fx.t >= fx.pierceDur) {
        if (target && target.state !== 'dead') {
          this._hitZombie(target, target.hp + 99, tx, ty, realm, 'elec', false)
        }
        for (let i = 0; i < fx.swords.length; i++) {
          const s = fx.swords[i]
          s.fromX = s.x
          s.fromY = s.y
        }
        fx.phase = 'plant'
        fx.t = 0
      }
      return
    }

    if (fx.phase === 'plant') {
      for (let i = 0; i < fx.swords.length; i++) {
        const s = fx.swords[i]
        const iu = Math.min(1, Math.max(0, (fx.t / fx.plantDur) * 1.2 - (i / GENG_SWORD_COUNT) * 0.25))
        const e = 1 - Math.pow(1 - iu, 2)
        s.x = s.fromX + (s.plantX - s.fromX) * e
        s.y = s.fromY + (s.plantY - s.fromY) * e
        s.tipAngle = -Math.PI / 2
        s.scale = 1
      }
      if (fx.t >= fx.plantDur) {
        fx.phase = 'vanish'
        fx.t = 0
        const left = this._findGengTarget(fx, true) || target
        if (left) {
          fx.killZombie = left
          left.state = 'dead'
          left.frameT = 0
          left.gengScale = 1
          this._emitMonsterFx(left, 'death', 1.4)
          this._burst(left.x, left.y, '#1e1b4b', 18)
          this._burst(left.x, left.y, '#7c3aed', 12)
        }
      }
      return
    }

    // 长老黑气消散，剑仍插地；消散完才召回
    if (fx.phase === 'vanish') {
      const u = Math.min(1, fx.t / (fx.vanishDur || 0.85))
      const z = fx.killZombie
      if (z) {
        z.gengScale = Math.max(0.05, 1 - u)
        z.alphaMul = Math.max(0.05, 1 - u)
        z.floatY = u * 20
      }
      if (fx.t >= (fx.vanishDur || 0.85)) {
        if (z) {
          const idx = this._zombies.indexOf(z)
          if (idx >= 0) {
            this._dropLootFromZombie(z)
            this._zombies.splice(idx, 1)
          }
          this._focusZombie = null
          this._bossDefeatedDeferred = true
          this._bossActive = false
          this._kills += 1
          if (canSpaceBlink(this._realmLv)) {
            this._spaceForce = Math.min(SPACE_FORCE_MAX, (this._spaceForce || 0) + SPACE_FORCE_PER_KILL)
            this.setData({ spaceForce: Math.floor(this._spaceForce), maxSpaceForce: SPACE_FORCE_MAX })
          }
          const cur = realmByLv(this._realmLv)
          this.setData({
            kills: this._kills,
            realmLv: cur.lv,
            realmName: cur.name,
            realmTierName: cur.tierName
          })
          this._persistProgress(false)
          fx.killZombie = null
        }
        fx.killed = true
        fx.phase = 'recall'
        fx.t = 0
        for (let i = 0; i < fx.swords.length; i++) {
          const s = fx.swords[i]
          s.fromX = s.x
          s.fromY = s.y
        }
      }
      return
    }

    if (fx.phase === 'recall') {
      for (let i = 0; i < fx.swords.length; i++) {
        const s = fx.swords[i]
        const a = (Math.PI * 2 * i) / GENG_SWORD_COUNT
        const destX = px + Math.cos(a) * 28
        const destY = py + Math.sin(a) * 28
        const iu = Math.min(1, Math.max(0, (fx.t / fx.recallDur) * 1.15 - (i / GENG_SWORD_COUNT) * 0.2))
        const e = 1 - Math.pow(1 - iu, 3)
        s.x = s.fromX + (destX - s.fromX) * e
        s.y = s.fromY + (destY - s.fromY) * e
        s.tipAngle = a
        s.scale = 1 - e * 0.35
      }
      if (fx.t >= fx.recallDur) {
        fx.phase = 'end'
        fx.t = 0
      }
      return
    }

    if (fx.phase === 'end') {
      if (fx.t >= fx.endDur) this._finishGengFx()
    }
  },

  /** 突破：全屏清尸（不计杀）+ 短暂停刷 + 境界特效；道祖触发大圆满 */
  _onRealmBreakthrough(realm) {
    // 一章一局：禁止破境链推进
    if (this._chapterActive) {
      this._zombies = []
      this._swords = []
      this._focusZombie = null
      this._spawnAcc = 0
      return
    }
    const zombies = this._zombies || []
    for (let i = 0; i < zombies.length; i++) {
      const z = zombies[i]
      this._burst(z.x, z.y, realm.color, 10)
    }
    this._zombies = []
    this._swords = []
    this._focusZombie = null
    this._spawnAcc = 0
    this._burst(this._playerX, this._playerY, realm.color, 22)
    this._syncPlayerHpCap(realm)
    this._healPlayer(Math.floor(this._maxHp * 0.35))

    // 最高境：清场后飞至中央，水墨「大圆满」
    if (realm.lv >= REALMS.length || realm.majorKey === 'daozu') {
      this._breakFx = null
      this._breakMute = 999
      this._perfectFx = {
        t: 0,
        flyDur: 1.35,
        holdDur: 2.8,
        fromX: this._playerX,
        fromY: this._playerY,
        toX: this._w * 0.5,
        toY: this._h * 0.46,
        color: realm.color
      }
      return
    }

    this._breakMute = 1.6
    const duration = realm.tier === '上' ? 2.6 : (realm.tier === '中' ? 2.2 : 1.8)
    this._breakFx = {
      t: 0,
      duration,
      name: realm.name,
      tierName: realm.tierName,
      short: realm.short,
      color: realm.color,
      tier: realm.tier,
      fxKey: realm.fx || ''
    }
  },

  /** 大圆满：飞入画面中央后定格展示 */
  _updatePerfect(dt) {
    const fx = this._perfectFx
    if (!fx) return
    fx.t += dt
    const u = Math.min(1, fx.t / fx.flyDur)
    // 缓出飞升
    const e = 1 - Math.pow(1 - u, 3)
    this._playerX = fx.fromX + (fx.toX - fx.fromX) * e
    this._playerY = fx.fromY + (fx.toY - fx.fromY) * e
    this._animT += dt
    if (fx.t >= fx.flyDur + fx.holdDur && !this._perfect) {
      this._perfect = true
      this._teardownCanvas()
      this.setData({
        perfect: true,
        kills: this._kills,
        realmName: '道祖',
        realmTierName: '上境界'
      })
    }
  },

  _launchSwords(realm) {
    const n = Math.max(1, Math.min(MAX_SWORD_COUNT, this._swordCount || 1))
    const cost = swordLingCost(n)
    if ((this._lingQi || 0) < cost) {
      if (this._lingQiWarnT <= 0) {
        this._lingQiWarnT = 1.6
        wx.showToast({ title: '灵气不足 · 打坐吸纳', icon: 'none', duration: 1400 })
      }
      return
    }
    this._addLingQi(-cost)
    const combat = getRealmCombat(realm.lv)
    const majorKey = (combat && combat.key) || realm.majorKey || 'lianqi'
    const sw = getRealmSwordStyle(majorKey)
    const baseAngle = -Math.PI / 2
    const spread = Math.min(Math.PI * 1.6, 0.11 * (n - 1))
    const orbitR = 22
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + (this._animT || 0) * 1.05
      const ang = n === 1 ? baseAngle : (baseAngle - spread / 2 + (i / Math.max(1, n - 1)) * spread)
      let enchant = null
      if (sw.enchant && Math.random() < (sw.enchantChance || 0)) enchant = sw.enchant
      // 合体：偶发双色合道剑；大罗：偶发三尸斩
      if (majorKey === 'heti' && Math.random() < 0.35) enchant = 'elec'
      if (majorKey === 'daluo' && i % 3 === 0) enchant = 'elec'
      this._swords.push({
        x: this._playerX + Math.cos(a) * orbitR,
        y: this._playerY - 14 + Math.sin(a) * (orbitR * 0.55),
        angle: ang,
        speed: 270 + realm.lv * 35 + (sw.speed || 0),
        dmg: 2 + Math.floor(realm.lv * 0.85) + (sw.dmg || 0),
        life: 4.5,
        color: sw.color || realm.sword || realm.color,
        enchant: enchant,
        style: sw.style || 'ink',
        hitIds: {},
        mode: 'hunt'
      })
    }
  },

  _burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 40 + Math.random() * 80
      this._particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.25 + Math.random() * 0.25,
        color
      })
    }
  },

  _gameOver() {
    this._over = true
    this._teardownCanvas()
    this.setData({
      over: true,
      kills: this._kills,
      wave: this._wave,
      realmName: realmByLv(this._realmLv).name,
      gameUiReady: true,
      chapterTitle: (this._chapter && this._chapter.title) || '',
      chapterUnit: (this._chapter && this._chapter.unitCode) || ''
    })
  },

  _drawFlyingSword(ctx, s) {
    const color = s.color || '#334155'
    const style = s.style || 'ink'
    ctx.save()
    ctx.translate(s.x, s.y)
    ctx.rotate(s.angle)
    // 境界剑气拖尾
    this._paintSwordTrail(ctx, color, style)
    this._paintInkSword(ctx, color, 1, style)
    if (s.enchant) this._paintSwordEnchantFx(ctx, s.enchant)
    ctx.restore()
  },

  /** 飞剑拖尾：按大境界气质区分 */
  _paintSwordTrail(ctx, color, style) {
    const t = this._animT || 0
    ctx.save()
    ctx.globalAlpha = 0.35
    if (style === 'void') {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.4
      ctx.setLineDash([4, 5])
      ctx.beginPath()
      ctx.moveTo(-28, 0)
      ctx.lineTo(-6, 0)
      ctx.stroke()
      ctx.setLineDash([])
    } else if (style === 'magnet') {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.2
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath()
        ctx.arc(-8 - i * 6, 0, 4 + i, 0, Math.PI * 2)
        ctx.stroke()
      }
    } else if (style === 'thunder') {
      ctx.strokeStyle = '#fef08a'
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.moveTo(-22, -3)
      ctx.lineTo(-14, 2)
      ctx.lineTo(-8, -2)
      ctx.stroke()
    } else if (style === 'flame' || style === 'law') {
      ctx.fillStyle = style === 'law' ? 'rgba(251,113,133,0.35)' : 'rgba(251,146,60,0.4)'
      ctx.beginPath()
      ctx.ellipse(-12, 0, 12, 3 + Math.sin(t * 14) * 1.5, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (style === 'spirit' || style === 'origin') {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(-20, -4)
      ctx.lineTo(-6, 0)
      ctx.moveTo(-20, 4)
      ctx.lineTo(-6, 0)
      ctx.stroke()
    } else if (style === 'time' || style === 'dao') {
      ctx.strokeStyle = color
      ctx.globalAlpha = 0.45
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(-10, 0, 6 + Math.sin(t * 6), 0, Math.PI * 1.6)
      ctx.stroke()
    } else if (style === 'leaf' || style === 'wave') {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(-18, 0)
      ctx.quadraticCurveTo(-12, style === 'wave' ? 5 : -4, -6, 0)
      ctx.stroke()
    }
    ctx.restore()
  },

  /** 飞剑附魔光效（局部坐标，尖端朝 +X） */
  _paintSwordEnchantFx(ctx, enchant) {
    const t = this._animT || 0
    ctx.save()
    if (enchant === 'elec') {
      ctx.strokeStyle = '#67e8f9'
      ctx.lineWidth = 1.2
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.moveTo(-6, -4)
      ctx.lineTo(4, 2)
      ctx.lineTo(10, -3)
      ctx.lineTo(18, 1)
      ctx.stroke()
    } else if (enchant === 'fire') {
      ctx.fillStyle = 'rgba(251,146,60,0.55)'
      ctx.beginPath()
      ctx.ellipse(8, 0, 10, 4 + Math.sin(t * 12) * 1.5, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (enchant === 'ice') {
      ctx.strokeStyle = '#bfdbfe'
      ctx.lineWidth = 1.4
      ctx.globalAlpha = 0.75
      ctx.strokeRect(-2, -5, 16, 10)
    } else if (enchant === 'wind') {
      ctx.strokeStyle = '#86efac'
      ctx.lineWidth = 1.2
      ctx.globalAlpha = 0.65
      ctx.beginPath()
      ctx.arc(6, 0, 8 + Math.sin(t * 8) * 2, 0, Math.PI * 1.4)
      ctx.stroke()
    }
    ctx.restore()
  },

  _drawPickupSword(ctx, p) {
    this._drawLoot(ctx, p)
  },

  _drawLoot(ctx, p) {
    if (!p || isLootTempDisabled(p.key)) return
    const def = LOOT_DEFS[p.key] || LOOT_DEFS.hp
    const bob = Math.sin(p.bob || 0) * 3
    ctx.save()
    ctx.translate(p.x, p.y + bob)
    if (p.key === 'sword') {
      ctx.rotate(p.spin * 0.35 - Math.PI / 5)
      this._paintInkSword(ctx, def.color, 0.9)
    } else if (def.kind === 'fu') {
      ctx.rotate(Math.sin((p.bob || 0) * 0.8) * 0.08)
      this._paintFuScroll(ctx, def.color, def.mark || '符', 1)
    } else {
      ctx.beginPath()
      ctx.arc(0, 0, 14, 0, Math.PI * 2)
      ctx.fillStyle = def.color
      ctx.globalAlpha = 0.9
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = '#1f2937'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(def.mark || '?', 0, 1)
    }
    ctx.restore()
  },

  /**
   * 符箓外形：竖黄符纸 + 朱框 + 符文笔迹 + 主字
   * 原点在符纸中心，尖朝上
   */
  _paintFuScroll(ctx, color, mark, scale) {
    const sc = scale == null ? 1 : scale
    const ink = color || '#b91c1c'
    ctx.save()
    ctx.scale(sc, sc)
    // 符纸（上尖下平的符箓轮廓）
    ctx.beginPath()
    ctx.moveTo(0, -18)
    ctx.lineTo(9, -12)
    ctx.lineTo(10, 16)
    ctx.lineTo(-10, 16)
    ctx.lineTo(-9, -12)
    ctx.closePath()
    ctx.fillStyle = '#f5e6c8'
    ctx.fill()
    ctx.strokeStyle = ink
    ctx.lineWidth = 1.4
    ctx.stroke()
    // 内框
    ctx.strokeStyle = 'rgba(185,28,28,0.55)'
    ctx.lineWidth = 0.9
    ctx.strokeRect(-6.5, -10, 13, 22)
    // 顶部符头横线
    ctx.strokeStyle = ink
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.moveTo(-5, -8)
    ctx.lineTo(5, -8)
    ctx.stroke()
    // 符文笔迹（抽象竖符）
    ctx.strokeStyle = 'rgba(127,29,29,0.75)'
    ctx.lineWidth = 1
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-3.5, -5)
    ctx.lineTo(-3.5, 8)
    ctx.moveTo(0, -4)
    ctx.lineTo(0, 10)
    ctx.moveTo(3.5, -5)
    ctx.lineTo(3.5, 7)
    ctx.moveTo(-4, 0)
    ctx.lineTo(4, 0)
    ctx.moveTo(-3, 5)
    ctx.lineTo(3, 4.5)
    ctx.stroke()
    // 主字
    ctx.fillStyle = '#7f1d1d'
    ctx.font = 'bold 9px "KaiTi","STKaiti",serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(mark || '符', 0, 2)
    // 符角朱点
    ctx.fillStyle = ink
    ctx.beginPath()
    ctx.arc(0, -14.5, 1.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  },

  /**
   * 水墨剑形：剑刃 + 护手 + 剑柄，带飞白/墨点（尖端朝 +X）
   */
  _paintInkSword(ctx, color, scale, style) {
    const sc = scale || 1
    const st = style || 'ink'
    ctx.save()
    ctx.scale(sc, sc)
    ctx.fillStyle = color
    ctx.strokeStyle = color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // 按境界气质改剑刃轮廓
    ctx.globalAlpha = 0.95
    ctx.beginPath()
    if (st === 'leaf') {
      ctx.moveTo(22, 0)
      ctx.quadraticCurveTo(10, 5, -6, 2.2)
      ctx.lineTo(-8, 0)
      ctx.lineTo(-6, -2.2)
      ctx.quadraticCurveTo(10, -5, 22, 0)
    } else if (st === 'wave') {
      ctx.moveTo(22, 0)
      ctx.lineTo(8, 3.4)
      ctx.lineTo(-2, 1.6)
      ctx.lineTo(-8, 2.4)
      ctx.lineTo(-8, -2.4)
      ctx.lineTo(-2, -1.6)
      ctx.lineTo(8, -3.4)
      ctx.closePath()
    } else if (st === 'flame' || st === 'law') {
      ctx.moveTo(24, 0)
      ctx.lineTo(12, 3.5)
      ctx.lineTo(6, 1.5)
      ctx.lineTo(-2, 3.2)
      ctx.lineTo(-8, 2)
      ctx.lineTo(-8, -2)
      ctx.lineTo(-2, -3.2)
      ctx.lineTo(6, -1.5)
      ctx.lineTo(12, -3.5)
      ctx.closePath()
    } else if (st === 'magnet') {
      ctx.moveTo(20, 0)
      ctx.lineTo(6, 3.4)
      ctx.lineTo(-8, 3)
      ctx.lineTo(-8, -3)
      ctx.lineTo(6, -3.4)
      ctx.closePath()
    } else if (st === 'void' || st === 'dao') {
      ctx.moveTo(23, 0)
      ctx.lineTo(5, 2)
      ctx.lineTo(-10, 1.4)
      ctx.lineTo(-10, -1.4)
      ctx.lineTo(5, -2)
      ctx.closePath()
    } else if (st === 'thunder') {
      ctx.moveTo(22, 0)
      ctx.lineTo(10, 2.8)
      ctx.lineTo(4, 0.8)
      ctx.lineTo(-2, 3)
      ctx.lineTo(-8, 1.6)
      ctx.lineTo(-8, -1.6)
      ctx.lineTo(-2, -3)
      ctx.lineTo(4, -0.8)
      ctx.lineTo(10, -2.8)
      ctx.closePath()
    } else if (st === 'spirit' || st === 'origin' || st === 'infant') {
      ctx.moveTo(21, 0)
      ctx.lineTo(7, 2.8)
      ctx.lineTo(-8, 2.4)
      ctx.lineTo(-8, -2.4)
      ctx.lineTo(7, -2.8)
      ctx.closePath()
    } else {
      ctx.moveTo(22, 0)
      ctx.lineTo(6, 2.6)
      ctx.lineTo(-8, 2.2)
      ctx.lineTo(-8, -2.2)
      ctx.lineTo(6, -2.6)
      ctx.closePath()
    }
    ctx.fill()

    // 刃中脊
    ctx.globalAlpha = 0.35
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-7, 0)
    ctx.lineTo(st === 'magnet' ? 16 : 18, 0)
    ctx.stroke()

    // 护手 / 柄（时间剑加环钮，合道加双护手）
    ctx.globalAlpha = 0.9
    ctx.beginPath()
    ctx.moveTo(-8, -5.5)
    ctx.lineTo(-5, -5.5)
    ctx.lineTo(-5, 5.5)
    ctx.lineTo(-8, 5.5)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(-6.5, 0, 2.2, 6.2, 0, 0, Math.PI * 2)
    ctx.fill()
    if (st === 'time' || st === 'origin') {
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.arc(-6.5, 0, 7.5, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (st === 'spirit') {
      ctx.globalAlpha = 0.55
      ctx.beginPath()
      ctx.ellipse(-6.5, 0, 3.2, 8, 0, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.globalAlpha = 0.88
    ctx.beginPath()
    ctx.moveTo(-8, -1.6)
    ctx.lineTo(-18, -1.4)
    ctx.lineTo(-18, 1.4)
    ctx.lineTo(-8, 1.6)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.arc(-19.5, 0, 2.2, 0, Math.PI * 2)
    ctx.fill()

    const dots = [
      [10, 4.2, 0.9], [14, -3.8, 0.75], [-2, 5.5, 0.7],
      [-12, -4.8, 0.65], [4, -5.2, 0.55]
    ]
    ctx.globalAlpha = 0.32
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i]
      ctx.beginPath()
      ctx.arc(d[0], d[1], d[2], 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = 0.18
    ctx.beginPath()
    ctx.ellipse(-22, 0, 4, 2.4, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = 1
    ctx.restore()
  },

  _drawSprite(ctx, img, x, y, size, tintColor, tintBody, faceLeft) {
    if (!img) return
    ctx.save()
    ctx.translate(x, y)
    if (faceLeft) ctx.scale(-1, 1)
    // 仅受伤闪白时轻微光晕，不再用境界/怪物色整圈染色（避免怪光圈）
    if (tintColor && !tintBody) {
      const g = ctx.createRadialGradient(0, 2, size * 0.1, 0, 2, size * 0.5)
      g.addColorStop(0, 'rgba(255,255,255,0.35)')
      g.addColorStop(0.55, tintColor)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.globalAlpha = 0.35
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 2, size * 0.48, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    // 横条多帧图：只画左起一格，避免走动时整页四小怪
    const iw = img.width || 0
    const ih = img.height || 0
    if (iw > 0 && ih > 0 && iw / ih >= 1.6) {
      const frames = Math.max(2, Math.min(6, Math.round(iw / ih)))
      const fw = Math.floor(iw / frames)
      ctx.drawImage(img, 0, 0, fw, ih, -size / 2, -size / 2, size, size)
    } else {
      ctx.drawImage(img, -size / 2, -size / 2, size, size)
    }
    ctx.restore()
  },

  /** 走动连续帧：闲→迈步0→闲→迈步1，帧率随移速 */
  _mobWalkFrame(z) {
    const key = z.typeKey
    if (!key) return null
    const idle = this._mobImgs && this._mobImgs[key]
    const steps = this._mobWalkImgs && this._mobWalkImgs[key]
    const fps = Math.max(5, 5.5 + (z.speedMul || 1) * 3.5)
    const fi = Math.floor((z.frameT || 0) * fps) % 4
    if (steps && (steps[0] || steps[1])) {
      if (fi === 1 && steps[0]) return steps[0]
      if (fi === 3 && steps[1]) return steps[1]
      if (idle) return idle
      return steps[fi % 2] || steps[0] || steps[1]
    }
    return idle || null
  },

  /** 怪物攻击持续特效（跟在怪身上画，避免只闪一下看不见） */
  /** 攻击动作特效：有 atkFx 用命中波；攻击/技能态无命中波时画蓄力/持续动作光 */
  _drawMonsterAttackFx(ctx, z, drawY, size, drawX) {
    const cx = drawX != null ? drawX : z.x
    const attacking = z.state === 'attack' || z.state === 'skill' || (z.dashT || 0) > 0
    const fx = z.atkFx
    if (!fx && !attacking) return
    const t = this._animT || 0
    let u
    let fade
    let atk
    if (fx) {
      u = Math.min(1, fx.t / Math.max(0.01, fx.dur))
      fade = 1 - u
      atk = fx.style || z.atk || 'melee'
    } else {
      const prog = z.state === 'skill' ? (z.skillT || 0) : (z.frameT || 0)
      u = Math.min(1, prog / 0.55)
      fade = 0.45 + 0.55 * Math.sin(u * Math.PI)
      atk = z.atk || 'melee'
    }
    const ang = z.facing || 0
    const pulse = 0.5 + 0.5 * Math.sin(t * 22)
    ctx.save()
    ctx.globalAlpha = 0.9 * fade
    if (atk === 'dash') {
      // 疾尸：残影冲锋线 + 风刃
      const back = size * (0.55 + u * 0.5)
      ctx.strokeStyle = z.tint || '#4ade80'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * 5
        ctx.globalAlpha = 0.35 * fade * (1 - i * 0.2)
        ctx.beginPath()
        ctx.moveTo(cx - Math.cos(ang) * back + Math.sin(ang) * off, drawY - Math.sin(ang) * back * 0.5 - Math.cos(ang) * off)
        ctx.lineTo(cx + Math.cos(ang) * size * 0.15, drawY + Math.sin(ang) * size * 0.08)
        ctx.stroke()
      }
      ctx.globalAlpha = 0.55 * fade
      ctx.fillStyle = 'rgba(74,222,128,0.35)'
      ctx.beginPath()
      ctx.ellipse(cx - Math.cos(ang) * size * 0.2, drawY, size * 0.28, size * 0.12, ang, 0, Math.PI * 2)
      ctx.fill()
    } else if (atk === 'spit') {
      // 喷尸：口前黑紫毒球蓄力 + 溅点
      const mx = cx + Math.cos(ang) * size * (0.28 + u * 0.12)
      const my = drawY - 6
      const r = 5 + u * 8 + pulse * 2
      ctx.fillStyle = 'rgba(124,58,237,0.35)'
      ctx.beginPath()
      ctx.arc(mx, my, r * 1.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#a78bfa'
      ctx.beginPath()
      ctx.arc(mx, my, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#312e81'
      ctx.beginPath()
      ctx.arc(mx - 1, my - 1, r * 0.45, 0, Math.PI * 2)
      ctx.fill()
      for (let i = 0; i < 4; i++) {
        const a = ang + (i - 1.5) * 0.35
        ctx.fillStyle = 'rgba(167,139,250,' + (0.35 * fade) + ')'
        ctx.beginPath()
        ctx.arc(mx + Math.cos(a) * (10 + u * 14), my + Math.sin(a) * (6 + u * 8), 2.2, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (atk === 'slam') {
      // 巨尸：脚下震波环 + 碎石弧
      const er = size * (0.22 + u * 0.55)
      ctx.strokeStyle = '#fb923c'
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.ellipse(cx, drawY + size * 0.3, er, er * 0.38, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 0.4 * fade
      ctx.strokeStyle = '#fdba74'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(cx, drawY + size * 0.3, er * 0.65, er * 0.25, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 0.75 * fade
      ctx.fillStyle = '#f97316'
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI * 0.15 + i * 0.12
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * er * 0.7, drawY + size * 0.28)
        ctx.lineTo(cx + Math.cos(a) * er * 1.05, drawY + size * 0.1 - u * 8)
        ctx.lineTo(cx + Math.cos(a + 0.08) * er * 0.75, drawY + size * 0.28)
        ctx.fill()
      }
    } else if (atk === 'phase') {
      // 幽尸：叠影环 + 淡出残像
      ctx.strokeStyle = '#67e8f9'
      ctx.lineWidth = 2.2
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = (0.55 - i * 0.15) * fade
        ctx.beginPath()
        ctx.arc(cx - Math.cos(ang) * i * 8, drawY, size * (0.18 + u * 0.28 + i * 0.06), 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 0.25 * fade * pulse
      ctx.fillStyle = 'rgba(103,232,249,0.4)'
      ctx.beginPath()
      ctx.arc(cx, drawY, size * (0.22 + u * 0.15), 0, Math.PI * 2)
      ctx.fill()
    } else if (atk === 'scream') {
      // 嚎尸：声波环 + 三角音锥
      ctx.strokeStyle = '#f472b6'
      ctx.lineWidth = 2.2
      for (let i = 0; i < 4; i++) {
        ctx.globalAlpha = (0.7 - i * 0.12) * fade
        ctx.beginPath()
        ctx.arc(cx, drawY, size * (0.18 + i * 0.14 + u * 0.28), 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 0.35 * fade
      ctx.fillStyle = 'rgba(244,114,182,0.35)'
      ctx.beginPath()
      ctx.moveTo(cx, drawY)
      ctx.arc(cx, drawY, size * (0.35 + u * 0.4), ang - 0.55, ang + 0.55)
      ctx.closePath()
      ctx.fill()
    } else if (atk === 'crescent') {
      // 魔族：蓄力月牙魔气
      const mx = cx + Math.cos(ang) * size * (0.3 + u * 0.15)
      const my = drawY - 4
      ctx.globalAlpha = 0.75 * fade
      ctx.fillStyle = '#4c1d95'
      ctx.beginPath()
      ctx.arc(mx, my, 10 + u * 8, ang - 1.1, ang + 1.1)
      ctx.arc(mx + Math.cos(ang) * 7, my + Math.sin(ang) * 7, 7 + u * 5, ang + 1.1, ang - 1.1, true)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#c4b5fd'
      ctx.lineWidth = 1.5
      ctx.stroke()
    } else if (atk === 'claw' || atk === 'phase') {
      ctx.strokeStyle = z.crescentGlow || z.tint || '#86efac'
      ctx.lineWidth = 2.4
      ctx.lineCap = 'round'
      for (let i = -1; i <= 1; i++) {
        const a0 = ang - 0.55 + u * 1.1 + i * 0.2
        ctx.globalAlpha = (0.8 - Math.abs(i) * 0.2) * fade
        ctx.beginPath()
        ctx.arc(cx, drawY, size * (0.3 + u * 0.15), a0, a0 + 0.5)
        ctx.stroke()
      }
      if (atk === 'phase') {
        ctx.globalAlpha = 0.4 * fade
        ctx.strokeStyle = '#67e8f9'
        ctx.beginPath()
        ctx.ellipse(cx, drawY, size * 0.35, size * 0.18, ang, 0, Math.PI * 2)
        ctx.stroke()
      }
    } else {
      // 腐尸近战：弧形爪痕 + 斩击闪光
      const sweep = ang - 0.7 + u * 1.4
      ctx.strokeStyle = z.tint || '#86efac'
      ctx.lineWidth = 2.6
      ctx.lineCap = 'round'
      for (let i = -1; i <= 1; i++) {
        const a0 = sweep + i * 0.22
        const a1 = a0 + 0.55
        ctx.globalAlpha = (0.85 - Math.abs(i) * 0.2) * fade
        ctx.beginPath()
        ctx.arc(cx, drawY, size * (0.32 + u * 0.12), a0, a1)
        ctx.stroke()
      }
      ctx.globalAlpha = 0.55 * fade * pulse
      ctx.fillStyle = 'rgba(187,247,208,0.5)'
      ctx.beginPath()
      ctx.arc(cx + Math.cos(sweep + 0.4) * size * 0.38, drawY + Math.sin(sweep + 0.4) * size * 0.38, 4 + u * 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  },

  /** 按状态取分镜；出土按 emerge 进度选帧；死亡/受伤不循环 */
  _zombieFrame(z, animKey) {
    const def = ANIM_DEFS[animKey] || ANIM_DEFS.walk
    const imgs = (this._animImgs && this._animImgs[animKey]) || []
    const n = imgs.length || def.paths.length
    if (!n) return null
    let fi
    if (animKey === 'emerge') {
      fi = Math.min(n - 1, Math.floor((z.emerge || 0) * n))
    } else if (animKey === 'dead' || animKey === 'hurt' || animKey === 'attack') {
      fi = Math.min(n - 1, Math.floor(z.frameT * def.fps))
    } else {
      fi = Math.floor(z.frameT * def.fps) % n
    }
    return imgs[fi] || imgs[0] || null
  },

  _draw() {
    const ctx = this._ctx
    const w = this._w
    const h = this._h
    if (!ctx) return
    const realm = realmByLv(this._realmLv)

    if (this._grassImg) {
      // 全屏 2D 草原山景背景（远程图，拉伸铺满画布）
      ctx.drawImage(this._grassImg, 0, 0, w, h)
    } else {
      ctx.fillStyle = '#5a9e4a'
      ctx.fillRect(0, 0, w, h)
    }

    // 凡人打坐：风雨雷电 / 破晓天气层
    if (this._isMortalCultivate()) this._drawMortalWeather(ctx)

    // 新背景已含山石小路，不再叠画程序风景，避免挡画面

    // 黑液毒潭（在角色之下）
    this._drawGooPools(ctx)

    // 遁光尾巴：头亮粗，尾细虚
    for (let i = 0; i < this._trails.length; i++) {
      const t = this._trails[i]
      const ratio = Math.max(0, Math.min(1, t.life / (t.maxLife || 0.5)))
      const ghost = t.ghost == null ? (1 - ratio) : t.ghost
      const a = Math.max(0, ratio * (0.95 - ghost * 0.55))
      ctx.globalAlpha = a
      ctx.fillStyle = t.color
      const rr = Math.max(0.6, t.r * (0.35 + ratio * 0.65))
      ctx.beginPath()
      ctx.arc(t.x, t.y, rr, 0, Math.PI * 2)
      ctx.fill()
      if (t.comet && ratio > 0.55) {
        ctx.globalAlpha = a * 0.35
        ctx.beginPath()
        ctx.arc(t.x, t.y, rr * 1.7, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1

    // 顺移裂空环
    if (this._blinkFx) {
      const bf = this._blinkFx
      const u = Math.min(1, bf.t / bf.dur)
      const fade = 1 - u
      ctx.save()
      ctx.strokeStyle = bf.color
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.75 * fade
      ctx.beginPath()
      ctx.arc(bf.fx, bf.fy, 10 + u * 28, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(bf.tx, bf.ty, 28 - u * 18, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    // 撕裂虚空之缝（人物下层）
    if (this._voidBlink) this._drawVoidTear(ctx, this._voidBlink)

    for (let i = 0; i < this._pickups.length; i++) this._drawLoot(ctx, this._pickups[i])
    for (let i = 0; i < this._swords.length; i++) this._drawFlyingSword(ctx, this._swords[i])
    this._drawRealmShots(ctx)
    this._drawFireballs(ctx)
    this._drawInsectFx(ctx)

    for (let zi = 0; zi < this._zombies.length; zi++) {
      const z = this._zombies[zi]
      const attacking = z.state === 'attack' || z.state === 'skill' || (z.dashT || 0) > 0
      const walking = z.state === 'walk' || ((z.dashT || 0) > 0)
      // 走动用连续迈步帧；攻击用攻姿；其余用立绘；缺图回退通用分镜
      let img = null
      if (!z.handOnly && z.typeKey) {
        if (attacking && !(z.dashT > 0) && this._mobAtkImgs && this._mobAtkImgs[z.typeKey]) {
          img = this._mobAtkImgs[z.typeKey]
        } else if (walking) {
          img = this._mobWalkFrame(z)
        } else if (this._mobImgs && this._mobImgs[z.typeKey]) {
          img = this._mobImgs[z.typeKey]
        }
      }
      if (!img) {
        const animKey = attacking && !(z.dashT > 0) ? 'attack' : (walking ? 'walk' : (z.state || 'walk'))
        img = this._zombieFrame(z, animKey === 'skill' ? 'attack' : animKey)
      }
      if (!img && z.isBoss) img = this._bossWalkImg
      const emerge = Math.max(0.05, Math.min(1, z.emerge == null ? 1 : z.emerge))
      let size = z.r * 2.7 * (0.4 + 0.6 * emerge)
      if (z.isBoss) size = z.r * (3.05 + emerge * 0.4)
      if (!z.isBoss && z.state === 'emerge') size = z.r * (2.6 + emerge * 0.5)
      if (z.gengScale != null) size *= z.gengScale
      // 程序化人形 / 心魔：略缩小并限高，避免高境界体型撑出屏幕
      if (z.proceduralBody || z.isShadowSelf) {
        size *= z.isShadowSelf ? 0.8 : 0.78
        size = Math.min(size, (this._h || 500) * 0.26)
      }
      // 走动起伏与迈步帧同步，避免滑行感
      const walkPhase = (z.frameT || 0) * Math.max(5, 5.5 + (z.speedMul || 1) * 3.5) * Math.PI
      if (walking) {
        size *= 1 + Math.sin(walkPhase) * 0.045
      }
      if (attacking && !(z.dashT > 0)) size *= 1.1 + Math.sin((z.frameT || 0) * 18) * 0.04
      if (z.state === 'hurt') size *= 1.06
      if (z.state === 'dead') size *= 1 - Math.min(0.25, z.frameT * 0.2)
      if (z.flash > 0) z.flash -= 0.016
      const lunge = (attacking && !(z.dashT > 0)) ? Math.sin(Math.min(1, (z.frameT || 0) * 6) * Math.PI) * 6 : 0
      const face = z.facing || 0
      const bob = walking ? Math.abs(Math.sin(walkPhase)) * (2.2 + (z.speedMul || 1)) : 0
      const drawX = z.x + Math.cos(face) * lunge
      const drawY = z.y - (z.floatY || 0) - bob + (z.state === 'emerge' ? 6 : (1 - emerge) * 14)
      const faceLeft = Math.cos(face) < 0
      ctx.save()
      ctx.globalAlpha = z.state === 'dead'
        ? Math.max(0.2, 1 - z.frameT * 0.7)
        : (z.state === 'emerge' ? 1 : (0.4 + 0.6 * emerge)) * (z.alphaMul == null ? 1 : z.alphaMul)
      if ((z.iceT || 0) > 0) ctx.globalAlpha *= 0.9
      const flashOnly = z.flash > 0 ? 'rgba(255,255,255,0.4)' : null
      if (z.isShadowSelf) {
        this._drawShadowSelfGuardian(ctx, z, drawX, drawY, size, faceLeft, flashOnly)
      } else if (z.proceduralBody && z.gDraw) {
        this._drawProceduralCreature(ctx, z, drawX, drawY, size, faceLeft, flashOnly)
      } else {
        this._drawSprite(ctx, img, drawX, drawY, size, flashOnly, null, faceLeft)
        if (z.isRealmGuardian && z.gDraw) this._drawGuardianStyle(ctx, z, drawX, drawY, size, faceLeft)
      }
      ctx.restore()
      if (z.typeName && emerge > 0.55 && z.state !== 'dead' && (z.proceduralBody || !z.isBoss)) {
        ctx.save()
        ctx.globalAlpha = 0.9
        ctx.fillStyle = '#f8fafc'
        ctx.font = z.isBoss ? 'bold 12px "KaiTi", "STKaiti", serif' : 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(z.typeName, drawX, drawY - size * 0.48)
        ctx.restore()
      }
      if (attacking || z.atkFx) this._drawMonsterAttackFx(ctx, z, drawY, size, drawX)
      if ((z.isRealmGuardian || z.isDemon || z.isShadowSelf) && z.state !== 'dead' && emerge > 0.4) {
        if (z.isDemon || z.isShadowSelf) this._drawDemonAura(ctx, z, drawX, drawY, size)
        else this._drawGuardianAura(ctx, z, drawX, drawY, size)
      }
      this._drawZombieElementFx(ctx, z, drawY)

      const hideBar = z.state === 'emerge' || (this._gengFx && (
        this._gengFx.phase === 'suck' || this._gengFx.phase === 'zap' || this._gengFx.phase === 'end' ||
        this._gengFx.phase === 'pierce' || this._gengFx.phase === 'plant' || this._gengFx.phase === 'recall' ||
        this._gengFx.phase === 'pull' || this._gengFx.phase === 'point' || this._gengFx.phase === 'vanish'
      ))
      if (emerge > 0.5 && z.state !== 'dead' && !hideBar) {
        if (z.isBoss) {
          this._drawBossHpBars(ctx, z, drawY, size)
        } else {
          const bw = z.r * 2.2 * (z.gengScale != null ? z.gengScale : 1)
          const ratio = Math.max(0, z.hp / z.maxHp)
          ctx.fillStyle = '#1f2937'
          ctx.fillRect(drawX - bw / 2, drawY - z.r - 16, bw, 4)
          ctx.fillStyle = ratio > 0.4 ? (z.tint || '#4ade80') : '#f87171'
          ctx.fillRect(drawX - bw / 2, drawY - z.r - 16, bw * ratio, 4)
        }
      }

      // 不再画锁定黄圈：每境一只境主时会常驻，看起来像怪物外框
    }

    this._drawGooShots(ctx)
    this._drawDemonCrescents(ctx)
    this._drawEnemySwords(ctx)
    this._drawGroundSwords(ctx)

    // 元婴剑侍（画在主角下层，技能帧带剑气）
    this._drawHelper(ctx)

    const heroImg = this._isMortalCultivate()
      ? this._mortalMeditateFrame()
      : this._playerImg
    // 升级演出中隐藏本体；环剑先画在正后方，再画人物盖住
    const upgrading = !!(this._spiritFx || this._breakFx)
    const mortal = this._isMortalCultivate()
    const voidHidden = !!(this._voidBlink && (this._voidBlink.hidden || (this._voidBlink.t > 0.5 && this._voidBlink.t < 1.12)))
    if (!this._gengFx && !upgrading && !mortal && !voidHidden) {
      if (!this._perfect && realmUsesSwords(realm.lv)) this._drawOrbitSwords(ctx, realm)
      if (realmUsesSwords(realm.lv)) this._drawRideSword(ctx, realm)
    }
    if (!upgrading) {
      if (mortal) this._drawMortalQiAura(ctx)
      else if (this._meditating) this._drawMeditateAura(ctx)
      this._drawQingyuanShield(ctx)
      const pose = this._voidBlinkDrawPose()
      if (!(pose.hide || (pose.alpha != null && pose.alpha < 0.04))) {
        const hurtFlash = this._playerHurtT > 0 ? 'rgba(255,255,255,0.4)' : null
        // 凡人：单帧定姿 + 极缓呼吸缩放（非分镜轮播）
        let size = mortal ? (96 + Math.sin((this._animT || 0) * 1.15) * 2.2) : 76
        if (this._gengFx && this._gengFx.style === 'avatar' && this._gengFx.scale) {
          size *= this._gengFx.scale
        }
        const hide = (this._playerHideT || 0) > 0
        ctx.save()
        let alpha = 1
        if (hide) alpha = 0.32 + Math.sin((this._animT || 0) * 8) * 0.08
        if (pose.alpha != null) alpha *= pose.alpha
        ctx.globalAlpha = alpha
        // 扔符时人物略前倾并抬手
        const throwPose = this._fuThrow && this._fuThrow.t < (this._fuThrow.wind || 0.28)
        let drawX = pose.x != null ? pose.x : this._playerX
        let drawY = (pose.y != null ? pose.y : this._playerY) - (mortal ? 10 : 8) - (throwPose ? 4 : 0)
        if (pose.suckU != null && pose.suckU > 0) {
          drawX = drawX + (pose.suckX - drawX) * pose.suckU * 0.85
          drawY = drawY + (pose.suckY - drawY) * pose.suckU * 0.85
        }
        this._drawSprite(ctx, heroImg, drawX + (throwPose ? 3 : 0), drawY, size * (throwPose ? 1.04 : 1) * (pose.suckU ? 1 - pose.suckU * 0.35 : 1), hurtFlash, null)
        if (throwPose) this._drawThrowFuHand(ctx)
        ctx.restore()
        if (!this._perfectFx && !this._voidBlink) this._drawRealmBadge(ctx, realm)
      }
    }
    this._drawFuThrow(ctx)

    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i]
      ctx.globalAlpha = Math.max(0, p.life * 3)
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
      ctx.globalAlpha = 1
    }

    this._drawPlayerHpBar(ctx, realm)
    this._drawExpAndDanBars(ctx, realm)
    this._drawFuHud(ctx)
    this._drawCtrlButtons(ctx)
    if (this._gengFx) this._drawGengFormation(ctx)

    if (this._spiritFx) this._drawSpiritDomain(ctx, this._spiritFx)
    if (this._qiVortexFx) this._drawQiVortex(ctx, this._qiVortexFx)
    if (this._breakFx) this._drawBreakthrough(ctx, this._breakFx)
    if (this._perfectFx || this._perfect) this._drawPerfect(ctx)

    if (this._over) {
      this._drawInkEpitaph(ctx)
    }
  },

  /** 僵尸身上的电缠/燃火/冰冻/风困 */
  /** 劫尸多段血条：当前段进度 + 剩余段数 */
  _drawBossHpBars(ctx, z, drawY, size) {
    const bars = Math.max(1, z.hpBars || bossHpBars(this._realmLv))
    const per = z.hpPerBar || (z.maxHp / bars)
    const hp = Math.max(0, z.hp || 0)
    let remainBars = Math.ceil(hp / per)
    if (hp <= 0) remainBars = 0
    let curRatio = 0
    if (hp > 0) {
      const mod = hp % per
      curRatio = mod === 0 ? 1 : mod / per
    }
    const barIdx = Math.max(0, remainBars - 1)
    const color = BOSS_BAR_COLORS[barIdx % BOSS_BAR_COLORS.length]
    const bw = Math.max(72, size * 0.72)
    const bh = 7
    const x = z.x - bw / 2
    const y = drawY - size * 0.48
    ctx.save()
    // 底板
    ctx.fillStyle = 'rgba(15,23,42,0.85)'
    ctx.fillRect(x - 1, y - 1, bw + 2, bh + 2)
    // 下层提示：还有下一段时画暗色底条
    if (remainBars > 1) {
      const under = BOSS_BAR_COLORS[(barIdx - 1 + BOSS_BAR_COLORS.length) % BOSS_BAR_COLORS.length]
      ctx.globalAlpha = 0.55
      ctx.fillStyle = under
      ctx.fillRect(x, y, bw, bh)
      ctx.globalAlpha = 1
    } else {
      ctx.fillStyle = '#1f2937'
      ctx.fillRect(x, y, bw, bh)
    }
    ctx.fillStyle = color
    ctx.fillRect(x, y, bw * curRatio, bh)
    // 段数菱形标记
    const markN = Math.min(bars, 8)
    const gap = bw / (markN + 1)
    for (let i = 1; i <= markN; i++) {
      ctx.fillStyle = i <= remainBars ? '#fef3c7' : 'rgba(148,163,184,0.45)'
      ctx.beginPath()
      ctx.arc(x + gap * i, y - 5, i === remainBars ? 2.4 : 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#fef3c7'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText((z.typeName || '劫怪') + ' · ' + remainBars + '/' + bars, z.x, y - 8)
    ctx.restore()
  },

  /** 劫尸喷黑液时身周墨气（圆形，避免方框） */
  _drawBossSkillAura(ctx, z, drawY, size) {
    const t = this._animT || 0
    const pulse = 0.35 + Math.sin(t * 10) * 0.12
    ctx.save()
    const g = ctx.createRadialGradient(z.x, drawY, size * 0.08, z.x, drawY, size * 0.48)
    g.addColorStop(0, 'rgba(15,23,42,0.55)')
    g.addColorStop(0.55, 'rgba(30,41,59,0.25)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = pulse
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(z.x, drawY, size * 0.48, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(51,65,85,0.8)'
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.5 + Math.sin(t * 8) * 0.2
    ctx.beginPath()
    ctx.arc(z.x, drawY, size * 0.36 + Math.sin(t * 6) * 3, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  },

  _drawZombieElementFx(ctx, z, drawY) {
    if (z.state === 'dead') return
    const t = this._animT || 0
    ctx.save()
    if ((z.elecT || 0) > 0) {
      ctx.strokeStyle = '#67e8f9'
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.75
      for (let i = 0; i < 3; i++) {
        const a = t * 8 + i * 2.1
        ctx.beginPath()
        ctx.arc(z.x + Math.cos(a) * (z.r + 4), drawY + Math.sin(a * 1.3) * (z.r * 0.6), 3, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.moveTo(z.x - 8, drawY - z.r)
      ctx.lineTo(z.x + 2, drawY)
      ctx.lineTo(z.x - 4, drawY + 6)
      ctx.stroke()
    }
    if ((z.fireT || 0) > 0) {
      ctx.globalAlpha = 0.7
      for (let i = 0; i < 4; i++) {
        const fx = z.x - 8 + i * 5
        const fy = drawY - z.r * 0.2 - Math.abs(Math.sin(t * 10 + i)) * 10
        ctx.fillStyle = i % 2 ? '#fb923c' : '#fde047'
        ctx.beginPath()
        ctx.moveTo(fx, drawY + 4)
        ctx.lineTo(fx - 3, fy)
        ctx.lineTo(fx + 3, fy)
        ctx.closePath()
        ctx.fill()
      }
    }
    if ((z.iceT || 0) > 0) {
      const rr = (z.isBoss ? z.r * 1.35 : z.r * 0.95)
      ctx.globalAlpha = 0.4
      ctx.fillStyle = 'rgba(147,197,253,0.5)'
      ctx.beginPath()
      ctx.arc(z.x, drawY, rr, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#e0f2fe'
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.arc(z.x, drawY, rr, 0, Math.PI * 2)
      ctx.stroke()
    }
    if ((z.windT || 0) > 0) {
      const cx = z.windCx || z.x
      const cy = z.windCy || z.y
      const wr = z.windR || 36
      ctx.globalAlpha = 0.5
      ctx.strokeStyle = '#86efac'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(cx, cy, wr + 8, wr * 0.55 + 6, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(cx, cy, wr * 0.65, wr * 0.35, t, 0, Math.PI * 1.6)
      ctx.stroke()
    }
    ctx.restore()
  },

  /** 附魔剩余时间 */
  /** 持符 / 扔符提示 */
  _drawFuHud(ctx) {
    const fu = this._heldFu
    const throwFx = this._fuThrow
    if (!fu && !throwFx && !(this._playerHideT > 0) && !this._meditating) return
    ctx.save()
    ctx.fillStyle = 'rgba(15,23,42,0.55)'
    ctx.fillRect(12, 138, 132, 24)
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'left'
    if (throwFx) {
      ctx.fillStyle = throwFx.color || '#e2e8f0'
      ctx.fillText('施放 ' + (throwFx.label || '符'), 18, 154)
    } else if (fu) {
      ctx.fillStyle = fu.color || '#e2e8f0'
      ctx.fillText(fu.label + ' · 点按扔出', 18, 154)
    } else if (this._playerHideT > 0) {
      ctx.fillStyle = '#c4b5fd'
      ctx.fillText('隐身 ' + Math.ceil(this._playerHideT) + 's', 18, 154)
    } else if (this._meditating) {
      ctx.fillStyle = '#67e8f9'
      ctx.fillText('打坐回灵…', 18, 154)
    }
    ctx.restore()
  },

  _drawMeditateAura(ctx) {
    const px = this._playerX
    const py = this._playerY
    const t = this._animT || 0
    ctx.save()
    ctx.globalAlpha = 0.35 + Math.sin(t * 4) * 0.1
    ctx.strokeStyle = '#67e8f9'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(px, py + 18, 28 + Math.sin(t * 3) * 3, 10, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  },

  _drawThrowFuHand(ctx) {
    const fx = this._fuThrow
    if (!fx) return
    const u = Math.min(1, fx.t / Math.max(0.01, fx.wind))
    const ang = -0.9 + u * 1.6
    const px = this._playerX + Math.cos(ang) * (18 + u * 10)
    const py = this._playerY - 20 + Math.sin(ang) * 8
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(ang + Math.PI * 0.5)
    this._paintFuScroll(ctx, fx.color, fx.mark || '符', 0.85)
    ctx.restore()
  },

  _drawFuThrow(ctx) {
    const fx = this._fuThrow
    if (!fx || fx.t < fx.wind) return
    const flyT = fx.t - fx.wind
    const u = Math.min(1, flyT / Math.max(0.01, fx.fly))
    const x = fx.sx + (fx.tx - fx.sx) * u
    const y = fx.sy + (fx.ty - fx.sy) * u - Math.sin(u * Math.PI) * 28
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(u * 4.5)
    this._paintFuScroll(ctx, fx.color, fx.mark || '符', 0.95)
    ctx.restore()
  },

  /** 出土剑绘制：暂时关闭（勿再写完整实现，后写会覆盖前面空函数） */
  _drawGroundSwords() {},

  /** 山峰 / 河流 / 湖泊 */
  _drawScenery(ctx) {
    const sc = this._scenery
    if (!sc) return
    // 山
    for (let i = 0; i < sc.mountains.length; i++) {
      const m = sc.mountains[i]
      ctx.beginPath()
      ctx.moveTo(m.x, m.baseY)
      for (let j = 0; j < m.peaks.length; j++) {
        ctx.lineTo(m.x + m.peaks[j][0], m.baseY - m.peaks[j][1])
      }
      ctx.lineTo(m.x + m.peaks[m.peaks.length - 1][0], m.baseY)
      ctx.closePath()
      ctx.fillStyle = i % 2 === 0 ? 'rgba(90, 120, 90, 0.55)' : 'rgba(70, 105, 80, 0.5)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(40, 60, 45, 0.35)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // 雪顶
      ctx.beginPath()
      const top = m.peaks.reduce((a, b) => (b[1] > a[1] ? b : a), m.peaks[0])
      ctx.moveTo(m.x + top[0] - 10, m.baseY - top[1] + 18)
      ctx.lineTo(m.x + top[0], m.baseY - top[1])
      ctx.lineTo(m.x + top[0] + 12, m.baseY - top[1] + 16)
      ctx.closePath()
      ctx.fillStyle = 'rgba(248, 250, 252, 0.75)'
      ctx.fill()
    }
    // 河
    if (sc.river && sc.river.length > 1) {
      ctx.beginPath()
      ctx.moveTo(sc.river[0].x, sc.river[0].y)
      for (let i = 1; i < sc.river.length; i++) ctx.lineTo(sc.river[i].x, sc.river[i].y)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)'
      ctx.lineWidth = 14
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.7)'
      ctx.lineWidth = 7
      ctx.stroke()
    }
    // 湖
    for (let i = 0; i < sc.lakes.length; i++) {
      const L = sc.lakes[i]
      ctx.beginPath()
      ctx.ellipse(L.x, L.y, L.rx, L.ry, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(14, 165, 233, 0.45)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.65)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(L.x - L.rx * 0.2, L.y - L.ry * 0.25, L.rx * 0.35, L.ry * 0.22, -0.3, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.fill()
    }
  },

  /** 御剑飞行：脚下只保留境界遁光光线，不再画剑体 */
  _drawRideSword(ctx, realm) {
    const color = realm.color
    const t = this._animT || 0
    const lv = Math.max(1, realm.lv || 1)
    const px = this._playerX
    const py = this._playerY + 18
    const beamN = 2 + Math.min(5, Math.floor(lv / 2))
    const len = 22 + lv * 2.2
    ctx.save()
    // 足底光盘
    const g = ctx.createRadialGradient(px, py, 2, px, py, 16 + lv * 1.2)
    g.addColorStop(0, color)
    g.addColorStop(0.45, realm.glow || 'rgba(255,255,255,0.35)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = 0.55 + Math.min(0.35, lv * 0.02)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(px, py, 18 + lv * 0.8, 7 + lv * 0.25, 0, 0, Math.PI * 2)
    ctx.fill()
    // 向后发散的遁光光线（随境界加多加长）
    for (let i = 0; i < beamN; i++) {
      const wobble = Math.sin(t * (3.2 + i * 0.4) + i) * 0.12
      const ang = Math.PI * 0.5 + (i - (beamN - 1) / 2) * 0.18 + wobble
      const pulse = 0.45 + 0.35 * Math.sin(t * 5 + i * 1.1)
      const x2 = px + Math.cos(ang) * len
      const y2 = py + Math.sin(ang) * (len * 0.55)
      ctx.globalAlpha = pulse * (0.35 + Math.min(0.4, lv * 0.03))
      ctx.strokeStyle = color
      ctx.lineWidth = 1.4 + Math.min(2.2, lv * 0.12)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
    ctx.restore()
  },

  /** 雷罚预警与落雷 */
  _drawLightning(ctx) {
    for (let i = 0; i < this._bolts.length; i++) {
      const b = this._bolts[i]
      if (b.phase === 'warn') {
        const pulse = 0.35 + Math.sin(b.t * 12) * 0.2
        ctx.globalAlpha = pulse
        ctx.strokeStyle = '#fde047'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = 'rgba(253, 224, 71, 0.15)'
        ctx.fill()
      } else {
        ctx.globalAlpha = Math.max(0, 1 - b.t * 2)
        ctx.strokeStyle = '#e0f2fe'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(b.x - 6, b.y - 90)
        ctx.lineTo(b.x + 4, b.y - 40)
        ctx.lineTo(b.x - 8, b.y - 40)
        ctx.lineTo(b.x + 6, b.y)
        ctx.stroke()
        ctx.fillStyle = 'rgba(224, 242, 254, 0.5)'
        ctx.beginPath()
        ctx.arc(b.x, b.y, 16, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
  },

  /** 凡人打坐：单帧定姿（一个动作），仅极缓呼吸感由绘制缩放体现 */
  _mortalMeditateFrame() {
    const imgs = this._mortalMeditateImgs || []
    if (!imgs.length) return this._playerImg
    return imgs[0] || this._playerImg
  },

  /** 凡人打坐天气层：风暴天图 + 风线/雨丝/雷电/破晓 */
  _drawMortalWeather(ctx) {
    const w = this._w
    const h = this._h
    const ratio = Math.min(1, (this._qiAbsorb || 0) / MORTAL_QI_NEED)
    const mw = this._mortalWeather || { rain: [], wind: [], flash: 0, bolt: null }
    ctx.save()

    // 天空图：前中期风暴，后期渐入破晓
    const skyH = h * 0.58
    const storm = this._weatherStormImg
    const dawn = this._weatherDawnImg
    if (storm) {
      ctx.globalAlpha = 0.35 + Math.min(0.45, ratio * 0.55)
      ctx.drawImage(storm, 0, 0, w, skyH)
    } else {
      ctx.globalAlpha = 0.25 + ratio * 0.35
      const g = ctx.createLinearGradient(0, 0, 0, skyH)
      g.addColorStop(0, '#0f172a')
      g.addColorStop(0.55, '#1e293b')
      g.addColorStop(1, 'rgba(30,41,59,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, skyH)
    }
    if (dawn && ratio > 0.78) {
      ctx.globalAlpha = Math.min(0.75, (ratio - 0.78) / 0.22 * 0.75)
      ctx.drawImage(dawn, 0, 0, w, skyH)
    }

    // 暗色罩（雷暴前更深）
    ctx.globalAlpha = 0.12 + Math.min(0.28, ratio * 0.32) - (ratio > 0.88 ? (ratio - 0.88) * 1.2 : 0)
    ctx.fillStyle = '#020617'
    ctx.fillRect(0, 0, w, h)

    // 风
    ctx.globalAlpha = 0.18 + ratio * 0.22
    ctx.strokeStyle = 'rgba(226,232,240,0.55)'
    ctx.lineWidth = 1.2
    for (let i = 0; i < (mw.wind || []).length; i++) {
      const p = mw.wind[i]
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x + p.len, p.y + 2)
      ctx.stroke()
    }

    // 雨
    if (ratio >= 0.35) {
      ctx.globalAlpha = 0.35 + ratio * 0.35
      ctx.strokeStyle = 'rgba(186,230,253,0.7)'
      ctx.lineWidth = 1
      for (let i = 0; i < (mw.rain || []).length; i++) {
        const r = mw.rain[i]
        ctx.beginPath()
        ctx.moveTo(r.x, r.y)
        ctx.lineTo(r.x + 3, r.y + r.len)
        ctx.stroke()
      }
    }

    // 闪电
    if (mw.bolt && mw.bolt.segs && mw.bolt.segs.length) {
      const segs = mw.bolt.segs
      ctx.globalAlpha = Math.max(0.2, mw.bolt.life / 0.28)
      ctx.strokeStyle = '#e0f2fe'
      ctx.lineWidth = 2.5
      ctx.shadowColor = '#67e8f9'
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.moveTo(segs[0].x, segs[0].y)
      for (let i = 1; i < segs.length; i++) ctx.lineTo(segs[i].x, segs[i].y)
      ctx.stroke()
      ctx.strokeStyle = '#fef9c3'
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    // 闪白
    if ((mw.flash || 0) > 0) {
      ctx.globalAlpha = Math.min(0.55, mw.flash * 3.5)
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(0, 0, w, h)
    }

    // 破晓金光
    if (ratio > 0.85) {
      const u = (ratio - 0.85) / 0.15
      ctx.globalAlpha = 0.15 + u * 0.35
      const gg = ctx.createRadialGradient(w * 0.5, h * 0.12, 8, w * 0.5, h * 0.2, w * 0.55)
      gg.addColorStop(0, 'rgba(254,243,199,0.9)')
      gg.addColorStop(0.4, 'rgba(251,191,36,0.35)')
      gg.addColorStop(1, 'rgba(251,191,36,0)')
      ctx.fillStyle = gg
      ctx.fillRect(0, 0, w, h * 0.55)
    }
    ctx.restore()
  },

  /** 天地灵气入体：丹田漩涡 + 环绕光带 */
  _drawMortalQiAura(ctx) {
    const px = this._playerX
    const py = this._playerY - 8
    const t = this._animT || 0
    const ratio = Math.min(1, (this._qiAbsorb || 0) / MORTAL_QI_NEED)
    ctx.save()
    // 地面灵纹
    ctx.globalAlpha = 0.35 + ratio * 0.35
    ctx.strokeStyle = '#67e8f9'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.ellipse(px, py + 28, 36 + ratio * 16, 12 + ratio * 4, 0, 0, Math.PI * 2)
    ctx.stroke()
    // 环绕光带
    for (let i = 0; i < 3; i++) {
      const a = t * (1.6 + i * 0.35) + i * 2.1
      const rr = 22 + i * 10 + Math.sin(t * 3 + i) * 3
      ctx.globalAlpha = 0.25 + ratio * 0.35
      ctx.strokeStyle = i % 2 ? '#a5f3fc' : '#22d3ee'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(px, py + 4, rr, rr * 0.45, a * 0.2, a, a + Math.PI * 1.2)
      ctx.stroke()
    }
    // 丹田漩涡
    const g = ctx.createRadialGradient(px, py + 8, 2, px, py + 8, 18 + ratio * 10)
    g.addColorStop(0, 'rgba(224,242,254,0.95)')
    g.addColorStop(0.45, 'rgba(34,211,238,0.55)')
    g.addColorStop(1, 'rgba(34,211,238,0)')
    ctx.globalAlpha = 0.7 + ratio * 0.3
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(px, py + 8, 18 + ratio * 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  },

  /** 右上角色血条 + 灵气条 */
  _drawPlayerHpBar(ctx, realm) {
    if (this._isMortalCultivate()) return
    const w = this._w
    const barW = Math.min(140, w * 0.38)
    const thick = 8 + Math.min(10, realm.lv * 0.7)
    const x = w - barW - 12
    const y = 48
    const ratio = Math.max(0, Math.min(1, this._hp / (this._maxHp || 1)))
    const qiRatio = Math.max(0, Math.min(1, (this._lingQi || 0) / (this._maxLingQi || 1)))
    ctx.save()
    const panelH = canSpaceBlink(realm.lv) ? thick + 56 : thick + 40
    ctx.fillStyle = 'rgba(15,23,42,0.55)'
    ctx.fillRect(x - 4, y - 14, barW + 8, panelH)
    ctx.fillStyle = '#e2e8f0'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('气血', x, y - 2)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(x, y + 2, barW, thick)
    ctx.fillStyle = realm.color
    ctx.fillRect(x, y + 2, barW * ratio, thick)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.strokeRect(x, y + 2, barW, thick)
    ctx.fillStyle = '#f8fafc'
    ctx.font = '10px sans-serif'
    ctx.fillText(Math.ceil(this._hp) + '/' + this._maxHp, x + 4, y + thick)

    const qy = y + thick + 14
    ctx.fillStyle = '#e2e8f0'
    ctx.font = '11px sans-serif'
    ctx.fillText('灵气', x, qy - 2)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(x, qy + 2, barW, thick - 1)
    ctx.fillStyle = this._meditating ? '#22d3ee' : '#38bdf8'
    ctx.fillRect(x, qy + 2, barW * qiRatio, thick - 1)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.strokeRect(x, qy + 2, barW, thick - 1)
    ctx.fillStyle = '#f8fafc'
    ctx.font = '10px sans-serif'
    ctx.fillText(Math.floor(this._lingQi || 0) + '/' + (this._maxLingQi || 0), x + 4, qy + thick - 1)

    if (canSpaceBlink(realm.lv)) {
      const sy = qy + thick + 14
      const spRatio = Math.max(0, Math.min(1, (this._spaceForce || 0) / SPACE_FORCE_MAX))
      const full = spRatio >= 0.995
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '11px sans-serif'
      ctx.fillText(full ? '空间 · 可撕裂虚空' : '空间之力', x, sy - 2)
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(x, sy + 2, barW, thick - 1)
      ctx.fillStyle = full ? '#22d3ee' : '#67e8f9'
      ctx.fillRect(x, sy + 2, barW * spRatio, thick - 1)
      ctx.strokeStyle = full ? 'rgba(34,211,238,0.8)' : 'rgba(255,255,255,0.35)'
      ctx.strokeRect(x, sy + 2, barW, thick - 1)
      ctx.fillStyle = '#f8fafc'
      ctx.font = '10px sans-serif'
      ctx.fillText(Math.floor(this._spaceForce || 0) + '/' + SPACE_FORCE_MAX, x + 4, sy + thick - 1)
    }
    ctx.restore()
  },

  /** 经验条 + 战意条；凡人阶段显示灵气入体进度 */
  _drawExpAndDanBars(ctx, realm) {
    const w = this._w
    const barW = Math.min(148, w * 0.4)
    const x = 12
    const y = 86
    ctx.save()
    if (this._isMortalCultivate()) {
      const qi = this._qiAbsorb || 0
      const ratio = Math.min(1, qi / MORTAL_QI_NEED)
      const quote = MORTAL_MEDITATE_QUOTE
      const panelW = Math.min(w - 20, Math.max(barW + 24, 220))
      ctx.fillStyle = 'rgba(15,23,42,0.6)'
      ctx.fillRect(x - 2, y - 14, panelW, 58)
      ctx.fillStyle = '#a5f3fc'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('凡人修仙 · 灵气入体', x, y)
      // 旁白紧挨「凡人修仙」标题右侧（窄屏折到下一行）
      ctx.fillStyle = '#fde68a'
      ctx.font = '9px "KaiTi", "STKaiti", serif'
      if (w >= 380) {
        ctx.fillText(quote, x + 118, y)
      } else {
        ctx.fillText(quote, x, y + 28)
      }
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(x, y + 6, barW, 9)
      ctx.fillStyle = '#22d3ee'
      ctx.fillRect(x, y + 6, barW * ratio, 9)
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.strokeRect(x, y + 6, barW, 9)
      ctx.fillStyle = '#f8fafc'
      ctx.font = '9px sans-serif'
      ctx.fillText(Math.floor(qi) + '/' + MORTAL_QI_NEED, x + 2, y + 14)
      ctx.restore()
      return
    }
    const exp = realmExpProgress(this._kills || 0, this._realmLv || 1, this._stageKills || 0)
    const dan = Math.floor(this._corpseDan || 0)
    const danNeed = WAR_INTENT_NEED
    ctx.fillStyle = 'rgba(15,23,42,0.55)'
    ctx.fillRect(x - 2, y - 12, barW + 8, 48)

    ctx.fillStyle = '#e2e8f0'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'left'
    let expLabel = exp.maxed ? '经验 大圆满' : ('经验 →' + exp.nextName)
    const combat = getRealmCombat(this._realmLv)
    const guardianMode = isGuardianCombatRealm(this._realmLv)
    if (guardianMode && combat) {
      expLabel = this._bossActive
        ? ('击败' + (combat.guardianName || '境主') + '破境')
        : ((combat.guardianName || '境主') + '将至 →' + exp.nextName)
    } else if (exp.awaitMinor) {
      expLabel = '灵气将满 · 漩涡入丹 →' + exp.nextName
    }
    ctx.fillText(expLabel, x, y)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(x, y + 4, barW, 7)
    const barRatio = guardianMode ? 1 : exp.ratio
    ctx.fillStyle = (guardianMode || exp.awaitBoss || this._bossActive || exp.awaitMinor) ? '#fbbf24' : '#38bdf8'
    ctx.fillRect(x, y + 4, barW * barRatio, 7)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.strokeRect(x, y + 4, barW, 7)
    ctx.fillStyle = '#f8fafc'
    ctx.font = '9px sans-serif'
    ctx.fillText(
      guardianMode ? (combat.ultName || '境主战') : (exp.maxed ? 'MAX' : (exp.cur + '/' + exp.need)),
      x + 2,
      y + 10
    )

    ctx.fillStyle = '#e2e8f0'
    ctx.font = '10px sans-serif'
    ctx.fillText('勇气 ' + dan + '/' + danNeed, x, y + 26)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(x, y + 30, barW, 7)
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(x, y + 30, barW * Math.min(1, dan / danNeed), 7)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.strokeRect(x, y + 30, barW, 7)
    ctx.restore()
  },

  /** 大庚剑阵绘制 */
  /** 炼气大招绘制：残影 + 斩线 */
  _drawBlinkJianUlt(ctx, fx) {
    ctx.save()
    ctx.fillStyle = '#bbf7d0'
    ctx.font = 'bold 18px "KaiTi", "STKaiti", serif'
    ctx.textAlign = 'center'
    ctx.globalAlpha = 0.9
    ctx.fillText(fx.title || '眨眼剑法', this._w * 0.5, 72)
    const ghosts = fx.ghosts || []
    for (let i = 0; i < ghosts.length; i++) {
      const g = ghosts[i]
      ctx.globalAlpha = Math.max(0.15, g.life * 1.4)
      ctx.save()
      ctx.translate(g.x, g.y)
      ctx.rotate(g.a || 0)
      if (g.slash) {
        ctx.strokeStyle = '#f0fdf4'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(-6, 0)
        ctx.lineTo(36, 0)
        ctx.stroke()
      } else {
        ctx.fillStyle = 'rgba(134,239,172,0.55)'
        ctx.beginPath()
        ctx.ellipse(0, 0, 14, 22, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
    ctx.restore()
  },

  /** 筑基大招：五行阵环 + 剑芒 */
  _drawWuxingArrayUlt(ctx, fx) {
    const tx = fx.targetX
    const ty = fx.targetY
    const fade = fx.phase === 'end' ? Math.max(0, 1 - fx.t / fx.endDur) : 1
    ctx.save()
    ctx.globalAlpha = 0.92 * fade
    ctx.fillStyle = '#e0f2fe'
    ctx.font = 'bold 18px "KaiTi", "STKaiti", serif'
    ctx.textAlign = 'center'
    ctx.fillText(fx.title || '颠倒五行阵', tx, ty - fx.radius - 28)
    ctx.globalAlpha = 0.35 * fade
    ctx.strokeStyle = '#67e8f9'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(tx, ty, fx.radius, 0, Math.PI * 2)
    ctx.stroke()
    for (let i = 0; i < (fx.petals || []).length; i++) {
      const p = fx.petals[i]
      const x = tx + Math.cos(p.a) * fx.radius
      const y = ty + Math.sin(p.a) * fx.radius * 0.72
      ctx.globalAlpha = 0.75 * fade
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(x, y, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(x, y)
      ctx.strokeStyle = p.color
      ctx.globalAlpha = 0.35 * fade
      ctx.stroke()
      if (p.beamU > 0) {
        ctx.globalAlpha = 0.85 * p.beamU * fade
        ctx.strokeStyle = '#f8fafc'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(tx, ty)
        ctx.stroke()
      }
    }
    // 护盾环（人物）
    if ((this._qingyuanShield || 0) > 0) {
      ctx.globalAlpha = 0.35 + Math.sin((this._animT || 0) * 6) * 0.1
      ctx.strokeStyle = '#67e8f9'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(this._playerX, this._playerY - 8, 34, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
  },

  /** 结丹大招：剑影环绕 + 噬金虫 */
  _drawJianyingUlt(ctx, fx) {
    const fade = fx.phase === 'end' ? Math.max(0, 1 - fx.t / fx.endDur) : 1
    ctx.save()
    ctx.globalAlpha = 0.92 * fade
    ctx.fillStyle = '#fef3c7'
    ctx.font = 'bold 18px "KaiTi", "STKaiti", serif'
    ctx.textAlign = 'center'
    ctx.fillText(fx.title || '剑影分光', fx.targetX, fx.targetY - 70)
    for (let i = 0; i < (fx.shadows || []).length; i++) {
      const s = fx.shadows[i]
      ctx.save()
      ctx.translate(s.x, s.y)
      ctx.rotate(s.a + (this._animT || 0) * 2)
      ctx.globalAlpha = 0.7 * fade
      this._paintInkSword(ctx, '#fbbf24', 0.85)
      ctx.restore()
    }
    for (let i = 0; i < (fx.insects || []).length; i++) {
      const bug = fx.insects[i]
      ctx.globalAlpha = Math.max(0.2, bug.life * 2) * fade
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.arc(bug.x, bug.y, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  },

  _drawYuanciUlt(ctx, fx) {
    const fade = fx.phase === 'end' ? Math.max(0, 1 - fx.t / fx.endDur) : 1
    const t = this._animT || 0
    ctx.save()
    ctx.globalAlpha = 0.9 * fade
    ctx.fillStyle = '#a5f3fc'
    ctx.font = 'bold 18px "KaiTi", "STKaiti", serif'
    ctx.textAlign = 'center'
    ctx.fillText(fx.title || '元磁神光', fx.targetX, fx.targetY - 64)
    // 多层磁环 + 扭曲线
    for (let i = 0; i < 4; i++) {
      const r = 22 + i * 14 + Math.sin(t * 7 + i) * 4
      ctx.strokeStyle = i % 2 ? '#22d3ee' : '#67e8f9'
      ctx.lineWidth = 2.2 - i * 0.3
      ctx.globalAlpha = (0.55 - i * 0.08) * fade
      ctx.beginPath()
      ctx.ellipse(fx.targetX, fx.targetY, r, r * 0.55, t + i * 0.4, 0, Math.PI * 2)
      ctx.stroke()
    }
    // 神光束（渐变宽带）
    ctx.save()
    const dx = fx.targetX - this._playerX
    const dy = fx.targetY - (this._playerY - 8)
    const ang = Math.atan2(dy, dx)
    const len = Math.sqrt(dx * dx + dy * dy)
    ctx.translate(this._playerX, this._playerY - 8)
    ctx.rotate(ang)
    const g = ctx.createLinearGradient(0, 0, len, 0)
    g.addColorStop(0, 'rgba(103,232,249,0)')
    g.addColorStop(0.3, 'rgba(34,211,238,0.55)')
    g.addColorStop(1, 'rgba(165,243,252,0.85)')
    ctx.fillStyle = g
    ctx.globalAlpha = 0.7 * fade
    ctx.beginPath()
    ctx.moveTo(0, -3)
    ctx.lineTo(len, -10)
    ctx.lineTo(len, 10)
    ctx.lineTo(0, 3)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    ctx.restore()
  },

  _drawXuantianUlt(ctx, fx) {
    const fade = fx.phase === 'end' ? Math.max(0, 1 - fx.t / fx.endDur) : 1
    const midX = (fx.fromX + fx.targetX) * 0.5
    const midY = (fx.fromY + fx.targetY) * 0.5
    const dist = Math.max(40, Math.sqrt(
      (fx.targetX - fx.fromX) * (fx.targetX - fx.fromX) +
      (fx.targetY - fx.fromY) * (fx.targetY - fx.fromY)
    ))
    ctx.save()
    ctx.globalAlpha = 0.95 * fade
    ctx.fillStyle = '#e2e8f0'
    ctx.font = 'bold 18px "KaiTi", "STKaiti", serif'
    ctx.textAlign = 'center'
    ctx.fillText(fx.title || '玄天斩灵剑', this._w * 0.5, 72)

    // 蓄力：周身银丝螺旋
    for (let i = 0; i < (fx.threads || []).length; i++) {
      const th = fx.threads[i]
      ctx.globalAlpha = Math.max(0.15, th.life * 2.2) * fade
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.arc(th.x, th.y, th.r || 6, 0, Math.PI * 1.6)
      ctx.stroke()
    }

    if (fx.phase === 'slash' || fx.phase === 'after') {
      const arcs = fx.arcs || []
      for (let i = 0; i < arcs.length; i++) {
        const arc = arcs[i]
        const localT = fx.phase === 'slash' ? fx.t - arc.delay : 1
        if (localT < 0) continue
        const u = fx.phase === 'after' ? 1 : Math.min(1, localT / 0.28)
        const ang = (fx.baseAng || 0) + (arc.offset || 0)
        ctx.save()
        ctx.translate(midX, midY)
        ctx.rotate(ang)
        // 宽剑气带
        ctx.globalAlpha = (0.25 + 0.45 * (1 - Math.abs(u - 0.55))) * fade
        const grd = ctx.createLinearGradient(-dist * 0.55, 0, dist * 0.55, 0)
        grd.addColorStop(0, 'rgba(148,163,184,0)')
        grd.addColorStop(0.35, 'rgba(248,250,252,0.85)')
        grd.addColorStop(0.65, 'rgba(226,232,240,0.9)')
        grd.addColorStop(1, 'rgba(148,163,184,0)')
        ctx.fillStyle = grd
        const half = (arc.width || 4) * (1.2 + u * 2.2)
        ctx.beginPath()
        ctx.moveTo(-dist * 0.55, -half)
        ctx.quadraticCurveTo(0, -half * (1.6 + (arc.span || 1)), dist * 0.55, -half * 0.4)
        ctx.lineTo(dist * 0.55, half * 0.4)
        ctx.quadraticCurveTo(0, half * (1.6 + (arc.span || 1)), -dist * 0.55, half)
        ctx.closePath()
        ctx.fill()
        // 刃心亮线
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = i === 0 ? 2.6 : 1.6
        ctx.shadowColor = '#cbd5e1'
        ctx.shadowBlur = 12
        ctx.globalAlpha = 0.9 * fade * u
        ctx.beginPath()
        ctx.moveTo(-dist * 0.5, 0)
        ctx.quadraticCurveTo(0, (i - 1) * 10, dist * 0.5, 0)
        ctx.stroke()
        ctx.shadowBlur = 0
        // 斩痕残影剑
        if (u > 0.35) {
          ctx.globalAlpha = 0.55 * fade
          ctx.translate(dist * 0.15 * (u - 0.35), (i - 1) * 6)
          this._paintInkSword(ctx, '#f8fafc', 0.75 + (i === 0 ? 0.25 : 0), 'void')
        }
        ctx.restore()
      }
      // 命中裂空环
      ctx.globalAlpha = 0.4 * fade
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(fx.targetX, fx.targetY, 28 + (fx.t || 0) * 20, 12, fx.baseAng || 0, 0, Math.PI * 2)
      ctx.stroke()
    }

    for (let i = 0; i < (fx.sparks || []).length; i++) {
      const sp = fx.sparks[i]
      ctx.globalAlpha = Math.max(0, sp.life * 2) * fade
      ctx.fillStyle = '#f1f5f9'
      ctx.beginPath()
      ctx.arc(sp.x, sp.y, 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  },

  _drawAvatarUlt(ctx, fx) {
    const fade = fx.phase === 'end' ? Math.max(0, 1 - fx.t / fx.endDur) : 1
    const t = this._animT || 0
    const px = this._playerX
    const py = this._playerY - 8
    ctx.save()
    ctx.globalAlpha = 0.9 * fade
    ctx.fillStyle = fx.kind === 'niepan' ? '#fda4af' : '#ddd6fe'
    ctx.font = 'bold 18px "KaiTi", "STKaiti", serif'
    ctx.textAlign = 'center'
    ctx.fillText(fx.title || '惊蛰十二变', px, py - 62)
    const sc = fx.scale || 1.3
    // 真灵法相剪影
    ctx.globalAlpha = 0.35 * fade
    ctx.fillStyle = fx.kind === 'niepan' ? 'rgba(251,113,133,0.45)' : 'rgba(167,139,250,0.45)'
    ctx.beginPath()
    ctx.moveTo(px, py - 40 * sc)
    ctx.lineTo(px + 28 * sc, py + 20 * sc)
    ctx.lineTo(px - 28 * sc, py + 20 * sc)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = fx.kind === 'niepan' ? '#fb7185' : '#a78bfa'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(px, py, 30 * sc, 0, Math.PI * 2)
    ctx.stroke()
    const n = fx.kind === 'niepan' ? 8 : 12
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + t * (fx.kind === 'niepan' ? 2.2 : 1.4)
      const rr = 34 * sc + Math.sin(t * 5 + i) * 4
      ctx.beginPath()
      ctx.arc(px + Math.cos(a) * rr, py + Math.sin(a) * rr * 0.65, fx.kind === 'niepan' ? 5 : 3.5, 0, Math.PI * 2)
      ctx.fillStyle = fx.kind === 'niepan' ? '#fb7185' : '#c4b5fd'
      ctx.globalAlpha = 0.55 * fade
      ctx.fill()
    }
    ctx.restore()
  },

  _drawTimeLawUlt(ctx, fx) {
    const fade = fx.phase === 'end' ? Math.max(0, 1 - fx.t / fx.endDur) : 1
    const t = this._animT || 0
    ctx.save()
    ctx.globalAlpha = 0.9 * fade
    ctx.fillStyle = '#fef08a'
    ctx.font = 'bold 18px "KaiTi", "STKaiti", serif'
    ctx.textAlign = 'center'
    ctx.fillText(fx.title || '时间法则', fx.targetX, fx.targetY - 78)
    // 钟盘灵域
    ctx.globalAlpha = 0.22 * fade
    ctx.fillStyle = 'rgba(253,230,138,0.4)'
    ctx.beginPath()
    ctx.arc(fx.targetX, fx.targetY, 62, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = fx.kind === 'shennian' ? '#e7e5e4' : '#fde68a'
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.7 * fade
    ctx.beginPath()
    ctx.arc(fx.targetX, fx.targetY, 52, 0, Math.PI * 2)
    ctx.stroke()
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12
      ctx.beginPath()
      ctx.moveTo(fx.targetX + Math.cos(a) * 44, fx.targetY + Math.sin(a) * 44)
      ctx.lineTo(fx.targetX + Math.cos(a) * 52, fx.targetY + Math.sin(a) * 52)
      ctx.stroke()
    }
    // 时针
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(fx.targetX, fx.targetY)
    ctx.lineTo(fx.targetX + Math.cos(t * 1.2) * 30, fx.targetY + Math.sin(t * 1.2) * 30)
    ctx.stroke()
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(fx.targetX, fx.targetY)
    ctx.lineTo(fx.targetX + Math.cos(t * 3.5) * 40, fx.targetY + Math.sin(t * 3.5) * 40)
    ctx.stroke()
    for (let i = 0; i < (fx.pillars || []).length; i++) {
      const p = fx.pillars[i]
      const x = fx.targetX + Math.cos(p.a) * 52 * p.u
      const y = fx.targetY + Math.sin(p.a) * 36 * p.u
      ctx.globalAlpha = 0.55 * fade * p.u
      ctx.strokeStyle = fx.kind === 'shennian' ? '#e7e5e4' : '#fde68a'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, y + 28)
      ctx.lineTo(x, y - 40)
      ctx.stroke()
    }
    ctx.restore()
  },

  _drawDaoCrushUlt(ctx, fx) {
    const fade = fx.phase === 'end' ? Math.max(0, 1 - fx.t / fx.endDur) : 1
    const u = fx.bottleU || 0
    ctx.save()
    ctx.globalAlpha = 0.92 * fade
    ctx.fillStyle = '#fff7ed'
    ctx.font = 'bold 18px "KaiTi", "STKaiti", serif'
    ctx.textAlign = 'center'
    ctx.fillText(fx.title || '时间大道', this._w * 0.5, 68)
    // 掌天瓶虚影
    const bx = this._w * 0.5
    const by = 110
    ctx.globalAlpha = 0.35 + u * 0.45
    ctx.strokeStyle = '#fdba74'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(bx, by, 14 * u + 4, 22 * u + 6, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(bx, by + 20 * u)
    ctx.lineTo(fx.targetX, fx.targetY)
    ctx.strokeStyle = '#fef3c7'
    ctx.globalAlpha = 0.4 * fade
    ctx.stroke()
    ctx.globalAlpha = 0.2 * fade
    ctx.fillStyle = 'rgba(255,247,237,0.4)'
    ctx.beginPath()
    ctx.arc(fx.targetX, fx.targetY, 70 * u, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  },

  _drawFireballs(ctx) {
    const list = this._fireballs || []
    for (let i = 0; i < list.length; i++) {
      const b = list[i]
      ctx.save()
      ctx.globalAlpha = 0.9
      const g = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, b.r + 4)
      g.addColorStop(0, '#fef9c3')
      g.addColorStop(0.5, '#fb923c')
      g.addColorStop(1, 'rgba(249,115,22,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.r + 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  },

  _drawInsectFx(ctx) {
    const list = this._insectFx || []
    for (let i = 0; i < list.length; i++) {
      const bug = list[i]
      ctx.globalAlpha = Math.max(0.25, bug.life)
      ctx.fillStyle = '#b45309'
      ctx.beginPath()
      ctx.arc(bug.x, bug.y, 2.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
  },

  _drawQingyuanShield(ctx) {
    const combat = getRealmCombat(this._realmLv)
    const ultShield = this._gengFx && (this._gengFx.style === 'wuxing_array' || this._gengFx.style === 'avatar')
    const auxShield = combat && (combat.aux === 'qingyuan' || combat.aux === 'baimai')
    if (!(auxShield || ultShield)) return
    if ((this._qingyuanShield || 0) <= 0 && !ultShield) return
    ctx.save()
    ctx.globalAlpha = 0.28 + Math.sin((this._animT || 0) * 5) * 0.08
    ctx.strokeStyle = '#67e8f9'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(this._playerX, this._playerY - 6, 32, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  },

  _drawGengFormation(ctx) {
    const fx = this._gengFx
    if (!fx) return
    if (fx.style === 'void64') {
      this._drawVoidGengFormation(ctx, fx)
      return
    }
    if (fx.style === 'blink_jian') {
      this._drawBlinkJianUlt(ctx, fx)
      return
    }
    if (fx.style === 'wuxing_array') {
      this._drawWuxingArrayUlt(ctx, fx)
      return
    }
    if (fx.style === 'jianying') {
      this._drawJianyingUlt(ctx, fx)
      return
    }
    if (fx.style === 'yuanci') {
      this._drawYuanciUlt(ctx, fx)
      return
    }
    if (fx.style === 'xuantian') {
      this._drawXuantianUlt(ctx, fx)
      return
    }
    if (fx.style === 'avatar') {
      this._drawAvatarUlt(ctx, fx)
      return
    }
    if (fx.style === 'time_law') {
      this._drawTimeLawUlt(ctx, fx)
      return
    }
    if (fx.style === 'dao_crush') {
      this._drawDaoCrushUlt(ctx, fx)
      return
    }
    const fade =
      fx.phase === 'end' ? Math.max(0, 1 - fx.t / fx.endDur) :
      (fx.phase === 'gather' ? Math.min(1, fx.t / 0.35) : 1)
    ctx.save()

    // 阵名：起飞后显示在阵心上方
    if (fx.phase !== 'gather') {
      ctx.globalAlpha = 0.92 * fade * (fx.phase === 'fly' ? Math.min(1, fx.t / fx.flyDur) : 1)
      ctx.fillStyle = '#fef9c3'
      ctx.font = 'bold 20px "KaiTi", "STKaiti", serif'
      ctx.textAlign = 'center'
      ctx.fillText('大庚剑阵', fx.cx, fx.cy - fx.radius - 26)
    }

    // 金黄阵环：飞阵过程渐显，结阵后常亮
    if (fx.phase !== 'gather') {
      const ringU = fx.phase === 'fly' ? Math.min(1, fx.t / fx.flyDur) : 1
      ctx.globalAlpha = 0.4 * fade * ringU
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(fx.cx, fx.cy, fx.radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 0.12 * fade * ringU
      ctx.fillStyle = 'rgba(251,191,36,0.35)'
      ctx.beginPath()
      ctx.arc(fx.cx, fx.cy, fx.radius, 0, Math.PI * 2)
      ctx.fill()
    }

    if (fx.phase === 'suck') {
      ctx.globalAlpha = 0.25 * fade
      for (let i = 0; i < 18; i++) {
        const a = (this._animT || 0) * 3 + i * 0.7
        const rr = fx.radius * (0.85 - (fx.t / fx.suckDur) * 0.55)
        ctx.fillStyle = i % 2 ? '#fef08a' : '#f59e0b'
        ctx.beginPath()
        ctx.arc(fx.cx + Math.cos(a) * rr, fx.cy + Math.sin(a) * rr * 0.9, 2.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 72 金黄雷电剑
    for (let i = 0; i < fx.swords.length; i++) {
      const s = fx.swords[i]
      const sc = (s.scale != null ? s.scale : 1)
      if (sc <= 0.02) continue
      ctx.save()
      ctx.globalAlpha = 0.96 * fade * Math.min(1, sc + 0.15)
      ctx.translate(s.x, s.y)
      ctx.rotate(s.tipAngle)
      this._paintGengSword(ctx, 0.48 * sc)
      ctx.restore()
    }

    if (fx.phase === 'zap' || (fx.phase === 'end' && !fx.killed)) {
      this._drawGengFilaments(ctx, fx, fade)
    } else if (fx.phase === 'end') {
      ctx.globalAlpha = 0.35 * fade
      ctx.strokeStyle = '#fef08a'
      ctx.lineWidth = 1
      for (let i = 0; i < fx.links.length; i += 2) {
        const la = fx.links[i]
        const sa = fx.swords[la.a]
        const sb = fx.swords[la.b]
        const tipA = this._gengTip(sa)
        const tipB = this._gengTip(sb)
        ctx.beginPath()
        ctx.moveTo(tipA.x, tipA.y)
        ctx.lineTo(tipB.x, tipB.y)
        ctx.stroke()
      }
    }
    ctx.restore()
  },

  /** 元婴大庚：天圆竖剑 / 下拉 / 点指贯体 / 插地召回 */
  _drawVoidGengFormation(ctx, fx) {
    const fade = fx.phase === 'end' ? Math.max(0, 1 - fx.t / fx.endDur) : 1
    ctx.save()
    ctx.globalAlpha = 0.95 * fade
    ctx.fillStyle = '#fef9c3'
    ctx.font = 'bold 20px "KaiTi", "STKaiti", serif'
    ctx.textAlign = 'center'
    const titleY = fx.phase === 'sky' ? 56 : Math.max(48, (fx.cy != null ? fx.cy : 80) - 56)
    ctx.fillText('大庚剑阵', this._w * 0.5, titleY)

    // 金色大圆阵环
    if (fx.phase === 'sky' || fx.phase === 'converge' || fx.phase === 'pull' || fx.phase === 'point') {
      const rr = fx.phase === 'sky' ? (fx.ringR || 120) : (fx.ringR || 120) * (fx.phase === 'point' ? 0.5 : 0.65)
      ctx.globalAlpha = 0.45 * fade
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.ellipse(fx.cx || this._w * 0.5, fx.cy || 100, rr, rr * (fx.phase === 'sky' ? 0.28 : 0.48), 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 0.12 * fade
      ctx.fillStyle = 'rgba(251,191,36,0.35)'
      ctx.beginPath()
      ctx.ellipse(fx.cx || this._w * 0.5, fx.cy || 100, rr, rr * (fx.phase === 'sky' ? 0.28 : 0.48), 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // 点指：人物下方金光指示
    if (fx.phase === 'point' || (fx.phase === 'pierce' && fx.t < 0.35)) {
      const px = this._playerX
      const py = this._playerY
      ctx.globalAlpha = 0.85 * fade
      ctx.strokeStyle = '#fde047'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(px + 10, py - 8)
      ctx.lineTo(px + 10, py + 36)
      ctx.stroke()
      ctx.fillStyle = 'rgba(253,224,71,0.35)'
      ctx.beginPath()
      ctx.arc(px + 10, py + 40, 8 + Math.sin((this._animT || 0) * 16) * 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // 贯体雷丝
    if (fx.phase === 'pierce') {
      ctx.globalAlpha = 0.35 * fade
      ctx.strokeStyle = '#fef08a'
      ctx.lineWidth = 1.2
      for (let i = 0; i < 12; i++) {
        const a = (this._animT || 0) * 8 + i
        ctx.beginPath()
        ctx.moveTo(fx.targetX + Math.cos(a) * 8, fx.targetY + Math.sin(a) * 6)
        ctx.lineTo(fx.targetX + Math.cos(a + 1) * 40, fx.targetY + Math.sin(a + 1) * 30)
        ctx.stroke()
      }
    }

    for (let i = 0; i < fx.swords.length; i++) {
      const s = fx.swords[i]
      const sc = s.scale != null ? s.scale : 1
      if (sc <= 0.02) continue
      ctx.save()
      ctx.globalAlpha = 0.97 * fade * Math.min(1, sc + 0.1)
      ctx.translate(s.x, s.y)
      ctx.rotate(s.tipAngle)
      this._paintGengSword(ctx, (fx.phase === 'sky' ? 0.62 : 0.5) * sc)
      ctx.restore()
    }
    ctx.restore()
  },

  /**
   * 心魔黑影：修长全黑人形剪影（更像人），只漏血红眼睛与白牙
   * 复用姿态解析，走/攻/挡时有摆臂迈步
   */
  _drawShadowSelfGuardian(ctx, z, drawX, drawY, size, faceLeft, flashOnly) {
    const t = this._animT || 0
    const seed = z.id || 0
    const pose = this._resolveCultivatorPose(z)
    const bob = (pose.bob || 0) * size
    const slimX = 0.58
    const slimY = 1.14
    ctx.save()
    ctx.translate(drawX, drawY + bob + size * 0.04)
    if (faceLeft) ctx.scale(-slimX, slimY)
    else ctx.scale(slimX, slimY)
    ctx.rotate(pose.lean || 0)

    // 脚底暗雾
    ctx.globalAlpha = 0.4
    ctx.fillStyle = '#050505'
    ctx.beginPath()
    ctx.ellipse(0, size * 0.42, size * 0.22, size * 0.055, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    const ink = '#050505'
    const edge = '#111111'
    ctx.fillStyle = ink
    ctx.strokeStyle = edge
    ctx.lineWidth = Math.max(1, size * 0.012)

    // 发髻 + 披发
    ctx.beginPath()
    ctx.ellipse(0, -size * 0.46, size * 0.07, size * 0.055, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(0, -size * 0.34, size * 0.13, size * 0.1, 0, Math.PI * 1.05, Math.PI * 1.95)
    ctx.fill()
    // 一侧垂发，更有人味
    ctx.beginPath()
    ctx.moveTo(-size * 0.1, -size * 0.3)
    ctx.quadraticCurveTo(-size * 0.22, -size * 0.05, -size * 0.12, size * 0.12)
    ctx.quadraticCurveTo(-size * 0.08, -size * 0.05, -size * 0.06, -size * 0.28)
    ctx.fill()

    // 鹅蛋头
    ctx.beginPath()
    ctx.ellipse(0, -size * 0.27, size * 0.095, size * 0.125, 0, 0, Math.PI * 2)
    ctx.fill()
    // 颈
    ctx.beginPath()
    ctx.moveTo(-size * 0.03, -size * 0.16)
    ctx.lineTo(size * 0.03, -size * 0.16)
    ctx.lineTo(size * 0.038, -size * 0.09)
    ctx.lineTo(-size * 0.038, -size * 0.09)
    ctx.fill()

    // 修长道袍（肩窄、腰收、下摆略开）
    ctx.beginPath()
    ctx.moveTo(-size * 0.11, -size * 0.1)
    ctx.quadraticCurveTo(-size * 0.2, size * 0.08, -size * 0.18, size * 0.38)
    ctx.quadraticCurveTo(0, size * 0.42, size * 0.18, size * 0.38)
    ctx.quadraticCurveTo(size * 0.2, size * 0.08, size * 0.11, -size * 0.1)
    ctx.quadraticCurveTo(0, -size * 0.14, -size * 0.11, -size * 0.1)
    ctx.fill()
    // 交领暗线
    ctx.strokeStyle = '#1a1a1a'
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    ctx.moveTo(-size * 0.015, -size * 0.1)
    ctx.lineTo(-size * 0.07, size * 0.06)
    ctx.moveTo(size * 0.015, -size * 0.1)
    ctx.lineTo(size * 0.07, size * 0.06)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.fillStyle = ink

    // 迈步双腿
    const ws = pose.walkSwing || 0
    const lx = ws * size * 0.05
    const ly = Math.max(0, -ws) * size * 0.025
    const rx = -ws * size * 0.05
    const ry = Math.max(0, ws) * size * 0.025
    ctx.beginPath()
    ctx.ellipse(-size * 0.055 + lx, size * 0.36 - ly, size * 0.035, size * 0.065, 0.12, 0, Math.PI * 2)
    ctx.ellipse(size * 0.055 + rx, size * 0.36 - ry, size * 0.035, size * 0.065, -0.12, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(-size * 0.055 + lx, size * 0.42 - ly, size * 0.045, size * 0.02, 0, 0, Math.PI * 2)
    ctx.ellipse(size * 0.055 + rx, size * 0.42 - ry, size * 0.045, size * 0.02, 0, 0, Math.PI * 2)
    ctx.fill()

    // 双臂（姿态角）
    const armR = pose.armR != null ? pose.armR : 0.5
    const armL = pose.armL != null ? pose.armL : -0.4
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1
      const ang = side < 0 ? armL : armR
      ctx.save()
      ctx.translate(side * size * 0.12, -size * 0.02)
      ctx.rotate(ang)
      ctx.beginPath()
      ctx.moveTo(-size * 0.035, 0)
      ctx.quadraticCurveTo(-size * 0.055, size * 0.1, -size * 0.04, size * 0.2)
      ctx.quadraticCurveTo(0, size * 0.23, size * 0.04, size * 0.2)
      ctx.quadraticCurveTo(size * 0.055, size * 0.1, size * 0.035, 0)
      ctx.closePath()
      ctx.fill()
      // 手
      ctx.beginPath()
      ctx.ellipse(0, size * 0.23, size * 0.028, size * 0.032, 0, 0, Math.PI * 2)
      ctx.fill()
      // 攻击/格挡时右手持暗影短刃剪影
      if (side > 0 && (pose.mode === 'attack' || pose.mode === 'block' || pose.mode === 'idle' || pose.mode === 'walk')) {
        ctx.save()
        ctx.translate(0, size * 0.2)
        ctx.rotate(pose.weaponAng != null ? pose.weaponAng : -0.9)
        ctx.beginPath()
        ctx.moveTo(-size * 0.02, size * 0.04)
        ctx.lineTo(0, size * 0.28)
        ctx.lineTo(size * 0.02, size * 0.04)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
      ctx.restore()
    }

    // 前额发丝盖住脸缘
    ctx.fillStyle = ink
    ctx.beginPath()
    ctx.ellipse(0, -size * 0.36, size * 0.11, size * 0.045, 0, Math.PI, Math.PI * 2)
    ctx.fill()

    // 只漏眼睛（修长眼形）
    const eyeY = -size * 0.29
    const eyeX = size * 0.042
    const blink = Math.sin(t * 3 + seed) > 0.92 ? 0.2 : 1
    for (let side = -1; side <= 1; side += 2) {
      const ex = side * eyeX
      ctx.fillStyle = '#450a0a'
      ctx.beginPath()
      ctx.ellipse(ex, eyeY, size * 0.028, size * 0.018 * blink, side * 0.15, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.ellipse(ex, eyeY, size * 0.016, size * 0.012 * blink, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fecaca'
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.arc(ex + size * 0.005, eyeY - size * 0.004 * blink, size * 0.005, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // 只漏牙齿（略收窄）
    const open = 0.35 + Math.sin(t * 5.5 + seed) * 0.12
    const my = -size * 0.175
    const mw = size * 0.07
    ctx.fillStyle = '#0a0a0a'
    ctx.beginPath()
    ctx.ellipse(0, my, mw, mw * 0.38 * open, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f8fafc'
    for (let i = 0; i < 5; i++) {
      const u = (i / 4) * 2 - 1
      const tx = u * mw * 0.7
      ctx.beginPath()
      ctx.moveTo(tx - size * 0.009, my - mw * 0.1 * open)
      ctx.lineTo(tx, my + size * 0.028 + open * size * 0.015)
      ctx.lineTo(tx + size * 0.009, my - mw * 0.1 * open)
      ctx.closePath()
      ctx.fill()
    }

    // 格挡月牙（心魔挡招时）
    if (pose.mode === 'block') {
      ctx.globalAlpha = 0.75
      ctx.strokeStyle = z.crescentColor || '#7f1d1d'
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.arc(size * 0.14, 0, size * 0.32, -1.15, 1.15)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    if (flashOnly) {
      ctx.globalAlpha = 0.22
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.ellipse(0, 0, size * 0.16, size * 0.36, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  },

  /** @deprecated 尖牙已并入 _drawShadowSelfGuardian */
  _drawSharkTeeth(ctx, z, drawX, drawY, size) {},

  _drawDemonAura(ctx, z, drawX, drawY, size) {
    const t = this._animT || 0
    const shadow = !!z.isShadowSelf
    ctx.save()
    ctx.globalAlpha = 0.45 + Math.sin(t * 5 + z.id) * 0.12
    const grd = ctx.createRadialGradient(drawX, drawY, size * 0.1, drawX, drawY, size * 0.62)
    if (shadow) {
      grd.addColorStop(0, 'rgba(127,29,29,0.55)')
      grd.addColorStop(0.55, 'rgba(15,23,42,0.4)')
      grd.addColorStop(1, 'rgba(0,0,0,0)')
    } else {
      grd.addColorStop(0, 'rgba(76,29,149,0.55)')
      grd.addColorStop(0.55, 'rgba(15,23,42,0.35)')
      grd.addColorStop(1, 'rgba(0,0,0,0)')
    }
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(drawX, drawY, size * 0.62, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = shadow ? 'rgba(127,29,29,0.75)' : 'rgba(30,27,75,0.75)'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 5; i++) {
      const a = t * 1.8 + i * 1.25
      ctx.globalAlpha = 0.35
      ctx.beginPath()
      ctx.moveTo(drawX + Math.cos(a) * size * 0.2, drawY + Math.sin(a) * size * 0.15)
      ctx.quadraticCurveTo(
        drawX + Math.cos(a + 0.4) * size * 0.45,
        drawY - size * 0.35 + Math.sin(a) * 10,
        drawX + Math.cos(a + 0.8) * size * 0.25,
        drawY - size * 0.55
      )
      ctx.stroke()
    }
    ctx.restore()
  },

  /** 境主身周气场（非魔族也有，按 tint） */
  _drawGuardianAura(ctx, z, drawX, drawY, size) {
    const t = this._animT || 0
    const col = z.crescentGlow || z.tint || '#86efac'
    ctx.save()
    ctx.globalAlpha = 0.32 + Math.sin(t * 4 + z.id) * 0.08
    const grd = ctx.createRadialGradient(drawX, drawY, size * 0.08, drawX, drawY, size * 0.55)
    grd.addColorStop(0, col)
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(drawX, drawY, size * 0.55, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  },

  /** #rrggbb → rgba 字符串 */
  _hexToRgba(hex, alpha) {
    const h = String(hex || '#64748b').replace('#', '')
    const full = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h
    const n = parseInt(full.slice(0, 6), 16)
    if (!isFinite(n)) return 'rgba(100,116,139,' + (alpha == null ? 0.4 : alpha) + ')'
    const r = (n >> 16) & 255
    const g = (n >> 8) & 255
    const b = n & 255
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha == null ? 0.4 : alpha) + ')'
  },

  /**
   * 各大境界敌修外形档案（独立人形，不用主角贴图）
   * weapon: blade/voidblade/claw/axe/spear/fan/ruler/needle/staff/demonblade
   */
  _getEnemyCultivatorLook(style, tint, glow) {
    const looks = {
      sha: {
        name: '煞影修士', hair: 'horn', robe: 'flare', weapon: 'blade', skin: '#f3c6b4',
        hairCol: '#0b1220', robeCol: tint || '#0e7490', accent: glow || '#67e8f9',
        lining: '#083344', mark: '煞', eye: '#67e8f9'
      },
      voidbeast: {
        name: '虚空修士', hair: 'hood', robe: 'wide', weapon: 'voidblade', skin: '#d8e4ea',
        hairCol: '#134e4a', robeCol: tint || '#0f766e', accent: glow || '#99f6e4',
        lining: '#042f2e', mark: '虚', eye: '#5eead4'
      },
      mutate: {
        name: '真灵修士', hair: 'wild', robe: 'split', weapon: 'claw', skin: '#ead8f8',
        hairCol: '#3b0764', robeCol: tint || '#6d28d9', accent: glow || '#ddd6fe',
        lining: '#2e1065', mark: '灵', eye: '#c4b5fd'
      },
      overlord: {
        name: '霸体修士', hair: 'crown', robe: 'armor', weapon: 'axe', skin: '#f8cfcf',
        hairCol: '#4c0519', robeCol: tint || '#be123c', accent: glow || '#fecdd3',
        lining: '#4c0519', mark: '霸', eye: '#fda4af'
      },
      leibeast: {
        name: '雷劫修士', hair: 'spike', robe: 'flare', weapon: 'spear', skin: '#f8e4c8',
        hairCol: '#422006', robeCol: tint || '#ca8a04', accent: glow || '#fef08a',
        lining: '#451a03', mark: '雷', eye: '#fde047'
      },
      timeprison: {
        name: '时囚修士', hair: 'bun', robe: 'layer', weapon: 'fan', skin: '#f3d5b5',
        hairCol: '#7c2d12', robeCol: tint || '#c2410c', accent: glow || '#fdba74',
        lining: '#7c2d12', mark: '时', eye: '#fb923c'
      },
      tianmo: {
        name: '天魔修士', hair: 'flat', robe: 'jade', weapon: 'ruler', skin: '#e4dfd8',
        hairCol: '#292524', robeCol: tint || '#78716c', accent: glow || '#fafaf9',
        lining: '#1c1917', mark: '魔', eye: '#a8a29e'
      },
      sanshi: {
        name: '三尸修士', hair: 'triple', robe: 'ghost', weapon: 'needle', skin: '#ddd6fe',
        hairCol: '#4c1d95', robeCol: tint || '#6d28d9', accent: glow || '#c4b5fd',
        lining: '#2e1065', mark: '尸', eye: '#a78bfa'
      },
      chaos: {
        name: '混沌修士', hair: 'flow', robe: 'dao', weapon: 'staff', skin: '#f6e7c8',
        hairCol: '#451a03', robeCol: tint || '#fdba74', accent: glow || '#fff7ed',
        lining: '#78350f', mark: '道', eye: '#fbbf24'
      },
      demon: {
        name: '魔影修士', hair: 'horn', robe: 'flare', weapon: 'demonblade', skin: '#ddd6fe',
        hairCol: '#1e1b4b', robeCol: tint || '#7c3aed', accent: glow || '#a78bfa',
        lining: '#2e1065', mark: '魔', eye: '#c4b5fd'
      }
    }
    return looks[style] || looks.sha
  },

  /** 混色：#rrggbb 线性插值 */
  _mixHex(a, b, t) {
    const parse = (hex) => {
      const h = String(hex || '#888888').replace('#', '')
      const full = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h
      const n = parseInt(full.slice(0, 6), 16)
      if (!isFinite(n)) return [136, 136, 136]
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }
    const u = Math.max(0, Math.min(1, t == null ? 0.5 : t))
    const A = parse(a)
    const B = parse(b)
    const r = Math.round(A[0] + (B[0] - A[0]) * u)
    const g = Math.round(A[1] + (B[1] - A[1]) * u)
    const bl = Math.round(A[2] + (B[2] - A[2]) * u)
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)
  },

  /**
   * 敌修姿态：idle/walk/attack/block/dash → 臂角、前倾、武器角、进度
   * 只读状态机，不改战斗逻辑
   */
  _resolveCultivatorPose(z) {
    const t = this._animT || 0
    const seed = z.id || 0
    const maxBlock = z.blockCdMax || 0.4
    const blocking = (z.blockCd || 0) > maxBlock * 0.45
    const dashing = (z.dashT || 0) > 0
    const attacking = !blocking && (z.state === 'attack' || z.state === 'skill' || dashing || !!z.atkFx)
    const walking = !attacking && !blocking && (z.state === 'walk' || z.state === 'chase' || z.state === 'emerge')
    let mode = 'idle'
    if (blocking) mode = 'block'
    else if (dashing) mode = 'dash'
    else if (attacking) mode = 'attack'
    else if (walking) mode = 'walk'

    // 与主绘制走动起伏同相位，避免脚尘和迈步脱节
    const walkPhase = (z.frameT || 0) * Math.max(5, 5.5 + (z.speedMul || 1) * 3.5) * Math.PI
    const walkSwing = mode === 'walk' ? Math.sin(walkPhase) : Math.sin(t * 2.2 + seed) * 0.25
    let atkU = 0
    if (z.atkFx) atkU = Math.min(1, z.atkFx.t / Math.max(0.01, z.atkFx.dur))
    else if (mode === 'attack' || mode === 'dash') atkU = Math.min(1, (z.frameT || z.skillT || 0) / 0.5)
    const swing = Math.sin(atkU * Math.PI)
    const blockU = blocking ? Math.min(1, (z.blockCd || 0) / maxBlock) : 0

    // 右臂持武、左臂辅手；本地坐标系面向右
    let armR = 0.55
    let armL = -0.45
    let weaponAng = -0.85
    let lean = 0
    let raise = 0
    if (mode === 'walk') {
      armR = 0.5 + walkSwing * 0.35
      armL = -0.4 - walkSwing * 0.35
      weaponAng = -0.9 + walkSwing * 0.12
      lean = walkSwing * 0.04
    } else if (mode === 'attack') {
      armR = 0.2 - swing * 1.35
      armL = -0.2 - swing * 0.35
      weaponAng = -1.2 + swing * 2.1
      lean = 0.08 + swing * 0.12
      raise = swing * 0.06
    } else if (mode === 'dash') {
      armR = -0.9
      armL = -0.55
      weaponAng = 0.35
      lean = 0.22
    } else if (mode === 'block') {
      armR = -0.15
      armL = -1.05
      weaponAng = -0.15
      lean = -0.06
      raise = 0.04
    } else {
      armR = 0.55 + Math.sin(t * 1.6 + seed) * 0.06
      armL = -0.45
      weaponAng = -0.85 + Math.sin(t * 2 + seed) * 0.08
    }
    return {
      mode: mode,
      walkSwing: walkSwing,
      walkPhase: walkPhase,
      atkU: atkU,
      swing: swing,
      blockU: blockU,
      armR: armR,
      armL: armL,
      weaponAng: weaponAng,
      lean: lean,
      raise: raise,
      bob: mode === 'walk' ? Math.abs(Math.sin(walkPhase)) * 0.012 : (mode === 'attack' ? -swing * 0.01 : 0)
    }
  },

  /** 脚下灵气光斑 */
  _paintCultivatorAura(ctx, size, accent, t, seed) {
    ctx.save()
    const pulse = 0.22 + Math.sin(t * 3.2 + seed) * 0.06
    const grd = ctx.createRadialGradient(0, size * 0.4, size * 0.04, 0, size * 0.4, size * 0.36)
    grd.addColorStop(0, this._hexToRgba(accent, pulse + 0.12))
    grd.addColorStop(0.55, this._hexToRgba(accent, pulse * 0.45))
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.ellipse(0, size * 0.42, size * 0.34, size * 0.1, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  },

  /** 发型 / 帽兜 */
  _paintCultivatorHair(ctx, look, size, t) {
    const col = look.hairCol
    const hi = this._mixHex(col, '#ffffff', 0.18)
    ctx.fillStyle = col
    ctx.strokeStyle = hi
    ctx.lineWidth = Math.max(1, size * 0.012)
    const hair = look.hair
    if (hair === 'hood') {
      ctx.beginPath()
      ctx.moveTo(-size * 0.2, -size * 0.18)
      ctx.quadraticCurveTo(-size * 0.26, -size * 0.42, 0, -size * 0.52)
      ctx.quadraticCurveTo(size * 0.26, -size * 0.42, size * 0.2, -size * 0.18)
      ctx.quadraticCurveTo(size * 0.14, -size * 0.3, 0, -size * 0.32)
      ctx.quadraticCurveTo(-size * 0.14, -size * 0.3, -size * 0.2, -size * 0.18)
      ctx.fill()
      ctx.globalAlpha = 0.35
      ctx.stroke()
      ctx.globalAlpha = 1
      return
    }
    ctx.beginPath()
    ctx.ellipse(0, -size * 0.3, size * 0.16, size * 0.14, 0, Math.PI * 1.05, Math.PI * 1.95)
    ctx.fill()
    if (hair === 'horn') {
      for (let side = -1; side <= 1; side += 2) {
        ctx.beginPath()
        ctx.moveTo(side * size * 0.06, -size * 0.36)
        ctx.quadraticCurveTo(side * size * 0.16, -size * 0.52, side * size * 0.1, -size * 0.58)
        ctx.quadraticCurveTo(side * size * 0.04, -size * 0.5, side * size * 0.02, -size * 0.38)
        ctx.fill()
      }
    } else if (hair === 'wild') {
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath()
        ctx.moveTo(i * size * 0.03, -size * 0.34)
        ctx.quadraticCurveTo(i * size * 0.05, -size * 0.5 - Math.abs(i) * 1.2, i * size * 0.02 + size * 0.02, -size * 0.36)
        ctx.lineTo(i * size * 0.03 + size * 0.01, -size * 0.34)
        ctx.fill()
      }
    } else if (hair === 'crown') {
      ctx.beginPath()
      ctx.moveTo(-size * 0.14, -size * 0.38)
      ctx.lineTo(-size * 0.08, -size * 0.54)
      ctx.lineTo(-size * 0.02, -size * 0.42)
      ctx.lineTo(0, -size * 0.58)
      ctx.lineTo(size * 0.02, -size * 0.42)
      ctx.lineTo(size * 0.08, -size * 0.54)
      ctx.lineTo(size * 0.14, -size * 0.38)
      ctx.quadraticCurveTo(0, -size * 0.44, -size * 0.14, -size * 0.38)
      ctx.fill()
      ctx.fillStyle = look.accent
      ctx.globalAlpha = 0.75
      ctx.beginPath()
      ctx.arc(0, -size * 0.5, size * 0.025, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle = col
    } else if (hair === 'spike') {
      for (let i = -2; i <= 2; i++) {
        const x = i * size * 0.048
        ctx.beginPath()
        ctx.moveTo(x - size * 0.02, -size * 0.34)
        ctx.lineTo(x + Math.sin(t * 8 + i) * 1.2, -size * 0.56)
        ctx.lineTo(x + size * 0.025, -size * 0.34)
        ctx.fill()
      }
    } else if (hair === 'triple') {
      ;[-1, 0, 1].forEach((k, idx) => {
        ctx.beginPath()
        ctx.ellipse(k * size * 0.11, -size * (0.42 + (idx === 1 ? 0.06 : 0)), size * 0.055, size * 0.05, 0, 0, Math.PI * 2)
        ctx.fill()
      })
    } else if (hair === 'flow') {
      ctx.beginPath()
      ctx.ellipse(0, -size * 0.34, size * 0.17, size * 0.11, 0, 0, Math.PI * 2)
      ctx.fill()
      const sway = Math.sin(t * 2.4) * size * 0.02
      ctx.beginPath()
      ctx.moveTo(-size * 0.14, -size * 0.28)
      ctx.quadraticCurveTo(-size * 0.34 + sway, size * 0.05, -size * 0.18, size * 0.28)
      ctx.quadraticCurveTo(-size * 0.1, size * 0.05, -size * 0.08, -size * 0.26)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(size * 0.1, -size * 0.28)
      ctx.quadraticCurveTo(size * 0.28 + sway, 0, size * 0.16, size * 0.2)
      ctx.quadraticCurveTo(size * 0.08, -0.02 * size, size * 0.06, -size * 0.26)
      ctx.fill()
    } else if (hair === 'flat') {
      ctx.beginPath()
      ctx.ellipse(0, -size * 0.38, size * 0.17, size * 0.055, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(-size * 0.16, -size * 0.34)
      ctx.quadraticCurveTo(-size * 0.22, -size * 0.18, -size * 0.12, -size * 0.16)
      ctx.lineTo(-size * 0.08, -size * 0.32)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.ellipse(0, -size * 0.34, size * 0.15, size * 0.1, 0, Math.PI, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(0, -size * 0.46, size * 0.075, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = look.accent
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.arc(0, -size * 0.46, size * 0.04, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  },

  /** 头脸五官（偏修长鹅蛋脸） */
  _paintCultivatorHead(ctx, look, size, t, seed) {
    const skin = look.skin
    const shade = this._mixHex(skin, '#7c2d12', 0.22)
    ctx.fillStyle = shade
    ctx.beginPath()
    ctx.moveTo(-size * 0.032, -size * 0.16)
    ctx.lineTo(size * 0.032, -size * 0.16)
    ctx.lineTo(size * 0.04, -size * 0.08)
    ctx.lineTo(-size * 0.04, -size * 0.08)
    ctx.fill()
    const hx = 0
    const hy = -size * 0.27
    const hr = size * 0.118
    const g = ctx.createRadialGradient(hx - hr * 0.25, hy - hr * 0.3, hr * 0.2, hx, hy, hr)
    g.addColorStop(0, this._mixHex(skin, '#ffffff', 0.28))
    g.addColorStop(0.62, skin)
    g.addColorStop(1, shade)
    ctx.fillStyle = g
    ctx.beginPath()
    // 鹅蛋脸：上下略长、两侧收窄
    ctx.ellipse(hx, hy, hr * 0.82, hr * 1.08, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = shade
    ctx.beginPath()
    ctx.ellipse(-hr * 0.88, hy + size * 0.01, size * 0.022, size * 0.035, -0.2, 0, Math.PI * 2)
    ctx.ellipse(hr * 0.88, hy + size * 0.01, size * 0.022, size * 0.035, 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = this._mixHex(look.hairCol, '#000', 0.2)
    ctx.lineWidth = Math.max(1.1, size * 0.015)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-size * 0.055, hy - size * 0.03)
    ctx.quadraticCurveTo(-size * 0.032, hy - size * 0.045, -size * 0.012, hy - size * 0.028)
    ctx.moveTo(size * 0.055, hy - size * 0.03)
    ctx.quadraticCurveTo(size * 0.032, hy - size * 0.045, size * 0.012, hy - size * 0.028)
    ctx.stroke()
    const blink = Math.sin(t * 2.6 + seed) > 0.94 ? 0.18 : 1
    const eyeCol = look.eye || look.accent
    for (let side = -1; side <= 1; side += 2) {
      const ex = side * size * 0.038
      const ey = hy + size * 0.008
      ctx.fillStyle = '#1e293b'
      ctx.beginPath()
      ctx.ellipse(ex, ey, size * 0.02, size * 0.014 * blink, side * 0.12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = eyeCol
      ctx.beginPath()
      ctx.ellipse(ex + side * size * 0.003, ey, size * 0.01, size * 0.01 * blink, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.arc(ex - size * 0.005, ey - size * 0.004 * blink, size * 0.004, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.strokeStyle = this._hexToRgba(shade, 0.5)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, hy + size * 0.015)
    ctx.lineTo(-size * 0.01, hy + size * 0.038)
    ctx.stroke()
    ctx.strokeStyle = this._mixHex(skin, '#be123c', 0.32)
    ctx.lineWidth = Math.max(1, size * 0.01)
    ctx.beginPath()
    ctx.moveTo(-size * 0.022, hy + size * 0.055)
    ctx.quadraticCurveTo(0, hy + size * 0.068, size * 0.022, hy + size * 0.055)
    ctx.stroke()
    ctx.fillStyle = this._hexToRgba('#fb7185', 0.14)
    ctx.beginPath()
    ctx.ellipse(-size * 0.06, hy + size * 0.035, size * 0.022, size * 0.014, 0, 0, Math.PI * 2)
    ctx.ellipse(size * 0.06, hy + size * 0.035, size * 0.022, size * 0.014, 0, 0, Math.PI * 2)
    ctx.fill()
  },

  /** 道袍 / 甲胄身躯（随步伐前倾与迈步） */
  _paintCultivatorRobe(ctx, look, size, pose) {
    const robe = look.robe
    const dark = look.lining || this._mixHex(look.robeCol, '#000', 0.45)
    const mid = look.robeCol
    const lite = this._mixHex(mid, '#ffffff', 0.22)
    const accent = look.accent
    const walkSwing = (pose && pose.walkSwing) || 0
    const lean = (pose && pose.lean) || 0
    ctx.save()
    ctx.rotate(lean)
    ctx.translate(0, -((pose && pose.raise) || 0) * size)
    ctx.fillStyle = dark
    ctx.beginPath()
    ctx.moveTo(-size * 0.1, -size * 0.1)
    ctx.lineTo(-size * 0.14, size * 0.32)
    ctx.lineTo(size * 0.14, size * 0.32)
    ctx.lineTo(size * 0.1, -size * 0.1)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    if (robe === 'armor') {
      ctx.moveTo(-size * 0.18, -size * 0.12)
      ctx.lineTo(-size * 0.28, size * 0.02)
      ctx.lineTo(-size * 0.24, size * 0.36)
      ctx.lineTo(-size * 0.06, size * 0.34)
      ctx.lineTo(0, size * 0.38)
      ctx.lineTo(size * 0.06, size * 0.34)
      ctx.lineTo(size * 0.24, size * 0.36)
      ctx.lineTo(size * 0.28, size * 0.02)
      ctx.lineTo(size * 0.18, -size * 0.12)
      ctx.quadraticCurveTo(0, -size * 0.16, -size * 0.18, -size * 0.12)
    } else if (robe === 'wide') {
      ctx.moveTo(-size * 0.14, -size * 0.12)
      ctx.quadraticCurveTo(-size * 0.36, size * 0.12, -size * 0.34, size * 0.38)
      ctx.quadraticCurveTo(0, size * 0.42, size * 0.34, size * 0.38)
      ctx.quadraticCurveTo(size * 0.36, size * 0.12, size * 0.14, -size * 0.12)
      ctx.quadraticCurveTo(0, -size * 0.16, -size * 0.14, -size * 0.12)
    } else if (robe === 'split') {
      ctx.moveTo(-size * 0.16, -size * 0.12)
      ctx.lineTo(-size * 0.26, size * 0.38)
      ctx.lineTo(-size * 0.04, size * 0.22)
      ctx.lineTo(0, size * 0.3)
      ctx.lineTo(size * 0.04, size * 0.22)
      ctx.lineTo(size * 0.26, size * 0.38)
      ctx.lineTo(size * 0.16, -size * 0.12)
      ctx.quadraticCurveTo(0, -size * 0.16, -size * 0.16, -size * 0.12)
    } else if (robe === 'jade') {
      ctx.moveTo(-size * 0.17, -size * 0.12)
      ctx.lineTo(-size * 0.2, size * 0.36)
      ctx.quadraticCurveTo(0, size * 0.4, size * 0.2, size * 0.36)
      ctx.lineTo(size * 0.17, -size * 0.12)
      ctx.quadraticCurveTo(0, -size * 0.15, -size * 0.17, -size * 0.12)
    } else if (robe === 'ghost') {
      ctx.moveTo(-size * 0.16, -size * 0.12)
      ctx.quadraticCurveTo(-size * 0.3, size * 0.1, -size * 0.28, size * 0.4)
      ctx.quadraticCurveTo(-size * 0.1, size * 0.3, 0, size * 0.42)
      ctx.quadraticCurveTo(size * 0.1, size * 0.3, size * 0.28, size * 0.4)
      ctx.quadraticCurveTo(size * 0.3, size * 0.1, size * 0.16, -size * 0.12)
      ctx.quadraticCurveTo(0, -size * 0.16, -size * 0.16, -size * 0.12)
    } else if (robe === 'layer' || robe === 'dao') {
      ctx.moveTo(-size * 0.15, -size * 0.12)
      ctx.quadraticCurveTo(-size * 0.28, size * 0.08, -size * 0.26, size * 0.38)
      ctx.lineTo(-size * 0.08, size * 0.34)
      ctx.lineTo(0, size * 0.4)
      ctx.lineTo(size * 0.08, size * 0.34)
      ctx.lineTo(size * 0.26, size * 0.38)
      ctx.quadraticCurveTo(size * 0.28, size * 0.08, size * 0.15, -size * 0.12)
      ctx.quadraticCurveTo(0, -size * 0.16, -size * 0.15, -size * 0.12)
    } else {
      ctx.moveTo(-size * 0.15, -size * 0.12)
      ctx.quadraticCurveTo(-size * 0.3, size * 0.1, -size * 0.27, size * 0.4)
      ctx.quadraticCurveTo(0, size * 0.44, size * 0.27, size * 0.4)
      ctx.quadraticCurveTo(size * 0.3, size * 0.1, size * 0.15, -size * 0.12)
      ctx.quadraticCurveTo(0, -size * 0.16, -size * 0.15, -size * 0.12)
    }
    const rg = ctx.createLinearGradient(-size * 0.25, -size * 0.12, size * 0.25, size * 0.4)
    rg.addColorStop(0, lite)
    rg.addColorStop(0.45, mid)
    rg.addColorStop(1, dark)
    ctx.fillStyle = rg
    ctx.fill()
    ctx.strokeStyle = this._hexToRgba('#000000', 0.18)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-size * 0.06, -size * 0.08)
    ctx.quadraticCurveTo(-size * 0.12, size * 0.12, -size * 0.1, size * 0.34)
    ctx.moveTo(size * 0.05, -size * 0.06)
    ctx.quadraticCurveTo(size * 0.12, size * 0.14, size * 0.09, size * 0.34)
    ctx.stroke()
    ctx.strokeStyle = accent
    ctx.lineWidth = Math.max(1.4, size * 0.02)
    ctx.globalAlpha = 0.85
    ctx.beginPath()
    ctx.moveTo(-size * 0.02, -size * 0.12)
    ctx.lineTo(-size * 0.1, size * 0.08)
    ctx.moveTo(size * 0.02, -size * 0.12)
    ctx.lineTo(size * 0.1, size * 0.08)
    ctx.stroke()
    ctx.globalAlpha = 0.95
    ctx.fillStyle = this._mixHex(accent, dark, 0.35)
    ctx.beginPath()
    ctx.ellipse(0, size * 0.08, size * 0.15, size * 0.028, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = accent
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(-size * 0.14, size * 0.08)
    ctx.lineTo(size * 0.14, size * 0.08)
    ctx.stroke()
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.arc(size * 0.12, size * 0.1, size * 0.028, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.55
    ctx.fillStyle = accent
    ctx.font = 'bold ' + Math.max(8, Math.floor(size * 0.13)) + 'px "KaiTi","STKaiti",serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(look.mark || '修', 0, size * 0.0)
    ctx.globalAlpha = 1
    // 迈步：前后脚错位 + 抬膝
    const lx = walkSwing * size * 0.055
    const ly = Math.max(0, -walkSwing) * size * 0.03
    const rx = -walkSwing * size * 0.055
    const ry = Math.max(0, walkSwing) * size * 0.03
    ctx.fillStyle = dark
    ctx.beginPath()
    ctx.ellipse(-size * 0.07 + lx, size * 0.36 - ly, size * 0.045, size * 0.07, 0.15, 0, Math.PI * 2)
    ctx.ellipse(size * 0.07 + rx, size * 0.36 - ry, size * 0.045, size * 0.07, -0.15, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = this._mixHex(dark, '#000', 0.3)
    ctx.beginPath()
    ctx.ellipse(-size * 0.07 + lx, size * 0.42 - ly, size * 0.055, size * 0.025, 0, 0, Math.PI * 2)
    ctx.ellipse(size * 0.07 + rx, size * 0.42 - ry, size * 0.055, size * 0.025, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  },

  /** 袖臂与手：按姿态角摆动，右臂可挂武器 */
  _paintCultivatorArms(ctx, look, size, pose, withWeapon) {
    const mid = look.robeCol
    const dark = look.lining || this._mixHex(mid, '#000', 0.4)
    const skin = look.skin
    const armR = (pose && pose.armR != null) ? pose.armR : 0.5
    const armL = (pose && pose.armL != null) ? pose.armL : -0.4
    const lean = (pose && pose.lean) || 0
    ctx.save()
    ctx.rotate(lean)
    ctx.translate(0, -((pose && pose.raise) || 0) * size)
    // 左臂（辅手，先画在身后）
    this._paintOneCultivatorArm(ctx, -1, armL, size, mid, dark, skin, look.accent)
    // 右臂 + 武器
    ctx.save()
    ctx.translate(size * 0.16, -size * 0.02)
    ctx.rotate(armR)
    const sg = ctx.createLinearGradient(0, -size * 0.05, 0, size * 0.22)
    sg.addColorStop(0, this._mixHex(mid, '#fff', 0.15))
    sg.addColorStop(1, dark)
    ctx.fillStyle = sg
    ctx.beginPath()
    ctx.moveTo(-size * 0.05, -size * 0.02)
    ctx.quadraticCurveTo(-size * 0.09, size * 0.1, -size * 0.07, size * 0.2)
    ctx.quadraticCurveTo(0, size * 0.24, size * 0.07, size * 0.2)
    ctx.quadraticCurveTo(size * 0.09, size * 0.1, size * 0.05, -size * 0.02)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = this._hexToRgba(look.accent, 0.35)
    ctx.beginPath()
    ctx.ellipse(0, size * 0.2, size * 0.06, size * 0.025, 0, 0, Math.PI * 2)
    ctx.fill()
    if (withWeapon) {
      ctx.save()
      ctx.translate(0, size * 0.22)
      ctx.rotate((pose && pose.weaponAng) || -0.85)
      this._paintCultivatorWeapon(ctx, look, size, pose)
      ctx.restore()
    }
    ctx.fillStyle = skin
    ctx.beginPath()
    ctx.ellipse(0, size * 0.24, size * 0.035, size * 0.04, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.restore()
  },

  _paintOneCultivatorArm(ctx, side, ang, size, mid, dark, skin, accent) {
    ctx.save()
    ctx.translate(side * size * 0.16, -size * 0.02)
    ctx.rotate(ang)
    const sg = ctx.createLinearGradient(0, -size * 0.05, 0, size * 0.22)
    sg.addColorStop(0, this._mixHex(mid, '#fff', 0.15))
    sg.addColorStop(1, dark)
    ctx.fillStyle = sg
    ctx.beginPath()
    ctx.moveTo(-size * 0.05, -size * 0.02)
    ctx.quadraticCurveTo(-size * 0.09, size * 0.1, -size * 0.07, size * 0.2)
    ctx.quadraticCurveTo(0, size * 0.24, size * 0.07, size * 0.2)
    ctx.quadraticCurveTo(size * 0.09, size * 0.1, size * 0.05, -size * 0.02)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = this._hexToRgba(accent, 0.35)
    ctx.beginPath()
    ctx.ellipse(0, size * 0.2, size * 0.06, size * 0.025, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = skin
    ctx.beginPath()
    ctx.ellipse(0, size * 0.24, size * 0.035, size * 0.04, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  },

  /** 武器本体（本地：握点在原点，刃向 +y） */
  _paintCultivatorWeapon(ctx, look, size, pose) {
    const w = look.weapon || 'blade'
    const accent = look.accent
    const metal = this._mixHex(accent, '#e2e8f0', 0.45)
    const dark = this._mixHex(look.lining || '#111', '#334155', 0.3)
    const glowA = (pose && (pose.mode === 'attack' || pose.mode === 'dash')) ? (0.35 + (pose.swing || 0) * 0.4) : 0.18
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (w === 'claw') {
      ctx.strokeStyle = accent
      ctx.lineWidth = Math.max(1.6, size * 0.02)
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath()
        ctx.moveTo(i * size * 0.03, 0)
        ctx.quadraticCurveTo(i * size * 0.05, size * 0.12, i * size * 0.02, size * 0.22)
        ctx.stroke()
      }
      ctx.restore()
      return
    }
    if (w === 'needle') {
      ctx.strokeStyle = accent
      ctx.lineWidth = 1.4
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath()
        ctx.moveTo(i * size * 0.035, -size * 0.02)
        ctx.lineTo(i * size * 0.02, size * 0.28)
        ctx.stroke()
      }
      ctx.restore()
      return
    }
    if (w === 'fan') {
      ctx.fillStyle = this._hexToRgba(accent, 0.45)
      ctx.strokeStyle = metal
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, size * 0.22, -0.9, 0.9)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.sin(i * 0.35) * size * 0.2, Math.cos(i * 0.35) * size * 0.2)
        ctx.stroke()
      }
      ctx.restore()
      return
    }
    if (w === 'staff') {
      ctx.strokeStyle = dark
      ctx.lineWidth = Math.max(2.5, size * 0.035)
      ctx.beginPath()
      ctx.moveTo(0, -size * 0.08)
      ctx.lineTo(0, size * 0.38)
      ctx.stroke()
      ctx.fillStyle = accent
      ctx.beginPath()
      ctx.arc(0, -size * 0.1, size * 0.045, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = glowA
      ctx.beginPath()
      ctx.arc(0, -size * 0.1, size * 0.08, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }
    if (w === 'ruler') {
      ctx.fillStyle = this._mixHex(look.robeCol, '#fff', 0.2)
      ctx.fillRect(-size * 0.025, -size * 0.05, size * 0.05, size * 0.34)
      ctx.strokeStyle = accent
      ctx.lineWidth = 1
      for (let i = 0; i < 4; i++) {
        const y = size * (0.02 + i * 0.06)
        ctx.beginPath()
        ctx.moveTo(-size * 0.02, y)
        ctx.lineTo(size * 0.02, y)
        ctx.stroke()
      }
      ctx.restore()
      return
    }
    if (w === 'axe') {
      ctx.strokeStyle = dark
      ctx.lineWidth = Math.max(2.2, size * 0.03)
      ctx.beginPath()
      ctx.moveTo(0, -size * 0.02)
      ctx.lineTo(0, size * 0.28)
      ctx.stroke()
      ctx.fillStyle = metal
      ctx.beginPath()
      ctx.moveTo(0, size * 0.02)
      ctx.quadraticCurveTo(size * 0.18, size * 0.08, size * 0.02, size * 0.18)
      ctx.quadraticCurveTo(size * 0.05, size * 0.1, 0, size * 0.02)
      ctx.fill()
      ctx.strokeStyle = accent
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.restore()
      return
    }
    if (w === 'spear') {
      ctx.strokeStyle = dark
      ctx.lineWidth = Math.max(2, size * 0.028)
      ctx.beginPath()
      ctx.moveTo(0, -size * 0.06)
      ctx.lineTo(0, size * 0.36)
      ctx.stroke()
      ctx.fillStyle = metal
      ctx.beginPath()
      ctx.moveTo(0, -size * 0.18)
      ctx.lineTo(-size * 0.04, -size * 0.04)
      ctx.lineTo(size * 0.04, -size * 0.04)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = accent
      ctx.globalAlpha = glowA + 0.3
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(-size * 0.03, -size * 0.1)
      ctx.lineTo(0, -size * 0.2)
      ctx.lineTo(size * 0.03, -size * 0.1)
      ctx.stroke()
      ctx.restore()
      return
    }
    // blade / voidblade / demonblade
    const tip = (w === 'voidblade') ? size * 0.36 : size * 0.32
    ctx.strokeStyle = dark
    ctx.lineWidth = Math.max(2, size * 0.025)
    ctx.beginPath()
    ctx.moveTo(0, -size * 0.04)
    ctx.lineTo(0, size * 0.08)
    ctx.stroke()
    const blade = ctx.createLinearGradient(0, size * 0.06, 0, tip)
    blade.addColorStop(0, metal)
    blade.addColorStop(1, accent)
    ctx.fillStyle = blade
    ctx.beginPath()
    ctx.moveTo(-size * 0.035, size * 0.06)
    ctx.lineTo(0, tip)
    ctx.lineTo(size * 0.035, size * 0.06)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = this._hexToRgba('#fff', 0.45)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, size * 0.08)
    ctx.lineTo(0, tip * 0.9)
    ctx.stroke()
    if (w === 'demonblade' || w === 'voidblade') {
      ctx.globalAlpha = glowA
      ctx.strokeStyle = accent
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-size * 0.02, size * 0.1)
      ctx.lineTo(0, tip)
      ctx.lineTo(size * 0.02, size * 0.1)
      ctx.stroke()
    }
    ctx.restore()
  },

  /** 境界专属装饰 */
  _paintCultivatorOrnament(ctx, style, look, size, t) {
    ctx.save()
    ctx.strokeStyle = look.accent
    ctx.fillStyle = look.accent
    ctx.lineWidth = Math.max(1.2, size * 0.015)
    ctx.globalAlpha = 0.72
    if (style === 'voidbeast' || style === 'chaos') {
      ctx.beginPath()
      ctx.ellipse(0, size * 0.05, size * 0.3, size * 0.1, t * 0.4, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 0.35
      ctx.beginPath()
      ctx.ellipse(0, size * 0.05, size * 0.22, size * 0.06, -t * 0.5, 0, Math.PI * 2)
      ctx.stroke()
    } else if (style === 'leibeast') {
      ctx.beginPath()
      ctx.moveTo(-size * 0.08, -size * 0.5)
      ctx.lineTo(-size * 0.02, -size * 0.62)
      ctx.lineTo(size * 0.02, -size * 0.52)
      ctx.lineTo(size * 0.08, -size * 0.64)
      ctx.stroke()
    } else if (style === 'timeprison') {
      ctx.beginPath()
      ctx.arc(size * 0.22, -size * 0.05, size * 0.08, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(size * 0.22, -size * 0.05)
      ctx.lineTo(size * 0.22 + Math.cos(t) * size * 0.05, -size * 0.05 + Math.sin(t) * size * 0.05)
      ctx.stroke()
    } else if (style === 'sanshi') {
      ctx.globalAlpha = 0.22
      ctx.fillStyle = look.robeCol
      ctx.beginPath()
      ctx.ellipse(-size * 0.22, -size * 0.02, size * 0.1, size * 0.16, -0.2, 0, Math.PI * 2)
      ctx.ellipse(size * 0.22, -size * 0.02, size * 0.1, size * 0.16, 0.2, 0, Math.PI * 2)
      ctx.fill()
    } else if (style === 'mutate') {
      for (let side = -1; side <= 1; side += 2) {
        ctx.beginPath()
        ctx.arc(side * size * 0.2, -size * 0.18, size * 0.05, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 0.4
        ctx.beginPath()
        ctx.arc(side * size * 0.2, -size * 0.18, size * 0.02, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 0.72
      }
    } else if (style === 'overlord') {
      ctx.beginPath()
      ctx.moveTo(-size * 0.2, -size * 0.08)
      ctx.lineTo(-size * 0.3, size * 0.02)
      ctx.lineTo(-size * 0.2, size * 0.05)
      ctx.moveTo(size * 0.2, -size * 0.08)
      ctx.lineTo(size * 0.3, size * 0.02)
      ctx.lineTo(size * 0.2, size * 0.05)
      ctx.stroke()
    } else if (style === 'sha' || style === 'demon') {
      ctx.globalAlpha = 0.4
      ctx.beginPath()
      ctx.moveTo(-size * 0.12, -size * 0.4)
      ctx.quadraticCurveTo(-size * 0.2, -size * 0.55, -size * 0.05, -size * 0.58)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(size * 0.12, -size * 0.4)
      ctx.quadraticCurveTo(size * 0.2, -size * 0.55, size * 0.05, -size * 0.58)
      ctx.stroke()
    } else if (style === 'tianmo') {
      ctx.fillStyle = this._hexToRgba(look.accent, 0.5)
      ctx.beginPath()
      ctx.arc(0, size * 0.0, size * 0.04, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  },

  /**
   * 步伐扬尘 / 攻击刀光 / 格挡盾弧 / 冲刺残影（角色本地坐标）
   */
  _paintCultivatorPoseFx(ctx, z, look, size, pose) {
    if (!pose) return
    const accent = look.accent
    const mode = pose.mode
    ctx.save()
    if (mode === 'walk') {
      const dust = Math.max(0, Math.sin(pose.walkPhase) )
      if (dust > 0.55) {
        const side = Math.sin(pose.walkPhase) > 0 ? 1 : -1
        ctx.globalAlpha = (dust - 0.55) * 0.7
        ctx.fillStyle = this._hexToRgba(accent, 0.35)
        ctx.beginPath()
        ctx.ellipse(side * size * 0.1, size * 0.42, size * 0.08 * dust, size * 0.03, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(148,163,184,0.35)'
        for (let i = 0; i < 3; i++) {
          ctx.beginPath()
          ctx.arc(side * size * (0.12 + i * 0.04), size * 0.4 - i * 2, 1.5 + i * 0.4, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    } else if (mode === 'attack') {
      const u = pose.atkU
      const fade = Math.sin(u * Math.PI)
      ctx.globalAlpha = 0.55 * fade
      ctx.strokeStyle = accent
      ctx.lineWidth = Math.max(2, size * 0.03)
      ctx.lineCap = 'round'
      const a0 = -1.4 + u * 2.4
      ctx.beginPath()
      ctx.arc(size * 0.05, -size * 0.02, size * 0.34, a0, a0 + 0.9)
      ctx.stroke()
      ctx.globalAlpha = 0.28 * fade
      ctx.fillStyle = this._hexToRgba(accent, 0.5)
      ctx.beginPath()
      ctx.moveTo(size * 0.05, -size * 0.02)
      ctx.arc(size * 0.05, -size * 0.02, size * 0.34, a0, a0 + 0.9)
      ctx.closePath()
      ctx.fill()
      // 武器尾迹点
      ctx.globalAlpha = 0.45 * fade
      ctx.fillStyle = accent
      for (let i = 0; i < 4; i++) {
        const a = a0 + i * 0.2
        ctx.beginPath()
        ctx.arc(size * 0.05 + Math.cos(a) * size * 0.34, -size * 0.02 + Math.sin(a) * size * 0.34, 2 + (1 - i / 4) * 2, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (mode === 'dash') {
      ctx.strokeStyle = accent
      ctx.lineWidth = 3
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.35 - i * 0.1
        ctx.beginPath()
        ctx.moveTo(-size * (0.2 + i * 0.12), -size * 0.05 + i * 2)
        ctx.lineTo(-size * 0.05, size * 0.05)
        ctx.stroke()
      }
      ctx.globalAlpha = 0.3
      ctx.fillStyle = this._hexToRgba(accent, 0.4)
      ctx.beginPath()
      ctx.ellipse(-size * 0.15, size * 0.2, size * 0.22, size * 0.08, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (mode === 'block') {
      const col = z.crescentColor || accent
      const glow = z.crescentGlow || look.accent
      const shape = z.gBlock || 'moon'
      ctx.globalAlpha = 0.55 + pose.blockU * 0.25
      ctx.strokeStyle = col
      ctx.fillStyle = this._hexToRgba(glow, 0.25)
      ctx.lineWidth = 2.6
      if (shape === 'jindan' || shape === 'lei' || shape === 'ring') {
        ctx.beginPath()
        ctx.arc(size * 0.18, 0, size * 0.28, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 0.3
        ctx.beginPath()
        ctx.arc(size * 0.18, 0, size * 0.2, 0, Math.PI * 2)
        ctx.fill()
      } else if (shape === 'void' || shape === 'dao' || shape === 'time' || shape === 'rift') {
        ctx.beginPath()
        ctx.moveTo(size * 0.05, -size * 0.28)
        ctx.quadraticCurveTo(size * 0.38, 0, size * 0.05, size * 0.28)
        ctx.quadraticCurveTo(size * 0.22, 0, size * 0.05, -size * 0.28)
        ctx.stroke()
        ctx.fill()
      } else if (shape === 'tri') {
        for (let i = 0; i < 3; i++) {
          const a = -0.8 + i * 0.8
          ctx.beginPath()
          ctx.arc(size * 0.16, 0, size * 0.26, a - 0.35, a + 0.35)
          ctx.stroke()
        }
      } else {
        // moon / bone / puppet → 月牙盾
        ctx.beginPath()
        ctx.arc(size * 0.14, 0, size * 0.34, -1.2, 1.2)
        ctx.stroke()
        ctx.globalAlpha = 0.35
        ctx.beginPath()
        ctx.arc(size * 0.14, 0, size * 0.34, -1.0, 1.0)
        ctx.arc(size * 0.02, 0, size * 0.22, 1.0, -1.0, true)
        ctx.closePath()
        ctx.fill()
      }
      // 格挡火花
      ctx.globalAlpha = 0.55
      ctx.fillStyle = glow
      for (let i = 0; i < 5; i++) {
        const a = -0.9 + i * 0.45
        ctx.beginPath()
        ctx.arc(size * 0.14 + Math.cos(a) * size * 0.3, Math.sin(a) * size * 0.28, 1.8, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  },

  /**
   * 元婴后敌修：分层绘制的人形修士（非主角贴图）
   * 横向压窄 + 略拔高，更接近修长仙修体型
   */
  _drawProceduralCreature(ctx, z, drawX, drawY, size, faceLeft, flashOnly) {
    const tint = z.tint || z.crescentColor || '#67e8f9'
    const glow = z.crescentGlow || z.glow || tint
    const style = z.gDraw || 'sha'
    const look = this._getEnemyCultivatorLook(style, tint, glow)
    const t = this._animT || 0
    const seed = z.id || 0
    const pose = this._resolveCultivatorPose(z)
    const bob = (Math.sin(t * 3 + seed) * size * 0.008) + (pose.bob || 0) * size
    // 绘制高度略上移，脚底仍落在落点附近
    const slimX = 0.62
    const slimY = 1.12
    ctx.save()
    ctx.translate(drawX, drawY + bob + size * 0.04)
    if (faceLeft) ctx.scale(-slimX, slimY)
    else ctx.scale(slimX, slimY)

    this._paintCultivatorAura(ctx, size, look.accent, t, seed)
    ctx.save()
    ctx.globalAlpha = 0.18
    const mist = ctx.createRadialGradient(0, 0, size * 0.05, 0, 0, size * 0.4)
    mist.addColorStop(0, this._hexToRgba(look.accent, 0.4))
    mist.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = mist
    ctx.beginPath()
    ctx.ellipse(0, 0, size * 0.26, size * 0.4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    if (pose.mode === 'dash') this._paintCultivatorPoseFx(ctx, z, look, size, pose)

    this._paintCultivatorHair(ctx, look, size, t)
    this._paintCultivatorRobe(ctx, look, size, pose)
    this._paintCultivatorArms(ctx, look, size, pose, true)
    this._paintCultivatorHead(ctx, look, size, t, seed)
    if (look.hair !== 'hood') {
      ctx.fillStyle = look.hairCol
      ctx.beginPath()
      ctx.ellipse(0, -size * 0.34, size * 0.12, size * 0.05, 0, Math.PI, Math.PI * 2)
      ctx.fill()
    }
    this._paintCultivatorOrnament(ctx, style, look, size, t)

    if (pose.mode !== 'dash') this._paintCultivatorPoseFx(ctx, z, look, size, pose)

    if (flashOnly) {
      ctx.globalAlpha = 0.28
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.ellipse(0, 0, size * 0.18, size * 0.36, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  },

  /**
   * 境主形象叠绘：按大境界说明区分（腐气/傀儡线/金丹光环/虚空裂/雷纹等）
   * 不改原贴图资源，仅在其上叠加可辨识特征
   */
  _drawGuardianStyle(ctx, z, drawX, drawY, size, faceLeft) {
    const style = z.gDraw || ''
    const t = this._animT || 0
    ctx.save()
    ctx.translate(drawX, drawY)
    if (faceLeft) ctx.scale(-1, 1)
    ctx.globalAlpha = 0.85
    if (style === 'rotking') {
      // 腐尸王：头顶腐气 + 骨刺
      ctx.fillStyle = 'rgba(74,222,128,0.35)'
      for (let i = 0; i < 5; i++) {
        const a = t * 2 + i * 1.2
        ctx.beginPath()
        ctx.ellipse(Math.cos(a) * 10, -size * 0.38 + Math.sin(a) * 4, 5, 9, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.strokeStyle = '#a3e635'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-8, -size * 0.2)
      ctx.lineTo(-14, -size * 0.42)
      ctx.moveTo(8, -size * 0.18)
      ctx.lineTo(12, -size * 0.4)
      ctx.stroke()
    } else if (style === 'puppet') {
      // 傀儡：关节线 + 牵丝
      ctx.strokeStyle = 'rgba(125,211,252,0.85)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, -size * 0.55)
      ctx.lineTo(0, -size * 0.28)
      ctx.moveTo(-12, -size * 0.1)
      ctx.lineTo(-18, size * 0.05)
      ctx.moveTo(12, -size * 0.1)
      ctx.lineTo(18, size * 0.05)
      ctx.stroke()
      ctx.fillStyle = '#38bdf8'
      ctx.beginPath()
      ctx.arc(0, -size * 0.55, 3, 0, Math.PI * 2)
      ctx.fill()
    } else if (style === 'jindan') {
      // 金丹尸煞：腹前金丹光球
      const pulse = 0.7 + Math.sin(t * 6) * 0.15
      ctx.fillStyle = 'rgba(251,191,36,0.55)'
      ctx.beginPath()
      ctx.arc(0, size * 0.02, 9 * pulse, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#fde68a'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, size * 0.02, 14 + Math.sin(t * 4) * 2, 0, Math.PI * 2)
      ctx.stroke()
    } else if (style === 'demon' || style === 'sanshi' || style === 'overlord') {
      ctx.strokeStyle = z.crescentGlow || '#a78bfa'
      ctx.lineWidth = 2
      for (let i = 0; i < (style === 'sanshi' ? 3 : 2); i++) {
        const a = t * 1.5 + i * 2.1
        ctx.beginPath()
        ctx.arc(Math.cos(a) * size * 0.22, -size * 0.05 + Math.sin(a) * 6, 10, -0.8, 0.8)
        ctx.stroke()
      }
    } else if (style === 'voidbeast' || style === 'chaos' || style === 'timeprison') {
      ctx.strokeStyle = style === 'timeprison' ? '#fdba74' : '#67e8f9'
      ctx.lineWidth = 1.8
      ctx.globalAlpha = 0.7
      for (let i = 0; i < 3; i++) {
        const r = size * (0.2 + i * 0.12) + Math.sin(t * 5 + i) * 3
        ctx.beginPath()
        ctx.ellipse(0, 0, r, r * 0.45, t + i, 0, Math.PI * 2)
        ctx.stroke()
      }
      if (style === 'chaos') {
        ctx.fillStyle = 'rgba(255,247,237,0.25)'
        ctx.beginPath()
        ctx.arc(0, 0, size * 0.18, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (style === 'sha' || style === 'tianmo') {
      ctx.fillStyle = 'rgba(34,211,238,0.25)'
      for (let i = 0; i < 6; i++) {
        const a = t * 2.5 + i
        ctx.beginPath()
        ctx.ellipse(Math.cos(a) * 16, Math.sin(a) * 10, 4, 10, a, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (style === 'leibeast') {
      ctx.strokeStyle = '#fef08a'
      ctx.lineWidth = 1.6
      for (let i = 0; i < 4; i++) {
        const x0 = (i - 1.5) * 8
        ctx.beginPath()
        ctx.moveTo(x0, -size * 0.45)
        ctx.lineTo(x0 + 4, -size * 0.2)
        ctx.lineTo(x0 - 2, size * 0.05)
        ctx.stroke()
      }
    } else if (style === 'mutate') {
      ctx.strokeStyle = '#e9d5ff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, -size * 0.15, size * 0.28 + Math.sin(t * 8) * 3, 0, Math.PI * 2)
      ctx.stroke()
    }
    // 抵挡态：身前挡招盾形
    if ((z.blockCd || 0) > (z.blockCdMax || 0.4) * 0.55) {
      ctx.globalAlpha = 0.75
      ctx.strokeStyle = z.crescentColor || '#fde68a'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(size * 0.15, 0, size * 0.32, -1.1, 1.1)
      ctx.stroke()
    }
    ctx.restore()
  },

  _drawDemonCrescents(ctx) {
    const list = this._demonCrescents || []
    for (let i = 0; i < list.length; i++) {
      const c = list[i]
      ctx.save()
      ctx.translate(c.x, c.y)
      ctx.rotate(c.ang || 0)
      const alpha = c.mode === 'block' ? 0.9 : Math.min(1, c.life)
      ctx.globalAlpha = 0.85 * alpha
      ctx.fillStyle = c.color || (c.mode === 'block' ? '#7c3aed' : '#4c1d95')
      ctx.strokeStyle = c.glow || '#c4b5fd'
      ctx.lineWidth = 1.5
      const shape = c.blockShape || 'crescent'
      if (c.mode === 'block' && shape === 'ring') {
        ctx.beginPath()
        ctx.arc(0, 0, c.r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 0.35 * alpha
        ctx.beginPath()
        ctx.arc(0, 0, c.r * 0.55, 0, Math.PI * 2)
        ctx.fill()
      } else if (c.mode === 'block' && shape === 'rift') {
        ctx.beginPath()
        ctx.moveTo(-c.r * 0.2, -c.r)
        ctx.lineTo(c.r * 0.15, 0)
        ctx.lineTo(-c.r * 0.2, c.r)
        ctx.lineTo(c.r * 0.35, 0)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      } else if (c.mode === 'block' && shape === 'arc') {
        ctx.beginPath()
        ctx.arc(0, 0, c.r, -1.2, 1.2)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(0, 0, c.r * 0.7, -1.0, 1.0)
        ctx.stroke()
      } else if (c.mode === 'block' && shape === 'triple') {
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath()
          ctx.arc(k * 6, k * 2, c.r * 0.7, -0.9, 0.9)
          ctx.arc(k * 6 + 5, k * 2, c.r * 0.5, 0.9, -0.9, true)
          ctx.closePath()
          ctx.fill()
        }
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, c.r, -0.9, 0.9)
        ctx.arc(6, 0, c.r * 0.72, 0.9, -0.9, true)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.globalAlpha = 0.35 * alpha
        ctx.fillStyle = '#000'
        ctx.beginPath()
        ctx.arc(-2, 0, c.r * 0.9, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
  },

  _gengTip(s) {
    return {
      x: s.x + Math.cos(s.tipAngle) * 11,
      y: s.y + Math.sin(s.tipAngle) * 11
    }
  },

  /** 金黄雷电包裹的庚金剑 */
  _paintGengSword(ctx, scale) {
    const sc = scale || 1
    ctx.save()
    ctx.scale(sc, sc)
    // 外层雷电辉光
    ctx.globalAlpha = 0.35 + Math.sin((this._animT || 0) * 18) * 0.12
    ctx.strokeStyle = '#fef08a'
    ctx.lineWidth = 3.2
    ctx.beginPath()
    ctx.moveTo(-10, 0)
    ctx.lineTo(20, 0)
    ctx.stroke()
    ctx.globalAlpha = 0.55
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(-8, -3)
    ctx.lineTo(4, 2)
    ctx.lineTo(14, -2)
    ctx.lineTo(22, 0)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-8, 3)
    ctx.lineTo(5, -1.5)
    ctx.lineTo(12, 2.5)
    ctx.lineTo(22, 0)
    ctx.stroke()
    ctx.restore()
    this._paintInkSword(ctx, '#fbbf24', scale)
    // 刃心高光
    ctx.save()
    ctx.scale(sc, sc)
    ctx.globalAlpha = 0.7
    ctx.strokeStyle = '#fffbeb'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-6, 0)
    ctx.lineTo(18, 0)
    ctx.stroke()
    ctx.restore()
  },

  /** 剑尖金黄雷电细丝，穿过僵尸连接到对侧剑尖 */
  _drawGengFilaments(ctx, fx, fade) {
    const zombies = this._zombies || []
    const t = this._animT || 0
    const links = fx.links || []
    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      const sa = fx.swords[link.a]
      const sb = fx.swords[link.b]
      if (!sa || !sb) continue
      const tipA = this._gengTip(sa)
      const tipB = this._gengTip(sb)
      // 选落在弦附近的僵尸作为穿点
      const mids = []
      for (let zi = 0; zi < zombies.length; zi++) {
        const z = zombies[zi]
        if (z.state === 'dead') continue
        const d = this._pointSegDist(z.x, z.y, tipA.x, tipA.y, tipB.x, tipB.y)
        if (d < fx.radius * 0.42) {
          mids.push({ x: z.x, y: z.y, id: z.id })
        }
      }
      mids.sort((p, q) => {
        const da = (p.x - tipA.x) * (p.x - tipA.x) + (p.y - tipA.y) * (p.y - tipA.y)
        const db = (q.x - tipA.x) * (q.x - tipA.x) + (q.y - tipA.y) * (q.y - tipA.y)
        return da - db
      })
      const pts = [tipA].concat(mids.slice(0, 3)).concat([tipB])

      ctx.globalAlpha = (0.55 + Math.sin(t * 22 + i) * 0.25) * fade
      ctx.strokeStyle = '#fef08a'
      ctx.lineWidth = 1.6
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      this._strokeJaggedPolyline(ctx, pts, t * 16 + i * 2.1, 5)

      ctx.globalAlpha = (0.35 + Math.sin(t * 18 + i * 0.7) * 0.15) * fade
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 0.9
      this._strokeJaggedPolyline(ctx, pts, t * 20 + i * 3.3, 7)
    }
  },

  _pointSegDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1
    const dy = y2 - y1
    const len2 = dx * dx + dy * dy || 1
    let u = ((px - x1) * dx + (py - y1) * dy) / len2
    u = Math.max(0, Math.min(1, u))
    const sx = x1 + u * dx
    const sy = y1 + u * dy
    return Math.sqrt((px - sx) * (px - sx) + (py - sy) * (py - sy))
  },

  /** 折线雷丝：在相邻点之间插入抖动折点 */
  _strokeJaggedPolyline(ctx, pts, seed, jag) {
    if (!pts || pts.length < 2) return
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      const steps = 4
      for (let s = 1; s <= steps; s++) {
        const u = s / steps
        const x = a.x + (b.x - a.x) * u
        const y = a.y + (b.y - a.y) * u
        const nx = -(b.y - a.y)
        const ny = b.x - a.x
        const nl = Math.sqrt(nx * nx + ny * ny) || 1
        const amp = (s === steps ? 0 : Math.sin(seed + i * 4 + s * 2.7) * jag)
        ctx.lineTo(x + (nx / nl) * amp, y + (ny / nl) * amp)
      }
    }
    ctx.stroke()
  },

  /** 环剑画在人物正后方：多层扁椭圆；剑柄朝内、剑尖朝外 */
  _drawOrbitSwords(ctx, realm) {
    const owned = Math.max(1, Math.min(MAX_SWORD_COUNT, this._swordCount || 1))
    const inFlight = (this._swords || []).length
    const n = Math.max(0, owned - Math.min(owned, inFlight))
    if (n <= 0) return

    const sw = getRealmSwordStyle(realm.majorKey || 'lianqi')
    const cx = this._playerX
    const cy = this._playerY - 14
    const color = sw.color || realm.sword || realm.color || '#334155'
    const style = sw.style || 'ink'
    // 多层剑环：剑多时 1→2→3 圈
    const layers = n <= 12 ? 1 : (n <= 28 ? 2 : 3)
    const baseSpin = (this._animT || 0) * 1.05
    let drawn = 0
    for (let layer = 0; layer < layers; layer++) {
      const remain = n - drawn
      const layersLeft = layers - layer
      const count = Math.ceil(remain / layersLeft)
      const rx = 18 + layer * 12
      const ry = 10 + layer * 7
      const spin = baseSpin * (layer % 2 === 0 ? 1 : -0.85) + layer * 0.55
      const scale = Math.max(0.26, 0.36 - layer * 0.04)
      const alpha = 0.82 - layer * 0.12
      for (let i = 0; i < count; i++) {
        const a = spin + (Math.PI * 2 * i) / count
        const x = cx + Math.cos(a) * rx
        const y = cy + Math.sin(a) * ry - 2
        ctx.save()
        ctx.translate(x, y)
        // 剑绘制尖端朝 +X：沿径向旋转 → 柄朝圆心、尖朝外
        ctx.rotate(a)
        ctx.globalAlpha = alpha
        this._paintInkSword(ctx, color, scale, style)
        ctx.restore()
      }
      drawn += count
    }
  },

  /** 道祖大圆满水墨字 */
  _drawPerfect(ctx) {
    const fx = this._perfectFx
    const w = this._w
    const h = this._h
    const cx = w * 0.5
    const cy = h * 0.38
    const flown = !fx || fx.t >= (fx.flyDur || 0)
    const fade = fx ? Math.min(1, Math.max(0, (fx.t - fx.flyDur * 0.55) / 0.6)) : 1
    ctx.save()
    ctx.globalAlpha = 0.25 + fade * 0.35
    ctx.fillStyle = 'rgba(250, 245, 230, 0.5)'
    ctx.fillRect(0, 0, w, h)
    if (flown || fade > 0.2) {
      ctx.globalAlpha = fade
      const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, Math.min(w, h) * 0.28)
      g.addColorStop(0, 'rgba(20,20,20,0.28)')
      g.addColorStop(1, 'rgba(20,20,20,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(cx, cy, w * 0.34, h * 0.12, 0, 0, Math.PI * 2)
      ctx.fill()
      this._drawBrushInkText(ctx, '大圆满', cx, cy, 56)
      ctx.textAlign = 'center'
      ctx.font = '14px sans-serif'
      ctx.fillStyle = '#3f3f46'
      ctx.fillText('道祖 · 三千大道归一', cx, cy + 46)
    }
    ctx.restore()
  },

  /** 人物脚下境界名 */
  _drawRealmBadge(ctx, realm) {
    const x = this._playerX
    const y = this._playerY + 36
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.font = 'bold 13px sans-serif'
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillText(realm.name + '期', x + 1, y + 1)
    ctx.fillStyle = realm.color || '#e2e8f0'
    ctx.fillText(realm.name + '期', x, y)
    ctx.font = '10px sans-serif'
    ctx.fillStyle = 'rgba(226,232,240,0.75)'
    ctx.fillText(realm.tierName || '', x, y + 16)
    ctx.restore()
  },

  /**
   * 小境界升层：天地灵气漩涡灌入丹田
   */
  _drawQiVortex(ctx, fx) {
    const px = this._playerX
    const py = this._playerY + 10
    const u = Math.min(1, fx.t / Math.max(0.01, fx.dur))
    const spin = (this._animT || 0) * 6
    ctx.save()
    // 丹田核心光
    const core = ctx.createRadialGradient(px, py, 2, px, py, 28 + u * 16)
    core.addColorStop(0, 'rgba(165,243,252,0.85)')
    core.addColorStop(0.45, 'rgba(34,211,238,0.35)')
    core.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = 0.55 + Math.sin(spin) * 0.12
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(px, py, 36 + u * 10, 0, Math.PI * 2)
    ctx.fill()
    // 多层漩涡环
    for (let i = 0; i < 4; i++) {
      const rr = 22 + i * 18 + (1 - u) * 40
      ctx.globalAlpha = 0.55 - i * 0.1
      ctx.strokeStyle = i % 2 ? '#67e8f9' : '#a5f3fc'
      ctx.lineWidth = 2.2 - i * 0.3
      ctx.beginPath()
      ctx.ellipse(px, py, rr, rr * 0.42, spin * 0.35 + i * 0.7, 0, Math.PI * 2)
      ctx.stroke()
    }
    // 向丹田收敛的弧线
    ctx.globalAlpha = 0.7
    ctx.strokeStyle = '#e0f2fe'
    ctx.lineWidth = 1.4
    for (let i = 0; i < 8; i++) {
      const a = spin + i * (Math.PI / 4)
      const r0 = 70 + (1 - u) * 50
      ctx.beginPath()
      ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0 * 0.45)
      ctx.quadraticCurveTo(
        px + Math.cos(a + 0.6) * r0 * 0.55,
        py + Math.sin(a + 0.6) * r0 * 0.25,
        px,
        py
      )
      ctx.stroke()
    }
    ctx.globalAlpha = 0.9
    ctx.fillStyle = '#f0fdfa'
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('天地灵气 · 漩涡入丹', px, py - 52)
    if (fx.realm && fx.realm.name) {
      ctx.font = '11px sans-serif'
      ctx.fillStyle = '#67e8f9'
      ctx.fillText('→ ' + fx.realm.name, px, py - 34)
    }
    ctx.restore()
    // 粒子
    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i]
      ctx.globalAlpha = Math.max(0, p.life * 2.2)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.vortex ? 2.4 : 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  },

  /**
   * 突破前精神领域：目标境界配图显现 → 强化 → 化光入眉心
   * 人物隐藏，按境界使用对应突破立绘
   */
  _drawSpiritDomain(ctx, fx) {
    const w = this._w
    const h = this._h
    const px = this._playerX
    const py = this._playerY
    const t = fx.t
    const p1 = fx.sjDur
    const p2 = p1 + fx.sj02Dur
    const realm = fx.realm || realmByLv(this._realmLv)
    const imgRealm = this._realmFxImage(realm)
    const img1 = imgRealm || this._spiritSjImg
    const img2 = imgRealm || this._spiritSj02Img || this._spiritSjImg

    ctx.globalAlpha = 1

    // 全屏压暗（不用 globalAlpha，避免部分机型异常）
    const dimA = t < 0.25 ? (0.35 + t * 1.4) : (t < p2 ? 0.72 : Math.max(0.25, 0.72 - (t - p2) / fx.absorbDur * 0.45))
    ctx.fillStyle = 'rgba(12, 8, 4, ' + Math.min(0.78, dimA) + ')'
    ctx.fillRect(0, 0, w, h)

    /** 图片铺满画布（cover），保证一定看得见 */
    const drawCover = (img, alpha) => {
      if (!img || alpha <= 0.02) return false
      const iw = img.width || 480
      const ih = img.height || 720
      if (iw < 2 || ih < 2) return false
      const scale = Math.max(w / iw, h / ih)
      const dw = iw * scale
      const dh = ih * scale
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
      ctx.drawImage(img, (w - dw) * 0.5, (h - dh) * 0.5, dw, dh)
      ctx.restore()
      return true
    }

    /** 无图时的金色人形领域兜底，避免只剩 Toast */
    const drawFallbackDomain = (alpha, scale) => {
      if (alpha <= 0.02) return
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(px, py - 20)
      ctx.scale(scale, scale)
      // 外圈灵光
      const g = ctx.createRadialGradient(0, -40, 10, 0, -40, 120)
      g.addColorStop(0, 'rgba(253,230,138,0.85)')
      g.addColorStop(0.45, 'rgba(251,191,36,0.35)')
      g.addColorStop(1, 'rgba(251,191,36,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, -40, 120, 0, Math.PI * 2)
      ctx.fill()
      // 巨大人形剪影
      ctx.fillStyle = 'rgba(253, 224, 71, 0.55)'
      ctx.beginPath()
      ctx.ellipse(0, -95, 28, 36, 0, 0, Math.PI * 2) // 头
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(0, -35, 48, 55, 0, 0, Math.PI * 2) // 身
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,247,237,0.8)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(-55, -50)
      ctx.lineTo(-90, -10)
      ctx.moveTo(55, -50)
      ctx.lineTo(90, -10)
      ctx.stroke()
      ctx.restore()
    }

    if (t < p1) {
      const u = Math.min(1, t / p1)
      const ease = 1 - Math.pow(1 - u, 2)
      const ok = drawCover(img1, 0.2 + ease * 0.8)
      if (!ok) drawFallbackDomain(0.35 + ease * 0.55, 0.7 + ease * 0.55)
    } else if (t < p2) {
      const u = (t - p1) / fx.sj02Dur
      drawCover(img1, Math.max(0, 0.85 - u * 0.35))
      const ok2 = drawCover(img2, Math.min(1, 0.55 + u * 0.45))
      if (!ok2) drawFallbackDomain(0.75, 1.15)
      // 法阵环
      ctx.save()
      ctx.globalAlpha = 0.55
      ctx.strokeStyle = realm.color || '#fbbf24'
      ctx.lineWidth = 2
      for (let i = 0; i < 3; i++) {
        const rr = 56 + i * 32 + Math.sin((this._animT || 0) * 3 + i) * 5
        ctx.beginPath()
        ctx.arc(px, py - 12, rr, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
    } else {
      // 化光：白线自顶中落下 → 圆心收束成点 → 涟漪散开后结束升级界面
      const u = Math.min(1, (t - p2) / fx.absorbDur)
      const cx = w * 0.5
      const cy = h * 0.48
      const lv = Math.max(1, (realm && realm.lv) || (fx.nextLv || 2))
      // 境界越高中线越粗
      const lineW = 1.8 + Math.min(16, lv * 1.05)
      const ringR = 20 + Math.min(22, lv * 1.35)
      const fallEnd = 0.7

      const alpha = u < 0.55 ? 1 - u * 0.4 : Math.max(0, 1 - (u - 0.55) / 0.45)
      const ok = drawCover(img2, alpha * 0.75)
      if (!ok) drawFallbackDomain(alpha * 0.55, 1.05 * (1 - u * 0.65))

      // 目标圆环（始终在正中）
      ctx.save()
      ctx.globalAlpha = u < fallEnd ? (0.35 + u * 0.45) : Math.max(0.15, 1 - (u - fallEnd) / (1 - fallEnd))
      ctx.strokeStyle = 'rgba(255,251,235,0.85)'
      ctx.lineWidth = 2 + Math.min(2.5, lv * 0.12)
      ctx.beginPath()
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 0.2
      ctx.beginPath()
      ctx.arc(cx, cy, ringR * 0.55, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      if (u < fallEnd) {
        const fu = u / fallEnd
        // 缓入落下
        const ease = fu * fu * (3 - 2 * fu)
        const tipY = ease * cy
        // 尾迹逐渐变短变浅，末端只剩一点
        const trailLen = Math.max(0, (1 - ease * 0.96) * cy * 0.62)
        const topY = tipY - trailLen
        const tipR = Math.max(1.6, lineW * (0.55 - ease * 0.42))

        ctx.save()
        if (trailLen > 3) {
          const grad = ctx.createLinearGradient(cx, topY, cx, tipY)
          grad.addColorStop(0, 'rgba(255,255,255,0)')
          grad.addColorStop(0.35, 'rgba(255,251,235,' + (0.18 * (1 - ease)) + ')')
          grad.addColorStop(0.75, 'rgba(255,255,255,' + (0.55 * (1 - ease * 0.5)) + ')')
          grad.addColorStop(1, 'rgba(255,255,255,0.95)')
          ctx.strokeStyle = grad
          ctx.lineWidth = Math.max(1.2, lineW * (1 - ease * 0.72))
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(cx, topY)
          ctx.lineTo(cx, tipY)
          ctx.stroke()
        }
        // 落点：越来越接近「一个点」
        const g = ctx.createRadialGradient(cx, tipY, 0, cx, tipY, tipR * 2.2)
        g.addColorStop(0, '#ffffff')
        g.addColorStop(0.45, 'rgba(255,251,235,0.9)')
        g.addColorStop(1, 'rgba(255,251,235,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(cx, tipY, tipR * 2.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(cx, tipY, tipR, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      } else {
        // 入心：点落圆心，涟漪散开
        const ru = (u - fallEnd) / (1 - fallEnd)
        const easeR = 1 - Math.pow(1 - ru, 2)
        ctx.save()
        ctx.globalAlpha = Math.max(0, 1 - ru * 1.15)
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(cx, cy, Math.max(1.2, 3.5 * (1 - ru)), 0, Math.PI * 2)
        ctx.fill()
        const ripples = 3 + Math.min(2, Math.floor(lv / 4))
        for (let i = 0; i < ripples; i++) {
          const rr = ringR * 0.35 + easeR * (48 + i * 34 + lv * 2) + i * 6
          ctx.globalAlpha = Math.max(0, (1 - easeR) * (0.75 - i * 0.14))
          ctx.strokeStyle = i % 2 ? '#fffbeb' : '#ffffff'
          ctx.lineWidth = Math.max(1, (lineW * 0.45) * (1 - easeR))
          ctx.beginPath()
          ctx.arc(cx, cy, rr, 0, Math.PI * 2)
          ctx.stroke()
        }
        // 末段压暗淡出，准备退出升级界面
        if (ru > 0.55) {
          ctx.globalAlpha = (ru - 0.55) / 0.45 * 0.55
          ctx.fillStyle = '#0c0804'
          ctx.fillRect(0, 0, w, h)
        }
        ctx.restore()
      }
    }

    // 升级中隐藏本体，领域图单独演出
    ctx.globalAlpha = 1
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(15,23,42,0.55)'
    ctx.fillRect(w * 0.5 - 90, h * 0.08 - 18, 180, 44)
    ctx.fillStyle = '#fde68a'
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText('精神领域', w * 0.5, h * 0.08)
    ctx.font = '12px sans-serif'
    ctx.fillStyle = '#fef3c7'
    ctx.fillText(realm.name ? ('即将突破 · ' + realm.name) : '', w * 0.5, h * 0.08 + 18)
  },

  /**
   * 升阶特效：展示目标境界突破立绘 + 气浪文字
   * 圆环在屏幕正中，承接精神领域落线后的余波
   */
  _drawBreakthrough(ctx, fx) {
    const w = this._w
    const h = this._h
    const cx = w * 0.5
    const cy = h * 0.48
    const p = Math.min(1, fx.t / fx.duration)
    const fade = p < 0.15 ? p / 0.15 : (p > 0.72 ? (1 - p) / 0.28 : 1)
    const lv = Math.max(1, this._realmLv || 1)
    ctx.save()

    const realmImg = (fx.fxKey && this._realmFxImgs && this._realmFxImgs[fx.fxKey]) || null
    if (realmImg) {
      const iw = realmImg.width || 480
      const ih = realmImg.height || 720
      const scale = Math.max(w / iw, h / ih)
      const dw = iw * scale
      const dh = ih * scale
      ctx.globalAlpha = Math.max(0, fade) * 0.92
      ctx.drawImage(realmImg, (w - dw) * 0.5, (h - dh) * 0.5, dw, dh)
      ctx.globalAlpha = Math.max(0, fade) * 0.28
      ctx.fillStyle = 'rgba(8,6,12,0.55)'
      ctx.fillRect(0, 0, w, h)
    } else {
      ctx.globalAlpha = Math.max(0, fade) * 0.55
      ctx.fillStyle = fx.tier === '上' ? 'rgba(255,247,237,0.35)' : (fx.tier === '中' ? 'rgba(99,102,241,0.22)' : 'rgba(56,189,248,0.18)')
      ctx.fillRect(0, 0, w, h)
    }

    // 正中涟漪：等级越高线越粗
    const rings = fx.tier === '上' ? 4 : (fx.tier === '中' ? 3 : 2)
    const lw = 1.6 + Math.min(4, lv * 0.22)
    for (let i = 0; i < rings; i++) {
      const rr = 18 + (fx.t * 150 + i * 30)
      ctx.globalAlpha = Math.max(0, fade * (0.7 - i * 0.12))
      ctx.strokeStyle = i === 0 ? '#fffbeb' : fx.color
      ctx.lineWidth = lw
      ctx.beginPath()
      ctx.arc(cx, cy, rr, 0, Math.PI * 2)
      ctx.stroke()
    }

    // 中心残点
    ctx.globalAlpha = fade * 0.85
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = fade
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = fx.color
    ctx.font = 'bold 28px "KaiTi", "STKaiti", serif'
    ctx.fillText('突破 · ' + fx.name + (fx.name === '凡人' ? '' : '期'), w * 0.5, h * 0.22)
    ctx.font = '13px sans-serif'
    ctx.fillStyle = '#f8fafc'
    ctx.fillText(fx.tierName, w * 0.5, h * 0.22 + 28)
    ctx.font = '12px sans-serif'
    ctx.fillStyle = 'rgba(248,250,252,0.9)'
    this._drawWrappedText(ctx, fx.short || '', w * 0.5, h * 0.22 + 50, w * 0.78, 16)
    ctx.restore()
  },

  _drawWrappedText(ctx, text, x, y, maxW, lineH) {
    if (!text) return
    const chars = text.split('')
    let line = ''
    let yy = y
    for (let i = 0; i < chars.length; i++) {
      const test = line + chars[i]
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy)
        line = chars[i]
        yy += lineH
      } else {
        line = test
      }
    }
    if (line) ctx.fillText(line, x, yy)
  },

  /** 水墨粗笔「大道无情」：多层偏移模拟毛笔笔触 */
  _drawBrushInkText(ctx, text, x, y, size) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold ' + size + 'px "STXingkai", "华文行楷", "KaiTi", "STKaiti", serif'
    // 墨晕
    ctx.fillStyle = 'rgba(20,20,20,0.22)'
    ctx.fillText(text, x + 4, y + 5)
    // 粗笔画心（多偏移叠粗）
    const body = [[0, 0], [1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5], [2, 1], [-2, 1], [1, -2], [-1, 2], [2.5, 0], [-2.5, 0]]
    ctx.fillStyle = '#0c0c0c'
    for (let i = 0; i < body.length; i++) {
      ctx.fillText(text, x + body[i][0], y + body[i][1])
    }
    // 飞白枯笔边缘
    ctx.fillStyle = 'rgba(55,55,55,0.4)'
    ctx.fillText(text, x - 3, y - 2)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.fillText(text, x - 1, y - 1)
  },

  /** 死亡时画布墨晕 + 毛笔题字 */
  _drawInkEpitaph(ctx) {
    const w = this._w
    const h = this._h
    const cx = w * 0.5
    const cy = h * 0.42
    ctx.save()
    ctx.fillStyle = 'rgba(236, 230, 216, 0.4)'
    ctx.fillRect(0, 0, w, h)
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, Math.min(w, h) * 0.34)
    g.addColorStop(0, 'rgba(18,18,18,0.32)')
    g.addColorStop(0.55, 'rgba(18,18,18,0.1)')
    g.addColorStop(1, 'rgba(18,18,18,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(cx, cy, w * 0.4, h * 0.15, -0.1, 0, Math.PI * 2)
    ctx.fill()

    this._drawBrushInkText(ctx, '大道无情', cx, cy, 52)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '16px sans-serif'
    ctx.fillStyle = '#3f3f46'
    const realm = realmByLv(this._realmLv)
    ctx.fillText('击杀 ' + this._kills + ' · 境界 ' + realm.name, cx, cy + 48)
    ctx.restore()
  },

  _drawGooPools(ctx) {
    const pools = this._gooPools || []
    for (let i = 0; i < pools.length; i++) {
      const p = pools[i]
      const a = Math.max(0.15, Math.min(0.75, p.life / 3.2))
      ctx.save()
      ctx.globalAlpha = a
      ctx.fillStyle = '#0a0a0a'
      ctx.beginPath()
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.45, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1e293b'
      ctx.beginPath()
      ctx.ellipse(p.x - 2, p.y - 1, p.r * 0.55, p.r * 0.22, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  },

  _drawGooShots(ctx) {
    const shots = this._gooShots || []
    for (let i = 0; i < shots.length; i++) {
      const g = shots[i]
      ctx.save()
      ctx.globalAlpha = Math.max(0.25, Math.min(1, g.life * 1.2))
      ctx.fillStyle = '#020617'
      ctx.beginPath()
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#334155'
      ctx.beginPath()
      ctx.arc(g.x - g.r * 0.25, g.y - g.r * 0.25, g.r * 0.35, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }
})
