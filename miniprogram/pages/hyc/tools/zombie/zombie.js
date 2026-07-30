/**
 * 仙途：草地上修仙斩尸。
 * 击杀达门槛后出现劫尸（大僵尸），击败后才突破境界。
 */

/** 远程资源根路径（后台 uploads），避免主包图片超 200K 质量门禁 */
const ASSET_BASE = 'https://hychyr.top/uploads/game/xian'
/** 资源版本号：换图后递增，避免微信缓存旧图 */
const ASSET_VER = '20260730j'

/** 劫尸血条段数（随境界增加） */
function bossHpBars(realmLv) {
  return 3 + Math.min(4, Math.floor(Math.max(1, realmLv || 1) / 2))
}

/** 劫尸血条配色（从内层到外层循环） */
const BOSS_BAR_COLORS = ['#fbbf24', '#f87171', '#c084fc', '#38bdf8', '#4ade80', '#fb923c', '#e879f9']


function assetUrl(relPath) {
  return ASSET_BASE + '/' + String(relPath || '').replace(/^\//, '') + '?v=' + ASSET_VER
}

/** 修仙境界表：kills=突破所需击杀；fx=突破配图；tier 决定升阶特效风格 */
const REALMS = [
  {
    kills: 0, name: '凡人', tier: '下', tierName: '下境界', fx: '',
    color: '#64748b', glow: 'rgba(100,116,139,0.4)', sword: '#1e293b',
    short: '盘膝吸纳天地灵气，僵尸之手环伺却伤不得身',
    desc: '刚入仙途的凡人，盘膝打坐吸纳天地灵气。灵气入体足够后可突破炼气；修炼时僵尸之手会从地底伸出，但无法伤人。'
  },
  {
    kills: 0, name: '炼气', tier: '下', tierName: '下境界', fx: 'lianqi',
    color: '#86efac', glow: 'rgba(134,239,172,0.5)', sword: '#166534',
    short: '灵气如萤火汇聚入体，丹田初现灵气漩涡',
    desc: '灵气如萤火汇聚入体，丹田初现灵气漩涡，修仙之路的起点。自此持剑斩尸。'
  },
  {
    kills: 12, name: '筑基', tier: '下', tierName: '下境界', fx: 'zhuji',
    color: '#38bdf8', glow: 'rgba(56,189,248,0.5)', sword: '#0369a1',
    short: '灵气液化成灵池，金光环绕，飞剑待发',
    desc: '灵气液化成灵池，金光环绕，飞剑待发，正式踏入修仙之途。'
  },
  {
    kills: 35, name: '结丹', tier: '下', tierName: '下境界', fx: 'jiedan',
    color: '#fbbf24', glow: 'rgba(251,191,36,0.55)', sword: '#b45309',
    short: '金丹凝聚，金光四射，本命法宝虚影浮现',
    desc: '金丹凝聚，金光四射，本命法宝虚影浮现，实力质变。'
  },
  {
    kills: 70, name: '元婴', tier: '下', tierName: '下境界', fx: 'yuanying',
    color: '#f472b6', glow: 'rgba(244,114,182,0.55)', sword: '#be185d',
    short: '金丹破裂，元婴诞生，可空间顺移穿梭',
    desc: '金丹破裂，元婴诞生，金光与灵气交织。自此可穿梭空间顺移；灵狐相助。'
  },
  {
    kills: 120, name: '化神', tier: '下', tierName: '下境界', fx: 'huashen',
    color: '#22d3ee', glow: 'rgba(34,211,238,0.55)', sword: '#0e7490',
    short: '天地灵气龙卷汇聚，云海雷电磅礴气势',
    desc: '天地灵气龙卷汇聚，元婴成长为幼年形态，云海雷电磅礴气势。'
  },
  {
    kills: 180, name: '炼虚', tier: '中', tierName: '中境界', fx: 'lianxu',
    color: '#2dd4bf', glow: 'rgba(45,212,191,0.55)', sword: '#0f766e',
    short: '少年元婴虚影若隐若现，元气化形为灵禽瑞兽',
    desc: '少年元婴虚影若隐若现，元气化形为灵禽瑞兽，炼虚合道。'
  },
  {
    kills: 260, name: '合体', tier: '中', tierName: '中境界', fx: 'heti',
    color: '#a78bfa', glow: 'rgba(167,139,250,0.55)', sword: '#6d28d9',
    short: '青年元婴与本体融合，五色光芒环绕',
    desc: '青年元婴与本体融合，五色光芒环绕，法则符文浮现，天人合一。'
  },
  {
    kills: 360, name: '大乘', tier: '中', tierName: '中境界', fx: 'dacheng',
    color: '#fb7185', glow: 'rgba(251,113,133,0.55)', sword: '#be123c',
    short: '元婴神游太虚，法则光环如行星环绕',
    desc: '元婴神游太虚，法则光环如行星环绕，端坐莲台，威压四方。'
  },
  {
    kills: 480, name: '真仙', tier: '上', tierName: '上境界', fx: 'zhenxian',
    color: '#fde68a', glow: 'rgba(253,230,138,0.6)', sword: '#ca8a04',
    short: '仙光冲天，劫云雷电交织，飞升成仙',
    desc: '仙光冲天，仙窍如星辰点亮，劫云雷电交织，飞升成仙。'
  },
  {
    kills: 620, name: '金仙', tier: '上', tierName: '上境界', fx: 'jinxian',
    color: '#fdba74', glow: 'rgba(253,186,116,0.6)', sword: '#c2410c',
    short: '金身璀璨，法则之丝缠绕，灵域展开',
    desc: '金身璀璨，法则之丝缠绕，灵域展开，仙窍如周天星斗。'
  },
  {
    kills: 780, name: '太乙', tier: '上', tierName: '上境界', fx: 'taiyi',
    color: '#e7e5e4', glow: 'rgba(231,229,228,0.65)', sword: '#78716c',
    short: '玉体晶莹如琉璃，灵域演化小世界',
    desc: '玉体晶莹如琉璃，灵域演化小世界，山川日月尽在其中。'
  },
  {
    kills: 960, name: '大罗', tier: '上', tierName: '上境界', fx: 'daluo',
    color: '#c4b5fd', glow: 'rgba(196,181,253,0.65)', sword: '#6d28d9',
    short: '三尸魂影环绕，法体神魂三位一体',
    desc: '三尸魂影环绕，玄天法则本源悬浮，法体神魂三位一体，大罗道果。'
  },
  {
    kills: 1200, name: '道祖', tier: '上', tierName: '上境界', fx: 'daozu',
    color: '#fff7ed', glow: 'rgba(255,247,237,0.75)', sword: '#9a3412',
    short: '三千大道如星系环绕，法则光柱冲天',
    desc: '三千大道如星系环绕，法则光柱冲天，天地万象尽在掌控，至尊无敌。'
  }
]

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

/** 灵气：御剑消耗；静止打坐 / 灵石 / 回灵丹补充 */
const LING_QI_BASE = 80
const LING_QI_PER_LV = 10
const LING_QI_MEDITATE = 14
const FU_KEYS = ['fu_lei', 'fu_fire', 'fu_ice', 'fu_earth', 'fu_hide', 'fu_bind']

function playerMaxHpByRealm(realm) {
  const tierBonus = realm.tier === '上' ? 50 : (realm.tier === '中' ? 24 : 0)
  return 48 + realm.lv * 16 + tierBonus
}

function playerMaxLingQi(realm) {
  return LING_QI_BASE + Math.max(0, (realm && realm.lv) || 1) * LING_QI_PER_LV
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
/** 元婴境界解锁灵狐帮手；凡人起算：元婴=lv5 */
const HELPER_UNLOCK_LV = 5 // 元婴
/** 元婴起可空间顺移 */
const BLINK_UNLOCK_LV = 5
const BLINK_CD = 0.38

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
  }
}
const MONSTER_KEYS = ['walker', 'sprinter', 'spitter', 'brute', 'wraith', 'screamer']

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
  const keys = unlockedMonsterKeys(wave, realmLv)
  return keys[Math.floor(Math.random() * keys.length)]
}

function canSpaceBlink(realmLv) {
  return (realmLv || 1) >= BLINK_UNLOCK_LV
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
/** 灵狐：跟随 / 流光突袭分镜 */
const HELPER_WALK_PATHS = [
  assetUrl('helper/fox/fox_00.png'),
  assetUrl('helper/fox/fox_01.png')
]
const HELPER_SKILL_PATHS = [
  assetUrl('helper/fox/fox_02.png'),
  assetUrl('helper/fox/fox_03.png')
]
const HELPER_SKILL_DUR = 0.72
const HELPER_SKILL_CD = 2.8

/** 按已解锁境界等级取配置（与击杀数解耦，需先击败劫尸才升境） */
function realmByLv(lv) {
  const idx = Math.max(0, Math.min(REALMS.length - 1, (lv || 1) - 1))
  const r = REALMS[idx]
  const bodyScale = 1 + idx * 0.09
  return Object.assign({}, r, { lv: idx + 1, bodyScale })
}

/** 经验进度：当前境界 → 下一境界（满条后等劫尸） */
function realmExpProgress(kills, realmLv) {
  const idx = Math.max(0, Math.min(REALMS.length - 1, (realmLv || 1) - 1))
  const cur = REALMS[idx].kills
  const hasNext = idx + 1 < REALMS.length
  const next = hasNext ? REALMS[idx + 1].kills : cur
  const nextName = hasNext ? REALMS[idx + 1].name : '大圆满'
  const span = Math.max(1, next - cur)
  const ratio = hasNext ? Math.min(1, Math.max(0, (kills - cur) / span)) : 1
  return {
    ratio: ratio,
    cur: Math.min(span, Math.max(0, kills - cur)),
    need: span,
    nextName: nextName,
    maxed: !hasNext,
    awaitBoss: hasNext && kills >= next
  }
}

const CORPSE_DAN_NEED = 50
const GENG_SWORD_COUNT = 64
/** 御剑上限：周身环绕与出击杀敌共用此数目 */
const MAX_SWORD_COUNT = 64

/** 境界说明分组，供面板展示 */
function buildRealmInfoList() {
  const groups = { 下: [], 中: [], 上: [] }
  for (let i = 0; i < REALMS.length; i++) {
    const r = REALMS[i]
    groups[r.tier].push({
      name: r.name,
      short: r.short,
      desc: r.desc,
      kills: r.kills
    })
  }
  return [
    { title: '下境界', items: groups['下'] },
    { title: '中境界', items: groups['中'] },
    { title: '上境界', items: groups['上'] }
  ]
}

Page({
  data: {
    kills: 0,
    realmLv: 1,
    realmName: '凡人',
    realmTierName: '下境界',
    swordCount: 1,
    wave: 1,
    hp: 48,
    maxHp: 48,
    lingQi: 80,
    maxLingQi: 80,
    heldFu: '',
    over: false,
    perfect: false,
    autoPilot: true,
    showRealmInfo: false,
    corpseDan: 0,
    corpseDanNeed: 50,
    realmInfoList: buildRealmInfoList()
  },

  onReady() {
    this._initCanvas(0)
  },

  onUnload() {
    if (this._bootTimer) {
      clearTimeout(this._bootTimer)
      this._bootTimer = null
    }
    this._stop()
  },

  onHide() {
    this._paused = true
  },

  onShow() {
    this._paused = false
    // 偶发 onReady 时 canvas 节点未就绪：回到前台再补一次初始化
    if (!this._canvas) this._initCanvas(0)
  },

  onTouchStart(e) {
    const t = e.touches && e.touches[0]
    if (!t || this._over || this._perfect) return
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
    // 元婴前：连续跟手；元婴后：按下不瞬移，松手/拖到目标再顺移
    if (!canSpaceBlink(this._realmLv)) {
      this._movePlayerTo(t.x, t.y)
    }
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
    if (!canSpaceBlink(this._realmLv)) {
      this._movePlayerTo(t.x, t.y)
    }
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
      } else if (canSpaceBlink(this._realmLv)) {
        this._trySpaceBlink(x, y)
        if (!this._moved) this._tryFocusZombie(x, y)
      } else if (!this._moved) {
        if (this._heldFu && !this._isMortalCultivate()) this._throwHeldFu(x, y)
        else this._tryFocusZombie(x, y)
      }
    }
    this._dragging = false
  },

  restart() {
    this._resetGame()
    const r = realmByLv(1)
    const maxQi = playerMaxLingQi(r)
    this.setData({
      kills: 0,
      realmLv: 1,
      realmName: r.name,
      realmTierName: r.tierName,
      swordCount: 1,
      wave: 1,
      hp: r.maxHp || playerMaxHpByRealm(r),
      maxHp: playerMaxHpByRealm(r),
      lingQi: maxQi,
      maxLingQi: maxQi,
      heldFu: '',
      over: false,
      perfect: false,
      showRealmInfo: false,
      autoPilot: true,
      corpseDan: 0,
      corpseDanNeed: CORPSE_DAN_NEED
    })
  },

  toggleRealmInfo() {
    this.setData({ showRealmInfo: !this.data.showRealmInfo })
  },

  closeRealmInfo() {
    this.setData({ showRealmInfo: false })
  },

  /** 太极：点一下自动，再点一下手动 */
  _toggleAutoByTaiji() {
    if (this._over || this._perfect) return
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
    if (this._over || this._perfect || this.data.showRealmInfo || this._isMortalCultivate()) return
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
    const query = wx.createSelectorQuery()
    query
      .select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          if (tryN < 10) {
            setTimeout(() => this._initCanvas(tryN + 1), 60 + tryN * 40)
            return
          }
          wx.showToast({ title: '画布初始化失败', icon: 'none' })
          return
        }
        if (this._canvas) return
        const canvas = res[0].node
        const width = res[0].width
        const height = res[0].height
        if (!width || !height) {
          if (tryN < 10) {
            setTimeout(() => this._initCanvas(tryN + 1), 60 + tryN * 40)
            return
          }
        }
        const dpr = wx.getSystemInfoSync().pixelRatio || 1
        canvas.width = width * dpr
        canvas.height = height * dpr
        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)

        this._canvas = canvas
        this._ctx = ctx
        this._w = width
        this._h = height
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
        this._loadImages(() => this._loop())
      })
  },

  _loadImages(done) {
    const canvas = this._canvas
    if (!canvas) return
    const animKeys = Object.keys(ANIM_DEFS)
    const realmFxKeys = REALM_FX_KEYS
    const mobKeys = MONSTER_KEYS
    // 玩家+凡人打坐4+草地1+劫尸2+精神2+太极+帮手+境界突破图+怪物立绘(走姿2+攻+闲)
    let left = 1 + MORTAL_MEDITATE_PATHS.length + 1 + 2 + 2 + 1 + HELPER_WALK_PATHS.length + HELPER_SKILL_PATHS.length + realmFxKeys.length + mobKeys.length * 4
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
    this._gooShots = []
    this._gooPools = []
    this._spiritFx = null
    this._taijiPressed = false
    this._taijiRestAngle = 0
    this._helper = null
    this._helperAnnounced = false
    this._blinkCd = 0
    this._blinkFx = null
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

  _clampToGrass(x, y) {
    const g = this._grassRect()
    return {
      x: Math.max(g.minX, Math.min(g.maxX, x)),
      y: Math.max(g.minY, Math.min(g.maxY, y))
    }
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
    const g = this._grassRect()
    this._playerX = Math.max(g.minX, Math.min(g.maxX, x))
    if (y != null) {
      this._playerY = Math.max(g.minY, Math.min(g.maxY, y))
    }
  },

  /** 元婴后空间顺移 */
  _trySpaceBlink(x, y) {
    if (!canSpaceBlink(this._realmLv)) return false
    if (this._blinkCd > 0 || this._gengFx || this._spiritFx || this._breakFx) return false
    const g = this._grassRect()
    const tx = Math.max(g.minX, Math.min(g.maxX, x))
    const ty = Math.max(g.minY, Math.min(g.maxY, y == null ? this._playerY : y))
    const dx = tx - this._playerX
    const dy = ty - this._playerY
    if (dx * dx + dy * dy < 18 * 18) return false
    const fromX = this._playerX
    const fromY = this._playerY
    const realm = realmByLv(this._realmLv)
    this._spawnBlinkFx(fromX, fromY, tx, ty, realm)
    this._playerX = tx
    this._playerY = ty
    this._prevPlayerX = tx
    this._prevPlayerY = ty
    this._blinkCd = BLINK_CD
    return true
  },

  _spawnBlinkFx(fx, fy, tx, ty, realm) {
    const color = realm.color || '#f472b6'
    this._blinkFx = { t: 0, dur: 0.32, fx: fx, fy: fy, tx: tx, ty: ty, color: color }
    // 起终点裂空粒子
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

  /**
   * 凡人打坐：吸纳天地灵气；僵尸手从地底伸出但不伤人
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

    // 灵气入体
    const before = this._qiAbsorb || 0
    this._qiAbsorb = Math.min(MORTAL_QI_NEED, before + MORTAL_QI_RATE * dt)
    this._spawnQiParticles(dt)

    // 僵尸手：只出土到手部高度，不追人
    this._mortalHandAcc = (this._mortalHandAcc || 0) + dt
    const hands = (this._zombies || []).filter((z) => z.handOnly)
    if (hands.length < 5 && this._mortalHandAcc >= 1.15) {
      this._mortalHandAcc = 0
      this._spawnMortalHand()
    }
    for (let i = this._zombies.length - 1; i >= 0; i--) {
      const z = this._zombies[i]
      if (!z.handOnly) {
        this._zombies.splice(i, 1)
        continue
      }
      z.life = (z.life == null ? 4.5 : z.life) - dt
      z.state = 'emerge'
      // 保持「手」帧上下蠕动
      z.emerge = 0.22 + 0.2 * (0.5 + 0.5 * Math.sin(this._animT * 2.4 + z.id))
      z.frameT = (z.frameT || 0) + dt
      if (z.life <= 0) {
        this._zombies.splice(i, 1)
      }
    }

    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i]
      p.life -= dt
      p.x += (p.vx || 0) * dt
      p.y += (p.vy || 0) * dt
      if (p.life <= 0) this._particles.splice(i, 1)
    }

    if (this._qiAbsorb >= MORTAL_QI_NEED) {
      this._startMortalBreakthrough()
    }
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

  /** 凡人修炼时从草地伸出的僵尸手（无伤害） */
  _spawnMortalHand() {
    const realm = realmByLv(1)
    let pos = this._spawnPointOnGrass()
    const pdx = pos.x - this._playerX
    const pdy = pos.y - this._playerY
    // 不要紧贴打坐点
    if (pdx * pdx + pdy * pdy < 70 * 70) {
      pos = this._spawnPointOnGrass()
    }
    pos = this._clampToGrass(pos.x, pos.y)
    this._zombies.push({
      id: this._nextZid++,
      x: pos.x,
      y: pos.y,
      r: 18 * realm.bodyScale,
      hp: 1,
      maxHp: 1,
      speedBonus: 0,
      frameT: 0,
      emerge: 0.2,
      state: 'emerge',
      handOnly: true,
      life: 3.8 + Math.random() * 2.2,
      kx: 0,
      ky: 0,
      flash: 0,
      facing: 0
    })
  },

  /** 灵气足够：进入精神领域，突破至炼气，开始斩尸 */
  _startMortalBreakthrough() {
    if (this._spiritFx || this._breakFx) return
    this._qiAbsorb = MORTAL_QI_NEED
    this._zombies = []
    this._swords = []
    this._focusZombie = null
    this._breakMute = 12
    this._ensureSpiritImages()
    const nextLv = 2
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
      sj: !!this._spiritSjImg
    })
  },

  /**
   * 自动御剑：元婴前连续飞；元婴后顺移穿梭
   */
  _updateAutoPilot(dt) {
    if (!this.data.autoPilot || this._dragging || this._over || this._perfect || this._perfectFx) return
    const px = this._playerX
    const py = this._playerY
    let vx = 0
    let vy = 0

    // 持符时自动朝最近尸扔出
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

    // 1) 躲避僵尸
    const dangerR = 100
    for (let i = 0; i < this._zombies.length; i++) {
      const z = this._zombies[i]
      if (z.state === 'dead' || z.emerge < 0.5) continue
      const zx = z.x
      const zy = z.y - (z.floatY || 0)
      const dx = px - zx
      const dy = py - zy
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      if (d < dangerR) {
        const w = (dangerR - d) / dangerR
        vx += (dx / d) * w * 2.4
        vy += (dy / d) * w * 2.4
      }
    }

    const fleeForce = vx * vx + vy * vy
    // 2) 不紧急时去捡包 / 出土剑
    if (fleeForce < 0.55) {
      const loot = this._autoPilotLootTarget()
      if (loot) {
        const dx = loot.x - px
        const dy = loot.y - py
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        vx += (dx / d) * 1.15
        vy += (dy / d) * 1.15
      }
    }

    const len = Math.sqrt(vx * vx + vy * vy)
    if (len < 0.08) return

    if (canSpaceBlink(this._realmLv)) {
      this._autoBlinkAcc = (this._autoBlinkAcc || 0) + dt
      if (this._autoBlinkAcc < 0.45) return
      this._autoBlinkAcc = 0
      const hop = 78 + Math.min(50, (this._realmLv || 1) * 4)
      this._trySpaceBlink(px + (vx / len) * hop, py + (vy / len) * hop)
      return
    }

    const speed = 155 + Math.min(40, (this._realmLv || 1) * 3)
    this._movePlayerTo(px + (vx / len) * speed * dt, py + (vy / len) * speed * dt)
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
      let bonus = 80
      if (needHp && p.key === 'hp') bonus = 420
      else if (needQi && (p.key === 'ling' || p.key === 'lingshi')) bonus = 400
      else if (p.key === 'hp') bonus = 140
      else if (p.key === 'ling' || p.key === 'lingshi') bonus = 160
      else if (LOOT_DEFS[p.key] && LOOT_DEFS[p.key].kind === 'fu') bonus = this._heldFu ? 40 : 200
      else if (p.key === 'sword') bonus = 90
      consider(p.x, p.y, bonus)
    }
    const gs = this._groundSwords || []
    for (let i = 0; i < gs.length; i++) {
      const s = gs[i]
      if ((s.grow || 0) < 1) continue
      consider(s.x, s.y, this._swordCount < MAX_SWORD_COUNT ? 220 : 20)
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
      if (this._paused || this._over || this._perfect || this.data.showRealmInfo) {
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
      this._update(dt)
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

    // 自动飞行：捡包、躲尸（拖动时暂停，手控优先）
    this._updateAutoPilot(dt)
    if (this._blinkCd > 0) this._blinkCd = Math.max(0, this._blinkCd - dt)
    if (this._blinkFx) {
      this._blinkFx.t += dt
      if (this._blinkFx.t >= this._blinkFx.dur) this._blinkFx = null
    }
    if (this._playerHideT > 0) this._playerHideT = Math.max(0, this._playerHideT - dt)
    if (this._lingQiWarnT > 0) this._lingQiWarnT = Math.max(0, this._lingQiWarnT - dt)
    this._updateLingQi(dt, realm)
    this._updateFuThrow(dt, realm)
    this._updateGroundSwords(dt)
    // 御剑遁光拖尾（元婴前彗星尾；元婴后仅顺移残影）
    this._pushTrail(realm)

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

    // 僵尸更少：间隔更长，且限制场上数量
    const spawnEvery = Math.max(1.35, 2.6 - this._wave * 0.06 - realm.lv * 0.04)
    const maxZ = Math.min(5, 2 + Math.floor(realm.lv / 3))
    this._spawnAcc += dt
    // 劫尸战期间不刷普通尸；突破静默期也不刷
    if (!this._bossActive && !this._gengFx && this._breakMute <= 0 && this._zombies.length < maxZ && this._spawnAcc >= spawnEvery) {
      this._spawnAcc = 0
      this._spawnZombie()
    }

    this._pickupAcc += dt
    // 物品改为击杀掉落，不再定时刷地面箱
    this._lootAcc = 0

    const shootEvery = Math.max(0.28, 0.55 - realm.lv * 0.04)
    this._swordAcc += dt
    // 周身剑出去杀敌：场上还有出击剑时不叠发，归队后再发；灵气不足则不出剑
    if (!this._gengFx && !this._spiritFx && !this._breakFx && this._swordAcc >= shootEvery && !(this._swords && this._swords.length)) {
      this._swordAcc = 0
      this._launchSwords(realm)
    }

    // 飞剑：穿透斩尸，击杀后追下一只或回身归队
    for (let i = this._swords.length - 1; i >= 0; i--) {
      const s = this._swords[i]
      if (!s.hitIds) s.hitIds = {}
      if (!s.mode) s.mode = 'hunt'

      s.life -= dt
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

      // 穿透：穿过身体造成伤害，不销毁飞剑、不击退
      for (let zi = 0; zi < this._zombies.length; zi++) {
        const z = this._zombies[zi]
        if (z.emerge < 0.85 || z.state === 'dead') continue
        if (s.hitIds[z.id]) continue
        const dx = s.x - z.x
        const dy = s.y - (z.y - (z.floatY || 0))
        if (dx * dx + dy * dy <= (z.r + 10) * (z.r + 10)) {
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

    // 掉落物浮动：靠近拾取（丹药即时、符箓入手）
    for (let i = this._pickups.length - 1; i >= 0; i--) {
      const p = this._pickups[i]
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
        const deadLen = z.isBoss ? 0.55 : (ANIM_DEFS.dead.paths.length / ANIM_DEFS.dead.fps)
        if (z.frameT >= deadLen) {
          const wasBoss = !!z.isBoss
          if (this._focusZombie === z) this._focusZombie = null
          this._dropLootFromZombie(z)
          this._zombies.splice(i, 1)
          this._registerKill(wasBoss ? { boss: true, skipDan: true } : null)
        }
        continue
      }

      // 元素状态倒计时与持续伤害
      this._tickZombieElements(z, dt, realm)

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
    const def = LOOT_DEFS[p.key] || LOOT_DEFS.lingshi
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
    z.hp -= dmg + bonus
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

  /** 场景出土飞剑：从土里慢慢长出，拾取加剑数 */
  _updateGroundSwords(dt) {
    if (!this._groundSwords) this._groundSwords = []
    if (this._isMortalCultivate() || this._gengFx || this._bossActive) return
    this._groundSwordAcc = (this._groundSwordAcc || 0) - dt
    const list = this._groundSwords
    if (this._groundSwordAcc <= 0 && list.length < 3 && (this._swordCount || 1) < MAX_SWORD_COUNT) {
      this._groundSwordAcc = 7 + Math.random() * 8
      const g = this._grassRect()
      const p = this._clampToGrass(
        g.minX + Math.random() * (g.maxX - g.minX),
        g.minY + Math.random() * (g.maxY - g.minY)
      )
      list.push({ x: p.x, y: p.y, grow: 0, life: 16 })
    }
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i]
      if (s.grow < 1) s.grow = Math.min(1, s.grow + dt / 2.4)
      else s.life -= dt
      if (s.grow >= 1) {
        const dx = s.x - this._playerX
        const dy = s.y - this._playerY
        if (dx * dx + dy * dy < 26 * 26) {
          this._swordCount = Math.min(MAX_SWORD_COUNT, (this._swordCount || 1) + 1)
          this.setData({ swordCount: this._swordCount })
          this._burst(s.x, s.y, '#fde68a', 12)
          list.splice(i, 1)
          continue
        }
      }
      if (s.life <= 0) list.splice(i, 1)
    }
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
    if (this._isMortalCultivate() || (this._realmLv || 1) <= 1) return
    if ((this._playerHideT || 0) > 0) return
    this._hp -= dmg
    this._playerHurtT = 0.35
    this._burst(this._playerX, this._playerY, '#f87171', 8)
    // 轻击退
    const dx = this._playerX - fromX
    const dy = this._playerY - fromY
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    this._movePlayerTo(this._playerX + (dx / dist) * 18, this._playerY + (dy / dist) * 18)
    this.setData({ hp: Math.max(0, Math.ceil(this._hp)), maxHp: this._maxHp })
    if (this._hp <= 0) this._gameOver()
  },

  _pushTrail(realm) {
    const dx = this._playerX - this._prevPlayerX
    const dy = this._playerY - this._prevPlayerY
    const moved = dx * dx + dy * dy > 2.5
    if (canSpaceBlink(this._realmLv)) {
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
    const roll = Math.random()
    let key = 'lingshi'
    if (roll < 0.28) key = 'lingshi'
    else if (roll < 0.44) key = 'hp'
    else if (roll < 0.58) key = 'ling'
    else if (roll < 0.72) key = FU_KEYS[Math.floor(Math.random() * FU_KEYS.length)]
    else if (roll < 0.86) key = FU_KEYS[Math.floor(Math.random() * FU_KEYS.length)]
    else key = 'lingshi'
    this._spawnLoot(key, atX, atY)
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

  /** 草地上出土普通怪物（随机种类） */
  _spawnZombie() {
    const realm = realmByLv(this._realmLv)
    const typeKey = pickMonsterKey(this._wave, this._realmLv)
    const def = monsterDef(typeKey)
    const hp = Math.floor((10 + Math.floor(this._wave * 3.5) + realm.lv * 5 + Math.floor(this._kills / 25)) * def.hpMul)
    const r = (20 + Math.min(8, this._wave * 0.35)) * realm.bodyScale * def.rMul
    let pos = this._spawnPointOnGrass()
    const pdx = pos.x - this._playerX
    const pdy = pos.y - this._playerY
    if (pdx * pdx + pdy * pdy < 110 * 110) {
      pos = this._spawnPointOnGrass()
    }
    pos = this._clampToGrass(pos.x, pos.y)
    this._zombies.push(this._makeMonster({
      typeKey: typeKey,
      x: pos.x,
      y: pos.y,
      r: r,
      hp: hp,
      maxHp: hp,
      isBoss: false
    }))
  },

  /** 组装怪物实例（普通 / Boss 共用） */
  _makeMonster(opt) {
    const def = monsterDef(opt.typeKey)
    return {
      id: this._nextZid++,
      typeKey: def.key,
      typeName: def.name,
      isBoss: !!opt.isBoss,
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
      phaseCd: 0
    }
  },

  /** 击杀入账；尸丹累计；达门槛召唤劫尸，击败劫尸后才突破 */
  _registerKill(opt) {
    const isBoss = !!(opt && opt.boss)
    this._kills += 1

    let triggerGeng = false
    if (!(opt && opt.skipDan) && !this._gengFx) {
      this._corpseDan = (this._corpseDan || 0) + 1
      if (this._corpseDan >= CORPSE_DAN_NEED) {
        triggerGeng = true
      }
    }

    const cur = realmByLv(this._realmLv)
    this.setData({
      kills: this._kills,
      wave: this._wave,
      realmLv: cur.lv,
      realmName: cur.name,
      realmTierName: cur.tierName,
      corpseDan: this._corpseDan || 0,
      corpseDanNeed: CORPSE_DAN_NEED
    })

    if (isBoss) {
      this._onBossDefeated()
    } else {
      this._maybeStartBossChallenge()
    }

    if (triggerGeng && !this._bossActive) {
      this._corpseDan = 0
      this.setData({ corpseDan: 0 })
      this._startGengFormation()
    }
  },

  /** 经验满条：清小尸，召唤升级劫尸 */
  _maybeStartBossChallenge() {
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

  /** 击败劫尸后：先播精神领域，再正式突破 */
  _onBossDefeated() {
    this._bossActive = false
    this._gooShots = []
    this._gooPools = []
    const nextLv = Math.min(REALMS.length, (this._realmLv || 1) + 1)
    const nr = realmByLv(nextLv)
    const zombies = this._zombies || []
    for (let i = 0; i < zombies.length; i++) {
      this._burst(zombies[i].x, zombies[i].y, '#fde68a', 8)
    }
    this._zombies = []
    this._swords = []
    this._focusZombie = null
    this._spawnAcc = 0
    this._breakMute = 12
    // 若进图时 sj 未加载成功，开场再拉一次
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
    this.setData({
      realmLv: nr.lv,
      realmName: nr.name,
      realmTierName: nr.tierName
    })
    this._burst(this._playerX, this._playerY - 30, '#fff7ed', 28)
    console.log('仙途劫尸击败，突破', nr.name)
    this._onRealmBreakthrough(nr)
    this._ensureHelper()
  },

  /** 元婴起召唤灵狐帮手（跟随 + 化作流光突袭） */
  _ensureHelper() {
    if ((this._realmLv || 1) < HELPER_UNLOCK_LV) return
    if (this._helper) return
    const g = this._clampToGrass(this._playerX - 42, this._playerY + 12)
    this._helper = {
      x: g.x,
      y: g.y,
      state: 'follow',
      frameT: 0,
      skillCd: 1.0,
      skillHit: false,
      facing: 1,
      dashFromX: 0,
      dashFromY: 0,
      dashToX: 0,
      dashToY: 0,
      trails: []
    }
    if (!this._helperAnnounced) {
      this._helperAnnounced = true
      wx.showToast({ title: '元婴灵狐相助', icon: 'none', duration: 1600 })
      console.log('仙途帮手解锁：元婴灵狐')
    }
  },

  _updateHelper(dt, realm) {
    this._ensureHelper()
    const h = this._helper
    if (!h || this._spiritFx || this._breakFx || this._perfect || this._perfectFx) return
    h.frameT += dt
    h.skillCd = (h.skillCd || 0) - dt

    // 流光拖尾衰减
    if (h.trails && h.trails.length) {
      for (let i = h.trails.length - 1; i >= 0; i--) {
        h.trails[i].life -= dt
        if (h.trails[i].life <= 0) h.trails.splice(i, 1)
      }
    }

    if (h.state === 'skill') {
      const u = Math.min(1, h.frameT / HELPER_SKILL_DUR)
      // 前半冲向目标，后半折返侧后方
      const mid = 0.48
      let px
      let py
      if (u <= mid) {
        const t = u / mid
        const e = t * t * (3 - 2 * t)
        px = h.dashFromX + (h.dashToX - h.dashFromX) * e
        py = h.dashFromY + (h.dashToY - h.dashFromY) * e
      } else {
        const t = (u - mid) / (1 - mid)
        const e = t * t * (3 - 2 * t)
        const backX = this._playerX - 40
        const backY = this._playerY + 10
        px = h.dashToX + (backX - h.dashToX) * e
        py = h.dashToY + (backY - h.dashToY) * e
      }
      h.x = px
      h.y = py
      h.facing = (h.dashToX >= h.dashFromX) ? 1 : -1
      // 流光粒子
      if (Math.random() < 0.9) {
        if (!h.trails) h.trails = []
        h.trails.push({
          x: h.x + (Math.random() - 0.5) * 8,
          y: h.y + (Math.random() - 0.5) * 6,
          life: 0.22 + Math.random() * 0.18,
          r: 2 + Math.random() * 3
        })
      }
      // 冲刺中段命中路径上的僵尸
      if (!h.skillHit && u >= 0.28) {
        h.skillHit = true
        this._helperSkillHit(h, realm)
      }
      if (h.frameT >= HELPER_SKILL_DUR) {
        h.state = 'follow'
        h.frameT = 0
        h.skillHit = false
        h.skillCd = HELPER_SKILL_CD
        h.trails = []
      }
      return
    }

    // 跟随主角侧后方
    const tx = this._playerX - 40
    const ty = this._playerY + 10
    let dx = tx - h.x
    let dy = ty - h.y
    let dist = Math.sqrt(dx * dx + dy * dy) || 1
    if (dist > 6) {
      const spd = Math.min(190, 100 + dist * 2) * dt
      h.x += (dx / dist) * spd
      h.y += (dy / dist) * spd
      const c = this._clampToGrass(h.x, h.y)
      h.x = c.x
      h.y = c.y
    }
    if (Math.abs(dx) > 2) h.facing = dx >= 0 ? 1 : -1

    // 附近有尸则化作流光突袭
    if ((h.skillCd || 0) > 0 || this._gengFx || this._bossActive) return
    let best = null
    let bestD = 170 * 170
    const zs = this._zombies || []
    for (let i = 0; i < zs.length; i++) {
      const z = zs[i]
      if (!z || z.state === 'dead' || (z.emerge || 0) < 0.85) continue
      const zx = z.x - h.x
      const zy = z.y - h.y
      const d = zx * zx + zy * zy
      if (d < bestD) {
        bestD = d
        best = z
      }
    }
    if (!best) return
    h.state = 'skill'
    h.frameT = 0
    h.skillHit = false
    h.dashFromX = h.x
    h.dashFromY = h.y
    h.dashToX = best.x
    h.dashToY = best.y
    h.facing = best.x >= h.x ? 1 : -1
    h.trails = []
  },

  /** 流光斩击：路径附近僵尸受伤 */
  _helperSkillHit(h, realm) {
    const r = 46 + Math.min(20, (realm.lv || 1) * 1.6)
    const dmg = 7 + Math.floor((realm.lv || 1) * 2)
    const zs = this._zombies || []
    // 对起点→终点线段附近的尸造成伤害
    const x0 = h.dashFromX
    const y0 = h.dashFromY
    const x1 = h.dashToX
    const y1 = h.dashToY
    const segDx = x1 - x0
    const segDy = y1 - y0
    const segLen2 = segDx * segDx + segDy * segDy || 1
    for (let i = 0; i < zs.length; i++) {
      const z = zs[i]
      if (!z || z.state === 'dead') continue
      const t = Math.max(0, Math.min(1, ((z.x - x0) * segDx + (z.y - y0) * segDy) / segLen2))
      const cx = x0 + segDx * t
      const cy = y0 + segDy * t
      const dx = z.x - cx
      const dy = z.y - cy
      if (dx * dx + dy * dy <= r * r) {
        this._hitZombie(z, dmg, h.x, h.y, realm, null, true)
      }
    }
    this._burst(h.dashToX, h.dashToY - 6, '#fbbf24', 16)
    this._burst(h.dashToX, h.dashToY - 6, '#fdba74', 10)
  },

  _drawHelper(ctx) {
    const h = this._helper
    if (!h || this._spiritFx || this._breakFx) return
    const walk = this._helperWalkImgs || []
    const skill = this._helperSkillImgs || []

    // 流光拖尾
    if (h.trails && h.trails.length) {
      ctx.save()
      for (let i = 0; i < h.trails.length; i++) {
        const p = h.trails[i]
        ctx.globalAlpha = Math.max(0, p.life * 3.2)
        ctx.fillStyle = i % 2 ? '#fde68a' : '#fb923c'
        ctx.beginPath()
        ctx.arc(p.x, p.y - 4, p.r || 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    // 突袭时画一道金色流光线
    if (h.state === 'skill') {
      ctx.save()
      ctx.globalAlpha = 0.55
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(h.dashFromX, h.dashFromY - 4)
      ctx.lineTo(h.x, h.y - 4)
      ctx.stroke()
      ctx.globalAlpha = 0.35
      ctx.strokeStyle = '#fff7ed'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(h.dashFromX, h.dashFromY - 4)
      ctx.lineTo(h.x, h.y - 4)
      ctx.stroke()
      ctx.restore()
    }

    let img = null
    let size = 52
    if (h.state === 'skill' && skill.length) {
      const fi = Math.min(skill.length - 1, Math.floor((h.frameT / HELPER_SKILL_DUR) * skill.length))
      img = skill[fi] || skill[0]
      size = 64
    } else if (walk.length) {
      const fi = Math.floor((h.frameT || 0) * 6) % walk.length
      img = walk[fi] || walk[0]
    }
    if (!img) return
    ctx.save()
    ctx.translate(h.x, h.y - 4)
    if (h.facing < 0) ctx.scale(-1, 1)
    // 突袭时略透明，更像流光化形
    if (h.state === 'skill') ctx.globalAlpha = 0.85
    this._drawSprite(ctx, img, 0, 0, size, h.state === 'skill' ? 'rgba(251,191,36,0.35)' : null, null)
    ctx.restore()
  },

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
      const clamped = this._clampToGrass(z.x, z.y)
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
    const moveMul = (z.speedMul || 1) * (z.isBoss ? 0.78 : 1)
    const spd = (baseSpeed * moveMul + z.speedBonus) * dt
    z.x += (dx / dist) * spd
    z.y += (dy / dist) * spd
    const clamped = this._clampToGrass(z.x, z.y)
    z.x = clamped.x
    z.y = clamped.y

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

  /**
   * 大庚剑阵：尸丹满 50 触发，整段约 10 秒
   * 身上汇聚 64 金黄雷剑 → 各自飞向屏幕中央围圆（尖朝内）→ 吸入缩小散开 → 雷丝穿尸尽斩
   * 剑离身后，人物周围环剑/御剑暂时消失
   */
  _startGengFormation() {
    if (this._perfect || this._over || this._bossActive) return
    const n = 14 + Math.min(10, Math.floor((this._realmLv || 1) / 2))
    for (let i = 0; i < n; i++) this._spawnZombie()

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
      // 起点：环绕人物（与平时环剑同向，尖朝外）
      const sx = px + Math.cos(a) * orbitR
      const sy = py + Math.sin(a) * orbitR
      swords.push({
        a: a,
        // 终点：阵心圆圈上，剑尖朝内
        tx: cx + Math.cos(a) * radius,
        ty: cy + Math.sin(a) * radius,
        tipIn: a + Math.PI,
        tipOut: a,
        x: px,
        y: py,
        tipAngle: a,
        scale: 0,
        // 错开汇聚，像从身上陆续抽出
        delay: (i / GENG_SWORD_COUNT) * 0.55
      })
    }
    const links = []
    for (let i = 0; i < GENG_SWORD_COUNT; i += 2) {
      links.push({ a: i, b: (i + 31) % GENG_SWORD_COUNT })
    }
    this._gengFx = {
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
    // 身上飞剑全部离体参阵，清空场上追击飞剑
    this._swords = []
    this._focusZombie = null
    this.setData({ corpseDan: 0 })
    wx.showToast({ title: '大庚剑阵', icon: 'none', duration: 1500 })
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
        // 锁定起飞起点（人物当前位置环上）
        for (let i = 0; i < fx.swords.length; i++) {
          const s = fx.swords[i]
          s.fromX = s.x
          s.fromY = s.y
          s.scale = 1
        }
      }
      return
    }

    // 各自飞向屏幕中央预定落点，围成圆圈；剑尖翻转向内
    if (fx.phase === 'fly') {
      const u = Math.min(1, fx.t / fx.flyDur)
      const ease = 1 - Math.pow(1 - u, 3)
      for (let i = 0; i < fx.swords.length; i++) {
        const s = fx.swords[i]
        // 错开起飞，外圈感更强
        const iu = Math.min(1, Math.max(0, (u * 1.15) - (i / GENG_SWORD_COUNT) * 0.15))
        const e = 1 - Math.pow(1 - iu, 3)
        const fx0 = s.fromX != null ? s.fromX : px
        const fy0 = s.fromY != null ? s.fromY : py
        s.x = fx0 + (s.tx - fx0) * e
        s.y = fy0 + (s.ty - fy0) * e
        // 尖朝外 → 尖朝内
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
          this._burst(z.x, z.y, '#fbbf24', 14)
          this._burst(z.x, z.y, '#fef08a', 10)
          this._dropLootFromZombie(z)
          this._zombies.splice(i, 1)
          this._registerKill({ skipDan: true })
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
      }
    }
  },

  /** 突破：全屏清尸（不计杀）+ 短暂停刷 + 境界特效；道祖触发大圆满 */
  _onRealmBreakthrough(realm) {
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
    if (realm.lv >= REALMS.length || realm.name === '道祖') {
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
        wx.showToast({ title: '灵气不足 · 打坐或拾灵石', icon: 'none', duration: 1400 })
      }
      return
    }
    this._addLingQi(-cost)
    const baseAngle = -Math.PI / 2
    const spread = Math.min(Math.PI * 1.6, 0.11 * (n - 1))
    const orbitR = 22
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + (this._animT || 0) * 1.05
      const ang = n === 1 ? baseAngle : (baseAngle - spread / 2 + (i / Math.max(1, n - 1)) * spread)
      this._swords.push({
        x: this._playerX + Math.cos(a) * orbitR,
        y: this._playerY - 14 + Math.sin(a) * (orbitR * 0.55),
        angle: ang,
        speed: 270 + realm.lv * 35,
        dmg: 2 + Math.floor(realm.lv * 0.85),
        life: 4.5,
        color: realm.sword || realm.color,
        enchant: null,
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
    this.setData({
      over: true,
      kills: this._kills,
      wave: this._wave,
      realmName: realmByLv(this._realmLv).name
    })
  },

  _drawFlyingSword(ctx, s) {
    const color = s.color || '#334155'
    ctx.save()
    ctx.translate(s.x, s.y)
    ctx.rotate(s.angle)
    this._paintInkSword(ctx, color, 1)
    // 附魔剑刃特效
    if (s.enchant) this._paintSwordEnchantFx(ctx, s.enchant)
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
    const def = LOOT_DEFS[p.key] || LOOT_DEFS.lingshi
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
  _paintInkSword(ctx, color, scale) {
    const sc = scale || 1
    ctx.save()
    ctx.scale(sc, sc)
    ctx.fillStyle = color
    ctx.strokeStyle = color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // 剑刃（菱形长锋）
    ctx.globalAlpha = 0.95
    ctx.beginPath()
    ctx.moveTo(22, 0)
    ctx.lineTo(6, 2.6)
    ctx.lineTo(-8, 2.2)
    ctx.lineTo(-8, -2.2)
    ctx.lineTo(6, -2.6)
    ctx.closePath()
    ctx.fill()

    // 刃中脊（飞白细线）
    ctx.globalAlpha = 0.35
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-7, 0)
    ctx.lineTo(18, 0)
    ctx.stroke()

    // 护手
    ctx.globalAlpha = 0.9
    ctx.beginPath()
    ctx.moveTo(-8, -5.5)
    ctx.lineTo(-5, -5.5)
    ctx.lineTo(-5, 5.5)
    ctx.lineTo(-8, 5.5)
    ctx.closePath()
    ctx.fill()
    // 护手横档
    ctx.beginPath()
    ctx.ellipse(-6.5, 0, 2.2, 6.2, 0, 0, Math.PI * 2)
    ctx.fill()

    // 剑柄
    ctx.globalAlpha = 0.88
    ctx.beginPath()
    ctx.moveTo(-8, -1.6)
    ctx.lineTo(-18, -1.4)
    ctx.lineTo(-18, 1.4)
    ctx.lineTo(-8, 1.6)
    ctx.closePath()
    ctx.fill()

    // 柄头
    ctx.beginPath()
    ctx.arc(-19.5, 0, 2.2, 0, Math.PI * 2)
    ctx.fill()

    // 墨点飞白
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

    // 尾部淡墨气
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
    ctx.drawImage(img, -size / 2, -size / 2, size, size)
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

    for (let i = 0; i < this._pickups.length; i++) this._drawLoot(ctx, this._pickups[i])
    for (let i = 0; i < this._swords.length; i++) this._drawFlyingSword(ctx, this._swords[i])

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
      this._drawSprite(ctx, img, drawX, drawY, size, flashOnly, null, faceLeft)
      ctx.restore()
      if (z.typeName && emerge > 0.55 && z.state !== 'dead') {
        ctx.save()
        ctx.globalAlpha = 0.92
        ctx.fillStyle = '#f8fafc'
        ctx.strokeStyle = 'rgba(15,23,42,0.55)'
        ctx.lineWidth = 3
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.strokeText(z.typeName, drawX, drawY - size * 0.48)
        ctx.fillText(z.typeName, drawX, drawY - size * 0.48)
        ctx.restore()
      }
      if (attacking || z.atkFx) this._drawMonsterAttackFx(ctx, z, drawY, size, drawX)
      this._drawZombieElementFx(ctx, z, drawY)

      const hideBar = z.state === 'emerge' || (this._gengFx && (this._gengFx.phase === 'suck' || this._gengFx.phase === 'zap' || this._gengFx.phase === 'end'))
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

      if (z === this._focusZombie && z.state !== 'dead') {
        const ringR = z.isBoss ? size * 0.42 : (z.r + 10)
        ctx.strokeStyle = '#fde047'
        ctx.lineWidth = z.isBoss ? 2.5 : 2
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        ctx.arc(drawX, drawY, ringR, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    }

    this._drawGooShots(ctx)
    this._drawGroundSwords(ctx)

    // 元婴剑侍（画在主角下层，技能帧带剑气）
    this._drawHelper(ctx)

    const heroImg = this._isMortalCultivate()
      ? this._mortalMeditateFrame()
      : this._playerImg
    // 升级演出中隐藏本体；环剑先画在正后方，再画人物盖住
    const upgrading = !!(this._spiritFx || this._breakFx)
    const mortal = this._isMortalCultivate()
    if (!this._gengFx && !upgrading && !mortal) {
      if (!this._perfect) this._drawOrbitSwords(ctx, realm)
      this._drawRideSword(ctx, realm)
    }
    if (!upgrading) {
      if (mortal) this._drawMortalQiAura(ctx)
      else if (this._meditating) this._drawMeditateAura(ctx)
      const hurtFlash = this._playerHurtT > 0 ? 'rgba(255,255,255,0.4)' : null
      const size = mortal ? 96 : 76
      const hide = (this._playerHideT || 0) > 0
      ctx.save()
      if (hide) ctx.globalAlpha = 0.32 + Math.sin((this._animT || 0) * 8) * 0.08
      // 扔符时人物略前倾并抬手
      const throwPose = this._fuThrow && this._fuThrow.t < (this._fuThrow.wind || 0.28)
      const py = this._playerY - (mortal ? 10 : 8) - (throwPose ? 4 : 0)
      this._drawSprite(ctx, heroImg, this._playerX + (throwPose ? 3 : 0), py, size * (throwPose ? 1.04 : 1), hurtFlash, null)
      if (throwPose) this._drawThrowFuHand(ctx)
      ctx.restore()
      if (!this._perfectFx) this._drawRealmBadge(ctx, realm)
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

  _drawGroundSwords(ctx) {
    const list = this._groundSwords || []
    for (let i = 0; i < list.length; i++) {
      const s = list[i]
      const g = Math.max(0.08, Math.min(1, s.grow || 0))
      ctx.save()
      ctx.translate(s.x, s.y)
      // 土堆
      ctx.fillStyle = 'rgba(120, 80, 40, 0.55)'
      ctx.beginPath()
      ctx.ellipse(0, 6, 12, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.save()
      ctx.beginPath()
      ctx.rect(-16, -40 * g, 32, 40 * g)
      ctx.clip()
      ctx.translate(0, 18 - 36 * g)
      ctx.rotate(-Math.PI / 2)
      this._paintInkSword(ctx, '#fde68a', 0.85 * (0.7 + 0.3 * g))
      ctx.restore()
      if (g >= 1) {
        ctx.globalAlpha = 0.4 + Math.sin((this._animT || 0) * 6) * 0.15
        ctx.strokeStyle = '#fef08a'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(0, -8, 16, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
    }
  },

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

  /** 凡人打坐分镜（循环） */
  _mortalMeditateFrame() {
    const imgs = this._mortalMeditateImgs || []
    if (!imgs.length) return this._playerImg
    const fps = 2.4
    const idx = Math.floor((this._animT || 0) * fps) % imgs.length
    return imgs[idx] || imgs[0] || this._playerImg
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
    ctx.fillStyle = 'rgba(15,23,42,0.55)'
    ctx.fillRect(x - 4, y - 14, barW + 8, thick + 40)
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
    ctx.restore()
  },

  /** 经验条 + 尸丹条；凡人阶段显示灵气入体进度 */
  _drawExpAndDanBars(ctx, realm) {
    const w = this._w
    const barW = Math.min(148, w * 0.4)
    const x = 12
    const y = 86
    ctx.save()
    if (this._isMortalCultivate()) {
      const qi = this._qiAbsorb || 0
      const ratio = Math.min(1, qi / MORTAL_QI_NEED)
      ctx.fillStyle = 'rgba(15,23,42,0.55)'
      ctx.fillRect(x - 2, y - 12, barW + 8, 36)
      ctx.fillStyle = '#a5f3fc'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('天地灵气入体 →炼气', x, y)
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(x, y + 4, barW, 9)
      ctx.fillStyle = '#22d3ee'
      ctx.fillRect(x, y + 4, barW * ratio, 9)
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.strokeRect(x, y + 4, barW, 9)
      ctx.fillStyle = '#f8fafc'
      ctx.font = '9px sans-serif'
      ctx.fillText(Math.floor(qi) + '/' + MORTAL_QI_NEED, x + 2, y + 12)
      ctx.restore()
      return
    }
    const exp = realmExpProgress(this._kills || 0, this._realmLv || 1)
    const dan = this._corpseDan || 0
    const danNeed = CORPSE_DAN_NEED
    ctx.fillStyle = 'rgba(15,23,42,0.55)'
    ctx.fillRect(x - 2, y - 12, barW + 8, 48)

    ctx.fillStyle = '#e2e8f0'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'left'
    let expLabel = exp.maxed ? '经验 大圆满' : ('经验 →' + exp.nextName)
    if (exp.awaitBoss || this._bossActive) expLabel = this._bossActive ? '击败劫尸突破' : ('劫尸将至 →' + exp.nextName)
    ctx.fillText(expLabel, x, y)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(x, y + 4, barW, 7)
    ctx.fillStyle = (exp.awaitBoss || this._bossActive) ? '#fbbf24' : '#38bdf8'
    ctx.fillRect(x, y + 4, barW * exp.ratio, 7)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.strokeRect(x, y + 4, barW, 7)
    ctx.fillStyle = '#f8fafc'
    ctx.font = '9px sans-serif'
    ctx.fillText(exp.maxed ? 'MAX' : (exp.cur + '/' + exp.need), x + 2, y + 10)

    ctx.fillStyle = '#e2e8f0'
    ctx.font = '10px sans-serif'
    ctx.fillText('尸丹 ' + dan + '/' + danNeed, x, y + 26)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(x, y + 30, barW, 7)
    ctx.fillStyle = '#c4b5fd'
    ctx.fillRect(x, y + 30, barW * Math.min(1, dan / danNeed), 7)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.strokeRect(x, y + 30, barW, 7)
    ctx.restore()
  },

  /** 大庚剑阵：身上汇聚 → 飞向中央围圆 + 雷丝（约 10s） */
  _drawGengFormation(ctx) {
    const fx = this._gengFx
    if (!fx) return
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

    // 64 金黄雷电剑
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

  /** 环剑画在人物正后方：剑圈中心略偏身后，扁椭圆环，绘制顺序在人物之前 */
  _drawOrbitSwords(ctx, realm) {
    const owned = Math.max(1, Math.min(MAX_SWORD_COUNT, this._swordCount || 1))
    const inFlight = (this._swords || []).length
    const n = Math.max(0, owned - Math.min(owned, inFlight))
    if (n <= 0) return

    // 正后方：圆心在躯干后侧（略上移），扁椭圆如背后剑轮
    const cx = this._playerX
    const cy = this._playerY - 14
    const color = realm.sword || realm.color || '#334155'
    const layers = n <= 16 ? 1 : (n <= 36 ? 2 : 3)
    const baseSpin = (this._animT || 0) * 1.05
    let drawn = 0
    for (let layer = 0; layer < layers; layer++) {
      const remain = n - drawn
      const layersLeft = layers - layer
      const count = Math.ceil(remain / layersLeft)
      const rx = 20 + layer * 11
      const ry = 11 + layer * 6
      const spin = baseSpin * (layer % 2 === 0 ? 1 : -0.85) + layer * 0.55
      const scale = Math.max(0.24, 0.34 - layer * 0.03)
      const alpha = 0.78 - layer * 0.1
      for (let i = 0; i < count; i++) {
        const a = spin + (Math.PI * 2 * i) / count
        const x = cx + Math.cos(a) * rx
        const y = cy + Math.sin(a) * ry - 2
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(a + Math.PI * 0.5)
        ctx.globalAlpha = alpha
        this._paintInkSword(ctx, color, scale)
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
