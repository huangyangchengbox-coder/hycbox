/**
 * 仙途：草地上修仙斩尸。
 * 击杀达门槛突破境界：清场 + 境界特效；尸体会随境界变大。
 */

/** 远程资源根路径（后台 uploads），避免主包图片超 200K 质量门禁 */
const ASSET_BASE = 'https://hychyr.top/uploads/game/xian'
/** 资源版本号：换图后递增，避免微信缓存旧图 */
const ASSET_VER = '20260729c'

function assetUrl(relPath) {
  return ASSET_BASE + '/' + String(relPath || '').replace(/^\//, '') + '?v=' + ASSET_VER
}

/** 修仙境界表：kills=突破所需击杀；tier 决定升阶特效风格 */
const REALMS = [
  {
    kills: 0, name: '炼气', tier: '下', tierName: '下境界',
    color: '#94a3b8', glow: 'rgba(148,163,184,0.45)', sword: '#1e293b',
    short: '吸纳灵气温养经脉，初掌术法神识',
    desc: '修仙初始阶段，共13层小境界。修士能吸纳天地灵气，温养经脉四肢并汇聚于丹田，初步掌握灵气术法和神识。体质比凡人强，可使用简单法术，寿元约100-120岁。'
  },
  {
    kills: 12, name: '筑基', tier: '下', tierName: '下境界',
    color: '#38bdf8', glow: 'rgba(56,189,248,0.5)', sword: '#0369a1',
    short: '灵气成液，辟谷御剑，寿元大增',
    desc: '丹田灵气成液态，修士可辟谷、长时间御剑飞行，神识倍增，寿元达200-250岁。能使用先天真火炼丹炼器，为结丹打基础。'
  },
  {
    kills: 35, name: '结丹', tier: '下', tierName: '下境界',
    color: '#a78bfa', glow: 'rgba(167,139,250,0.55)', sword: '#6d28d9',
    short: '凝结金丹，真元深厚，可炼本命法宝',
    desc: '丹田灵气凝结成固体金丹，真元由气态变液态，可炼制本命法宝，不借助法器飞行，寿元500-600岁。结丹巅峰称假婴境。'
  },
  {
    kills: 70, name: '元婴', tier: '下', tierName: '下境界',
    color: '#f472b6', glow: 'rgba(244,114,182,0.55)', sword: '#be185d',
    short: '金丹化婴，可夺舍重生，人界高端战力',
    desc: '金丹孕育出元婴，寿元约1000-1200岁。元婴可脱离肉身行动，即使肉身被毁也能夺舍重生，对天地元气感应敏锐。'
  },
  {
    kills: 120, name: '化神', tier: '下', tierName: '下境界',
    color: '#fbbf24', glow: 'rgba(251,191,36,0.6)', sword: '#b45309',
    short: '元婴向元神过渡，可调动天地灵气',
    desc: '元婴成长为幼年状态，向元神过渡，可调动天地灵气作战，人界灵气稀薄出手耗寿，寿元2000-2500岁。少参与争斗，寻飞升机缘。'
  },
  {
    kills: 180, name: '炼虚', tier: '中', tierName: '中境界',
    color: '#2dd4bf', glow: 'rgba(45,212,191,0.55)', sword: '#0f766e',
    short: '元婴成少年，炼化天地元气，近乎长生',
    desc: '元婴成长为少年状态，可化为虚影，能炼化天地元气为己用。每3000年一大天劫，一般最多扛过三次，寿命约一万三千年。'
  },
  {
    kills: 260, name: '合体', tier: '中', tierName: '中境界',
    color: '#818cf8', glow: 'rgba(129,140,248,0.55)', sword: '#4338ca',
    short: '虚影合身，掌属性抗天劫，动用法则雏形',
    desc: '元婴成长为青年，将虚影与本体融合，可掌握一种五行或变异属性抗衡天劫。强者可扛过10次大天劫，活四五万年，能驱使天地元气化形。'
  },
  {
    kills: 360, name: '大乘', tier: '中', tierName: '中境界',
    color: '#fb7185', glow: 'rgba(251,113,133,0.55)', sword: '#be123c',
    short: '神游太虚，掌多属性，初用法则之力',
    desc: '元婴成长为成人状态，完全脱离肉身限制，神游太虚。可掌握两种及以上属性，至少可活10万年，顶级可活百万年，能初步使用法则之力。'
  },
  {
    kills: 480, name: '真仙', tier: '上', tierName: '上境界',
    color: '#fde68a', glow: 'rgba(253,230,138,0.6)', sword: '#ca8a04',
    short: '领悟法则，开仙窍，渡天人五衰',
    desc: '需领悟法则之力，三个小境界各炼12仙窍，至36窍可进阶金仙。有天人五衰之劫；未悟法则则为散仙、地仙等。'
  },
  {
    kills: 620, name: '金仙', tier: '上', tierName: '上境界',
    color: '#fdba74', glow: 'rgba(253,186,116,0.6)', sword: '#c2410c',
    short: '渡魂衰煞衰，凝法则之丝，展灵域',
    desc: '需渡过天人五衰最后两衰（魂衰、煞衰），可凝聚法则之丝，施展基础灵域。打开108个仙窍后可进阶太乙。'
  },
  {
    kills: 780, name: '太乙', tier: '上', tierName: '上境界',
    color: '#e7e5e4', glow: 'rgba(231,229,228,0.65)', sword: '#78716c',
    short: '玉体法力无尽，灵域可演化小世界',
    desc: '肉身变为法力无限的玉体，能更好凝聚法则。领悟一种法则可掌握一方天地，灵域可演化成小世界。'
  },
  {
    kills: 960, name: '大罗', tier: '上', tierName: '上境界',
    color: '#c4b5fd', glow: 'rgba(196,181,253,0.65)', sword: '#6d28d9',
    short: '斩三尸断尘缘，法体神魂不灭',
    desc: '进阶道祖需斩三次尸魂（恶、善、自我），禁断尘缘。法体神魂不灭，灵域化界，身法神魂凝炼一体。'
  },
  {
    kills: 1200, name: '道祖', tier: '上', tierName: '上境界',
    color: '#fff7ed', glow: 'rgba(255,247,237,0.75)', sword: '#9a3412',
    short: '融合三千大道，法则至尊',
    desc: '融合三千大道，成为法则至尊，天地间无敌，除非遇到同境道祖。'
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

/** 地面掉落：飞剑/血包；电火风冰符靠近拾取后附魔飞剑 10 秒 */
const LOOT_DEFS = {
  sword: { kind: 'sword', label: '飞剑', color: '#fde68a' },
  hp: { kind: 'hp', label: '血包', color: '#f87171' },
  elec: { kind: 'enchant', label: '电符', color: '#67e8f9', mark: '电' },
  fire: { kind: 'enchant', label: '火符', color: '#fb923c', mark: '火' },
  wind: { kind: 'enchant', label: '风符', color: '#86efac', mark: '风' },
  ice: { kind: 'enchant', label: '冰符', color: '#93c5fd', mark: '冰' }
}

const ENCHANT_DURATION = 10
const ENCHANT_KEYS = ['elec', 'fire', 'wind', 'ice']

function playerMaxHpByRealm(realm) {
  const tierBonus = realm.tier === '上' ? 50 : (realm.tier === '中' ? 24 : 0)
  return 48 + realm.lv * 16 + tierBonus
}

const TOMB_COUNT = 4
const TOMB_PATHS = buildAnimPaths('tombs', 'tomb', TOMB_COUNT)

/** 任务角色固定为指定原图，不再随机换皮 */
const PLAYER_PATH = assetUrl('heroes/player_fixed.png')

const GRASS_PATH = assetUrl('bg_forest.png')

function realmByKills(kills) {
  let r = REALMS[0]
  let lv = 1
  for (let i = 0; i < REALMS.length; i++) {
    if (kills >= REALMS[i].kills) {
      r = REALMS[i]
      lv = i + 1
    }
  }
  // 尸体积随境界放大
  const bodyScale = 1 + (lv - 1) * 0.09
  return Object.assign({}, r, { lv, bodyScale })
}

/** 经验进度：当前境界 → 下一境界 */
function realmExpProgress(kills) {
  const r = realmByKills(kills)
  const idx = r.lv - 1
  const cur = REALMS[idx].kills
  const hasNext = idx + 1 < REALMS.length
  const next = hasNext ? REALMS[idx + 1].kills : cur
  const nextName = hasNext ? REALMS[idx + 1].name : '大圆满'
  const span = Math.max(1, next - cur)
  const ratio = hasNext ? Math.min(1, Math.max(0, (kills - cur) / span)) : 1
  return {
    ratio: ratio,
    cur: kills - cur,
    need: span,
    nextName: nextName,
    maxed: !hasNext
  }
}

const CORPSE_DAN_NEED = 50
const GENG_SWORD_COUNT = 64

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
    realmName: '炼气',
    realmTierName: '下境界',
    swordCount: 1,
    wave: 1,
    hp: 48,
    maxHp: 48,
    over: false,
    perfect: false,
    autoPilot: false,
    showRealmInfo: false,
    corpseDan: 0,
    corpseDanNeed: 50,
    realmInfoList: buildRealmInfoList()
  },

  onReady() {
    this._initCanvas()
  },

  onUnload() {
    this._stop()
  },

  onHide() {
    this._paused = true
  },

  onShow() {
    this._paused = false
  },

  onTouchStart(e) {
    const t = e.touches && e.touches[0]
    if (!t || this._over || this._perfect) return
    this._dragging = true
    this._moved = false
    this._touchX = t.x
    this._touchY = t.y
    this._movePlayerTo(t.x, t.y)
  },

  onTouchMove(e) {
    const t = e.touches && e.touches[0]
    if (!t || !this._dragging || this._perfect) return
    if (Math.abs(t.x - this._touchX) > 8 || Math.abs(t.y - this._touchY) > 8) {
      this._moved = true
    }
    this._movePlayerTo(t.x, t.y)
  },

  onTouchEnd(e) {
    if (this._dragging && !this._moved) {
      const t = (e.changedTouches && e.changedTouches[0]) || {}
      const x = t.x != null ? t.x : this._touchX
      const y = t.y != null ? t.y : this._touchY
      // 先点底部开关，再锁定僵尸
      if (!this._tryTapCtrl(x, y)) {
        this._tryFocusZombie(x, y)
      }
    }
    this._dragging = false
  },

  restart() {
    this._resetGame()
    const r = realmByKills(0)
    this.setData({
      kills: 0,
      realmLv: 1,
      realmName: '炼气',
      realmTierName: '下境界',
      swordCount: 1,
      wave: 1,
      hp: r.maxHp || playerMaxHpByRealm(r),
      maxHp: playerMaxHpByRealm(r),
      over: false,
      perfect: false,
      showRealmInfo: false,
      autoPilot: this.data.autoPilot,
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

  /** 开关：自动御剑捡包 + 躲尸/躲雷 */
  toggleAutoPilot() {
    const on = !this.data.autoPilot
    this.setData({ autoPilot: on })
    wx.showToast({
      title: on ? '自动飞行已开' : '自动飞行已关',
      icon: 'none',
      duration: 1200
    })
  },

  /** 画布底部按钮热区（cover-view 不可见时仍可点） */
  _getCtrlRects() {
    const w = this._w || 300
    const h = this._h || 500
    const btnW = 72
    const btnH = 26
    const gap = 10
    const y = h - 64
    const x0 = (w - (btnW * 2 + gap)) / 2
    return {
      auto: { x: x0, y: y, w: btnW, h: btnH },
      realm: { x: x0 + btnW + gap, y: y, w: btnW, h: btnH }
    }
  },

  _tryTapCtrl(x, y) {
    if (this._over || this._perfect || this.data.showRealmInfo) return false
    const r = this._getCtrlRects()
    if (x >= r.auto.x && x <= r.auto.x + r.auto.w && y >= r.auto.y && y <= r.auto.y + r.auto.h) {
      this.toggleAutoPilot()
      return true
    }
    if (x >= r.realm.x && x <= r.realm.x + r.realm.w && y >= r.realm.y && y <= r.realm.y + r.realm.h) {
      this.toggleRealmInfo()
      return true
    }
    return false
  },

  _drawCtrlButtons(ctx) {
    if (this._over || this._perfect || this.data.showRealmInfo) return
    const rects = this._getCtrlRects()
    const labels = [
      { key: 'auto', text: this.data.autoPilot ? '自动中' : '自动', on: this.data.autoPilot },
      { key: 'realm', text: '境界', on: false }
    ]
    for (let i = 0; i < labels.length; i++) {
      const conf = labels[i]
      const box = rects[conf.key]
      ctx.save()
      ctx.fillStyle = conf.on ? 'rgba(22,101,52,0.88)' : 'rgba(15,23,42,0.82)'
      ctx.fillRect(box.x, box.y, box.w, box.h)
      ctx.strokeStyle = conf.on ? 'rgba(134,239,172,0.75)' : 'rgba(248,250,252,0.3)'
      ctx.lineWidth = 1
      ctx.strokeRect(box.x, box.y, box.w, box.h)
      ctx.fillStyle = conf.on ? '#bbf7d0' : '#f8fafc'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(conf.text, box.x + box.w / 2, box.y + box.h / 2 + 1)
      ctx.restore()
    }
  },

  _initCanvas() {
    const query = wx.createSelectorQuery()
    query
      .select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          wx.showToast({ title: '画布初始化失败', icon: 'none' })
          return
        }
        const canvas = res[0].node
        const width = res[0].width
        const height = res[0].height
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
        this._tombImgs = []
        this._playerImg = null
        this._grassImg = null
        this._resetGame()
        this._loadImages(() => this._loop())
      })
  },

  _loadImages(done) {
    const canvas = this._canvas
    if (!canvas) return
    const animKeys = Object.keys(ANIM_DEFS)
    let left = 1 + TOMB_COUNT + 1
    for (let k = 0; k < animKeys.length; k++) left += ANIM_DEFS[animKeys[k]].paths.length

    const animImgs = { idle: [], walk: [], attack: [], hurt: [], dead: [] }
    const tombImgs = new Array(TOMB_COUNT)
    let playerImg = null
    let grassImg = null

    const finish = () => {
      if (left > 0) return
      this._animImgs = animImgs
      this._tombImgs = tombImgs
      this._playerImg = playerImg
      this._grassImg = grassImg
      this.setData({ hp: Math.ceil(this._hp), maxHp: this._maxHp })
      if (!playerImg || !grassImg) {
        console.warn('仙途资源未就绪，请确认已上传到', ASSET_BASE)
        wx.showToast({ title: '游戏资源加载失败', icon: 'none', duration: 2500 })
      }
      if (done) done()
    }

    function loadOne(src, onOk) {
      const img = canvas.createImage()
      img.onload = () => {
        onOk(img)
        left -= 1
        finish()
      }
      img.onerror = () => {
        console.warn('资源加载失败', src)
        left -= 1
        finish()
      }
      img.src = src
    }

    for (let k = 0; k < animKeys.length; k++) {
      const key = animKeys[k]
      const paths = ANIM_DEFS[key].paths
      animImgs[key] = new Array(paths.length)
      for (let i = 0; i < paths.length; i++) {
        loadOne(paths[i], ((kk, ii) => (img) => { animImgs[kk][ii] = img })(key, i))
      }
    }
    for (let i = 0; i < TOMB_COUNT; i++) {
      loadOne(TOMB_PATHS[i], (img) => { tombImgs[i] = img })
    }
    loadOne(PLAYER_PATH, (img) => { playerImg = img })
    loadOne(GRASS_PATH, (img) => { grassImg = img })
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
    this._tombs = this._buildTombs(w, h)
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
    this._lightningAcc = 4 + Math.random() * 6
    this._animT = 0
    this._over = false
    this._perfect = false
    this._perfectFx = null
    this._lastTs = 0
    this._raf = null
    this._breakFx = null
    this._breakMute = 0
    this._realmLv = 1
    this._freezeT = 0
    this._playerHurtT = 0
    this._swordEnchant = null
    this._corpseDan = 0
    this._gengFx = null
    const r0 = realmByKills(0)
    this._maxHp = playerMaxHpByRealm(r0)
    this._hp = this._maxHp
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

  /** 草地上散落卡通墓碑（装饰，不挡碰撞） */
  _buildTombs(w, h) {
    const list = []
    const m = 36
    // 固定几处显眼落点，再补随机，确保新墓碑一眼能看到
    const spots = [
      { x: w * 0.18, y: h * 0.28 },
      { x: w * 0.78, y: h * 0.32 },
      { x: w * 0.22, y: h * 0.58 },
      { x: w * 0.72, y: h * 0.62 },
      { x: w * 0.48, y: h * 0.22 },
      { x: w * 0.55, y: h * 0.72 }
    ]
    for (let i = 0; i < spots.length; i++) {
      list.push({
        x: spots[i].x,
        y: spots[i].y,
        idx: i % TOMB_COUNT,
        scale: 1.15 + (i % 3) * 0.12
      })
    }
    for (let i = 0; i < 4; i++) {
      list.push({
        x: m + Math.random() * (w - m * 2),
        y: m + 50 + Math.random() * (h - m * 2 - 100),
        idx: i % TOMB_COUNT,
        scale: 0.95 + Math.random() * 0.35
      })
    }
    return list
  },

  _stop() {
    this._over = true
    if (this._raf && this._canvas) {
      this._canvas.cancelAnimationFrame(this._raf)
      this._raf = null
    }
  },

  /** 全地图行走，边缘留边 */
  _movePlayerTo(x, y) {
    const m = this._margin || 28
    const w = this._w || 300
    const h = this._h || 500
    const minY = 56
    this._playerX = Math.max(m, Math.min(w - m, x))
    if (y != null) {
      this._playerY = Math.max(minY, Math.min(h - m, y))
    }
  },

  /**
   * 自动御剑：优先远离近处僵尸与雷罚预警圈，其次飞向掉落物
   */
  _updateAutoPilot(dt) {
    if (!this.data.autoPilot || this._dragging || this._over || this._perfect || this._perfectFx) return
    const px = this._playerX
    const py = this._playerY
    let vx = 0
    let vy = 0

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

    // 2) 躲避雷罚预警
    const bolts = this._bolts || []
    for (let i = 0; i < bolts.length; i++) {
      const b = bolts[i]
      if (b.phase !== 'warn') continue
      const dx = px - b.x
      const dy = py - b.y
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      const safe = (b.r || 42) + 48
      if (d < safe) {
        const w = (safe - d) / safe
        vx += (dx / d) * w * 3.2
        vy += (dy / d) * w * 3.2
      }
    }

    const fleeForce = vx * vx + vy * vy
    // 3) 不紧急时去捡包（血低优先血包，否则就近符/剑）
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
    const speed = 155 + Math.min(40, (this._realmLv || 1) * 3)
    this._movePlayerTo(px + (vx / len) * speed * dt, py + (vy / len) * speed * dt)
  },

  /** 自动飞行要去捡的掉落：低血优先血包 */
  _autoPilotLootTarget() {
    const list = this._pickups || []
    if (!list.length) return null
    const needHp = this._hp < this._maxHp * 0.55
    let best = null
    let bestScore = -1e12
    for (let i = 0; i < list.length; i++) {
      const p = list[i]
      const dx = p.x - this._playerX
      const dy = p.y - this._playerY
      const d = Math.sqrt(dx * dx + dy * dy)
      let score = 800 - d
      if (needHp && p.key === 'hp') score += 400
      else if (p.key === 'elec' || p.key === 'fire' || p.key === 'wind' || p.key === 'ice') score += 180
      else if (p.key === 'sword') score += 80
      else if (p.key === 'hp') score += 120
      // 掉落附近有僵尸则降权
      for (let zi = 0; zi < this._zombies.length; zi++) {
        const z = this._zombies[zi]
        if (z.state === 'dead') continue
        const zx = z.x - p.x
        const zy = z.y - p.y
        if (zx * zx + zy * zy < 70 * 70) {
          score -= 220
          break
        }
      }
      if (score > bestScore) {
        bestScore = score
        best = p
      }
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
      this._update(dt)
      this._draw()
    }
    this._raf = this._canvas.requestAnimationFrame(tick)
  },

  _update(dt) {
    this._animT += dt
    this._wave = 1 + Math.floor(this._kills / 12)
    const realm = realmByKills(this._kills)
    this._syncPlayerHpCap(realm)

    // 自动飞行：捡包、躲尸、躲雷罚（拖动时暂停，手控优先）
    this._updateAutoPilot(dt)
    // 御剑遁光拖尾
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
    if (this._swordEnchant) {
      this._swordEnchant.t -= dt
      if (this._swordEnchant.t <= 0) this._swordEnchant = null
    }

    if (this._focusZombie && this._zombies.indexOf(this._focusZombie) < 0) {
      this._focusZombie = null
    }

    // 僵尸更少：间隔更长，且限制场上数量
    const spawnEvery = Math.max(1.35, 2.6 - this._wave * 0.06 - realm.lv * 0.04)
    const maxZ = Math.min(5, 2 + Math.floor(realm.lv / 3))
    this._spawnAcc += dt
    if (!this._gengFx && this._breakMute <= 0 && this._zombies.length < maxZ && this._spawnAcc >= spawnEvery) {
      this._spawnAcc = 0
      this._spawnZombie()
    }

    this._pickupAcc += dt
    if (!this._gengFx && this._pickupAcc >= Math.max(5.5, 8.5 - realm.lv * 0.35)) {
      this._pickupAcc = 0
      this._spawnLoot('sword')
    }

    this._lootAcc += dt
    if (!this._gengFx && this._lootAcc >= 6 + Math.random() * 5) {
      this._lootAcc = 0
      this._spawnRandomLoot()
    }

    // 随机雷罚
    if (!this._gengFx) this._updateLightning(dt, realm)

    const shootEvery = Math.max(0.22, 0.55 - realm.lv * 0.045)
    this._swordAcc += dt
    if (!this._gengFx && this._swordAcc >= shootEvery) {
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

    // 掉落物浮动：靠近即可拾取（符咒附魔飞剑）
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
        const deadLen = ANIM_DEFS.dead.paths.length / ANIM_DEFS.dead.fps
        if (z.frameT >= deadLen) {
          if (this._focusZombie === z) this._focusZombie = null
          this._zombies.splice(i, 1)
          this._registerKill()
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

      // 出土动画：手 → 露头 → 半身，约 1 秒播完再追人
      if (z.state === 'emerge' || z.emerge < 1) {
        z.state = 'emerge'
        z.emerge = Math.min(1, z.emerge + dt / 1.05)
        if (z.emerge >= 1) {
          z.state = 'walk'
          z.frameT = 0
          z.emerge = 1
        }
        continue
      }

      // 冰冻：无法行动
      if ((z.iceT || 0) > 0) {
        z.state = 'idle'
        continue
      }

      // 风困：吹起并绕风圈旋转
      if ((z.windT || 0) > 0) {
        z.state = 'idle'
        z.windA = (z.windA || 0) + dt * 2.4
        const wr = z.windR || 36
        z.x = (z.windCx || z.x) + Math.cos(z.windA) * wr
        z.y = (z.windCy || z.y) + Math.sin(z.windA) * wr * 0.55
        z.floatY = 22 + Math.sin(this._animT * 6 + z.id) * 6
        continue
      }

      // 剑阵整段期间：僵尸冻结，由剑阵逻辑驱动位移
      if (this._gengFx) {
        z.state = 'idle'
        continue
      }

      if (z.state === 'attack') {
        const atkLen = ANIM_DEFS.attack.paths.length / ANIM_DEFS.attack.fps
        if (z.frameT >= atkLen * 0.55 && !z.hitDone) {
          z.hitDone = true
          this._hurtPlayer(10 + realm.lv * 2, z.x, z.y)
        }
        if (z.frameT >= atkLen) {
          z.state = 'walk'
          z.frameT = 0
          z.hitDone = false
        }
        continue
      }

      z.floatY = 0
      z.state = 'walk'
      const dx = this._playerX - z.x
      const dy = this._playerY - z.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const spd = (baseSpeed + z.speedBonus) * dt
      z.x += (dx / dist) * spd
      z.y += (dy / dist) * spd
      z.facing = Math.atan2(dy, dx)
      if (dist <= z.r + 18) {
        z.state = 'attack'
        z.frameT = 0
        z.hitDone = false
      }
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

    if (this.data.wave !== this._wave || this.data.hp !== Math.ceil(this._hp)) {
      this.setData({ wave: this._wave, hp: Math.ceil(this._hp), maxHp: this._maxHp })
    }
  },

  _collectPickup(index) {
    const p = this._pickups[index]
    if (!p) return
    const def = LOOT_DEFS[p.key] || LOOT_DEFS.sword
    if (p.key === 'sword') {
      this._swordCount = Math.min(12, this._swordCount + 1)
      this.setData({ swordCount: this._swordCount })
    } else if (p.key === 'hp') {
      this._healPlayer(Math.floor(this._maxHp * 0.28))
    } else if (def.kind === 'enchant') {
      // 靠近拾取：附魔飞剑，维持 10 秒
      this._swordEnchant = { type: p.key, t: ENCHANT_DURATION, color: def.color, label: def.label }
      this._burst(this._playerX, this._playerY, def.color, 16)
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
      this._burst(z.x, z.y, realm.color, 12)
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
      this._burst(z.x, z.y, realm.color, 12)
    } else if ((z.iceT || 0) <= 0 && (z.windT || 0) <= 0) {
      z.state = 'hurt'
      z.frameT = 0
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
  },

  _healPlayer(n) {
    this._hp = Math.min(this._maxHp, this._hp + n)
    this.setData({ hp: Math.ceil(this._hp), maxHp: this._maxHp })
  },

  _hurtPlayer(dmg, fromX, fromY) {
    if (this._perfect || this._over) return
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
    if (moved) {
      const n = 1 + Math.min(3, Math.floor(realm.lv / 4))
      for (let i = 0; i < n; i++) {
        this._trails.push({
          x: this._playerX - dx * (0.2 + i * 0.15),
          y: this._playerY - dy * (0.2 + i * 0.15) + 10,
          life: 0.35 + realm.lv * 0.02,
          color: realm.color,
          r: 3 + realm.lv * 0.25
        })
      }
    }
    this._prevPlayerX = this._playerX
    this._prevPlayerY = this._playerY
  },

  _updateLightning(dt, realm) {
    this._lightningAcc -= dt
    for (let i = this._bolts.length - 1; i >= 0; i--) {
      const b = this._bolts[i]
      b.t += dt
      if (b.phase === 'warn' && b.t >= b.warnDur) {
        b.phase = 'strike'
        b.t = 0
        const dx = this._playerX - b.x
        const dy = this._playerY - b.y
        if (dx * dx + dy * dy <= b.r * b.r) {
          this._hurtPlayer(14 + realm.lv * 2, b.x, b.y)
        }
        this._burst(b.x, b.y, '#e0f2fe', 18)
      } else if (b.phase === 'strike' && b.t >= 0.45) {
        this._bolts.splice(i, 1)
      }
    }
    if (this._lightningAcc <= 0) {
      this._lightningAcc = 7 + Math.random() * 10
      this._spawnBoltWarn()
    }
  },

  _spawnBoltWarn() {
    const m = 40
    this._bolts.push({
      x: m + Math.random() * (this._w - m * 2),
      y: m + Math.random() * (this._h - m * 2),
      r: 42,
      t: 0,
      warnDur: 1.15,
      phase: 'warn'
    })
  },

  _spawnBoltVisual(x, y, dur) {
    this._bolts.push({
      x, y, r: 28, t: 0, warnDur: 0, phase: 'strike', life: dur || 0.4
    })
  },

  _spawnLoot(key) {
    const def = LOOT_DEFS[key]
    if (!def) return
    const m = this._margin || 28
    const x = m + Math.random() * (this._w - m * 2)
    const y = 80 + Math.random() * Math.max(40, this._h - 180)
    this._pickups.push({
      key,
      x,
      y,
      spin: 0,
      bob: Math.random() * 3,
      life: def.kind === 'enchant' ? 16 : 14,
      speed: 0
    })
  },

  _spawnRandomLoot() {
    const roll = Math.random()
    let key = 'hp'
    if (roll < 0.22) key = 'hp'
    else if (roll < 0.4) key = 'elec'
    else if (roll < 0.58) key = 'fire'
    else if (roll < 0.76) key = 'wind'
    else if (roll < 0.92) key = 'ice'
    else key = 'sword'
    this._spawnLoot(key)
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

  /** 全草地随机钻出（少而硬） */
  _spawnZombie() {
    const realm = realmByKills(this._kills)
    const hp = 10 + Math.floor(this._wave * 3.5) + realm.lv * 5 + Math.floor(this._kills / 25)
    const r = (20 + Math.min(8, this._wave * 0.35)) * realm.bodyScale
    const m = this._margin || 28
    const w = this._w
    const h = this._h
    let x = m + Math.random() * (w - m * 2)
    let y = 70 + Math.random() * Math.max(40, h - 140)
    const pdx = x - this._playerX
    const pdy = y - this._playerY
    if (pdx * pdx + pdy * pdy < 130 * 130) {
      const ang = Math.random() * Math.PI * 2
      x = this._playerX + Math.cos(ang) * (160 + Math.random() * 90)
      y = this._playerY + Math.sin(ang) * (160 + Math.random() * 90)
      x = Math.max(m, Math.min(w - m, x))
      y = Math.max(70, Math.min(h - m, y))
    }
    this._zombies.push({
      id: this._nextZid++,
      x,
      y,
      r,
      hp,
      maxHp: hp,
      speedBonus: Math.random() * 10,
      frameT: 0,
      emerge: 0,
      state: 'emerge',
      kx: 0,
      ky: 0,
      flash: 0,
      facing: 0
    })
  },

  /** 击杀入账；尸丹累计；跨境界清场 */
  _registerKill(opt) {
    const prevLv = this._realmLv || 1
    this._kills += 1
    const nr = realmByKills(this._kills)
    this._realmLv = nr.lv

    let triggerGeng = false
    // 剑阵斩杀不加尸丹，避免连环触发
    if (!(opt && opt.skipDan) && !this._gengFx) {
      this._corpseDan = (this._corpseDan || 0) + 1
      if (this._corpseDan >= CORPSE_DAN_NEED) {
        this._corpseDan = 0
        triggerGeng = true
      }
    }

    this.setData({
      kills: this._kills,
      wave: this._wave,
      realmLv: nr.lv,
      realmName: nr.name,
      realmTierName: nr.tierName,
      corpseDan: this._corpseDan || 0,
      corpseDanNeed: CORPSE_DAN_NEED
    })
    // 先突破清场，再开剑阵刷尸，避免被突破清掉
    if (nr.lv > prevLv) {
      this._onRealmBreakthrough(nr)
    }
    if (triggerGeng) {
      this._startGengFormation()
    }
  },

  /**
   * 大庚剑阵：尸丹满 50 触发，整段约 10 秒
   * 身上汇聚 64 金黄雷剑 → 各自飞向屏幕中央围圆（尖朝内）→ 吸入缩小散开 → 雷丝穿尸尽斩
   * 剑离身后，人物周围环剑/御剑暂时消失
   */
  _startGengFormation() {
    if (this._perfect || this._over) return
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
      tier: realm.tier
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
    const n = this._swordCount
    const baseAngle = -Math.PI / 2
    const spread = Math.min(1.1, 0.12 * (n - 1))
    const enc = this._swordEnchant
    const encType = enc && enc.t > 0 ? enc.type : null
    const encColor = encType && LOOT_DEFS[encType] ? LOOT_DEFS[encType].color : null
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1)
      const ang = baseAngle - spread / 2 + t * spread
      this._swords.push({
        x: this._playerX + Math.cos(ang + Math.PI / 2) * 6,
        y: this._playerY - 20,
        angle: ang,
        speed: 270 + realm.lv * 35 + (encType === 'wind' ? 40 : 0),
        dmg: 2 + Math.floor(realm.lv * 0.85),
        life: 4.5,
        color: encColor || realm.sword || realm.color,
        enchant: encType,
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
      realmName: realmByKills(this._kills).name
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
    const def = LOOT_DEFS[p.key] || LOOT_DEFS.sword
    const bob = Math.sin(p.bob || 0) * 3
    ctx.save()
    ctx.translate(p.x, p.y + bob)
    if (p.key === 'sword') {
      ctx.rotate(p.spin * 0.35 - Math.PI / 5)
      this._paintInkSword(ctx, def.color, 0.9)
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
      ctx.fillText(def.mark || (p.key === 'hp' ? '+' : '?'), 0, 1)
    }
    if (def.kind === 'enchant') {
      ctx.strokeStyle = def.color
      ctx.globalAlpha = 0.45
      ctx.beginPath()
      ctx.arc(0, 0, 18 + Math.sin((p.bob || 0) * 2) * 2, 0, Math.PI * 2)
      ctx.stroke()
    }
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

  _drawSprite(ctx, img, x, y, size, tintColor, tintBody) {
    if (!img) return
    ctx.save()
    ctx.translate(x, y)
    // 圆形光晕画在身后；不用 source-atop + 矩形，避免小程序画出方框
    if (tintColor || tintBody) {
      const c = tintBody || '#ffffff'
      const g = ctx.createRadialGradient(0, 2, size * 0.08, 0, 2, size * 0.62)
      g.addColorStop(0, c)
      g.addColorStop(0.5, tintColor || 'rgba(255,255,255,0.2)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.globalAlpha = 0.5
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 2, size * 0.62, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.drawImage(img, -size / 2, -size / 2, size, size)
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
    const realm = realmByKills(this._kills)

    if (this._grassImg) {
      // 全屏森林地图背景（远程图）
      ctx.drawImage(this._grassImg, 0, 0, w, h)
    } else {
      ctx.fillStyle = '#2f6b3a'
      ctx.fillRect(0, 0, w, h)
    }

    // 新背景已含山石小路，不再叠画程序风景，避免挡画面

    const tombs = this._tombs || []
    for (let ti = 0; ti < tombs.length; ti++) {
      const t = tombs[ti]
      const img = this._tombImgs && this._tombImgs[t.idx]
      if (!img) continue
      const tw = 64 * t.scale
      const th = 78 * t.scale
      ctx.globalAlpha = 1
      ctx.drawImage(img, t.x - tw / 2, t.y - th, tw, th)
      ctx.globalAlpha = 1
    }

    // 遁光尾巴（在人物之下）
    for (let i = 0; i < this._trails.length; i++) {
      const t = this._trails[i]
      ctx.globalAlpha = Math.max(0, t.life * 2.2)
      ctx.fillStyle = t.color
      ctx.beginPath()
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    for (let i = 0; i < this._pickups.length; i++) this._drawLoot(ctx, this._pickups[i])
    for (let i = 0; i < this._swords.length; i++) this._drawFlyingSword(ctx, this._swords[i])

    for (let zi = 0; zi < this._zombies.length; zi++) {
      const z = this._zombies[zi]
      const animKey = z.state || 'walk'
      const img = this._zombieFrame(z, animKey)
      const emerge = Math.max(0.05, Math.min(1, z.emerge))
      let size = z.r * 2.55 * (0.35 + 0.65 * emerge)
      // 出土帧自带土堆，用更大画幅、不透明度拉满
      if (z.state === 'emerge') size = z.r * (2.8 + emerge * 0.6)
      if (z.gengScale != null) size *= z.gengScale
      if (z.state === 'walk') size *= 1 + Math.sin(z.frameT * 10) * 0.04
      if (z.state === 'hurt') size *= 1.08
      if (z.state === 'dead') size *= 1 - Math.min(0.25, z.frameT * 0.2)
      if (z.flash > 0) z.flash -= 0.016
      const drawY = z.y - (z.floatY || 0) + (z.state === 'emerge' ? 8 : (1 - emerge) * 16)
      ctx.save()
      ctx.globalAlpha = z.state === 'dead'
        ? Math.max(0.2, 1 - z.frameT * 0.7)
        : (z.state === 'emerge' ? 1 : (0.35 + 0.65 * emerge))
      if ((z.iceT || 0) > 0) ctx.globalAlpha *= 0.9
      this._drawSprite(ctx, img, z.x, drawY, size, z.flash > 0 ? 'rgba(255,255,200,0.55)' : null, null)
      ctx.restore()
      this._drawZombieElementFx(ctx, z, drawY)

      const hideBar = z.state === 'emerge' || (this._gengFx && (this._gengFx.phase === 'suck' || this._gengFx.phase === 'zap' || this._gengFx.phase === 'end'))
      if (emerge > 0.5 && z.state !== 'dead' && !hideBar) {
        const bw = z.r * 2.2 * (z.gengScale != null ? z.gengScale : 1)
        const ratio = Math.max(0, z.hp / z.maxHp)
        ctx.fillStyle = '#1f2937'
        ctx.fillRect(z.x - bw / 2, drawY - z.r - 16, bw, 4)
        ctx.fillStyle = ratio > 0.4 ? '#4ade80' : '#f87171'
        ctx.fillRect(z.x - bw / 2, drawY - z.r - 16, bw * ratio, 4)
      }

      if (z === this._focusZombie && z.state !== 'dead') {
        ctx.strokeStyle = '#fde047'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(z.x, drawY, z.r + 10, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    this._drawLightning(ctx)

    const heroImg = this._playerImg
    // 剑阵期间：环剑/御剑已离体参阵，人物身边不再画剑
    if (!this._gengFx) {
      this._drawRideSword(ctx, realm)
      if (!this._perfect) this._drawOrbitSwords(ctx, realm)
    }
    const hurtFlash = this._playerHurtT > 0 ? 'rgba(248,113,113,0.45)' : realm.glow
    this._drawSprite(ctx, heroImg, this._playerX, this._playerY - 6, 58, hurtFlash, realm.color)
    if (!this._perfectFx) this._drawRealmBadge(ctx, realm)

    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i]
      ctx.globalAlpha = Math.max(0, p.life * 3)
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
      ctx.globalAlpha = 1
    }

    this._drawPlayerHpBar(ctx, realm)
    this._drawExpAndDanBars(ctx, realm)
    this._drawEnchantHud(ctx)
    this._drawCtrlButtons(ctx)
    if (this._gengFx) this._drawGengFormation(ctx)

    if (this._breakFx) this._drawBreakthrough(ctx, this._breakFx)
    if (this._perfectFx || this._perfect) this._drawPerfect(ctx)

    if (this._over) {
      this._drawInkEpitaph(ctx)
    }
  },

  /** 僵尸身上的电缠/燃火/冰冻/风困 */
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
      ctx.globalAlpha = 0.45
      ctx.fillStyle = 'rgba(147,197,253,0.55)'
      ctx.fillRect(z.x - z.r * 0.9, drawY - z.r * 1.1, z.r * 1.8, z.r * 2.1)
      ctx.strokeStyle = '#e0f2fe'
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.8
      ctx.strokeRect(z.x - z.r * 0.9, drawY - z.r * 1.1, z.r * 1.8, z.r * 2.1)
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
  _drawEnchantHud(ctx) {
    const enc = this._swordEnchant
    if (!enc || enc.t <= 0) return
    const def = LOOT_DEFS[enc.type]
    ctx.save()
    ctx.fillStyle = 'rgba(15,23,42,0.55)'
    ctx.fillRect(12, 138, 118, 24)
    ctx.fillStyle = def ? def.color : '#e2e8f0'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText((def && def.label) + ' ' + Math.ceil(enc.t) + 's', 18, 154)
    ctx.restore()
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

  /** 御剑座下飞剑 */
  _drawRideSword(ctx, realm) {
    const enc = this._swordEnchant
    const color = (enc && enc.t > 0 && enc.color) || realm.sword || realm.color
    ctx.save()
    ctx.translate(this._playerX, this._playerY + 18)
    ctx.rotate(-0.2 + Math.sin(this._animT * 4) * 0.05)
    this._paintInkSword(ctx, color, 0.72)
    if (enc && enc.t > 0) this._paintSwordEnchantFx(ctx, enc.type)
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

  /** 右上角色血条：随境界变色加厚 */
  _drawPlayerHpBar(ctx, realm) {
    const w = this._w
    const barW = Math.min(140, w * 0.38)
    const thick = 8 + Math.min(10, realm.lv * 0.7)
    const x = w - barW - 12
    const y = 48
    const ratio = Math.max(0, Math.min(1, this._hp / (this._maxHp || 1)))
    ctx.save()
    ctx.fillStyle = 'rgba(15,23,42,0.55)'
    ctx.fillRect(x - 4, y - 14, barW + 8, thick + 22)
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
    ctx.restore()
  },

  /** 经验条 + 尸丹条 */
  _drawExpAndDanBars(ctx, realm) {
    const w = this._w
    const barW = Math.min(148, w * 0.4)
    const x = 12
    const y = 86
    const exp = realmExpProgress(this._kills || 0)
    const dan = this._corpseDan || 0
    const danNeed = CORPSE_DAN_NEED
    ctx.save()
    ctx.fillStyle = 'rgba(15,23,42,0.55)'
    ctx.fillRect(x - 2, y - 12, barW + 8, 48)

    ctx.fillStyle = '#e2e8f0'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(exp.maxed ? '经验 大圆满' : ('经验 →' + exp.nextName), x, y)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(x, y + 4, barW, 7)
    ctx.fillStyle = '#38bdf8'
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

  /** 人物周围环绕小剑：剑柄朝人、剑尖朝外，随时间旋转 */
  _drawOrbitSwords(ctx, realm) {
    const n = Math.max(1, this._swordCount || 1)
    const cx = this._playerX
    const cy = this._playerY
    const radius = 28 + Math.min(8, n * 0.4)
    const spin = (this._animT || 0) * 1.25
    const enc = this._swordEnchant
    const color = (enc && enc.t > 0 && enc.color) || realm.sword || realm.color || '#334155'
    for (let i = 0; i < n; i++) {
      const a = spin + (Math.PI * 2 * i) / n
      const x = cx + Math.cos(a) * radius
      const y = cy + Math.sin(a) * radius
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(a)
      ctx.globalAlpha = 0.92
      this._paintInkSword(ctx, color, 0.34)
      if (enc && enc.t > 0) {
        ctx.scale(0.55, 0.55)
        this._paintSwordEnchantFx(ctx, enc.type)
      }
      ctx.restore()
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
   * 升阶特效：按下/中/上境界区分气浪风格
   * 下=灵气涟漪；中=虚影漩涡；上=法则金光爆发
   */
  _drawBreakthrough(ctx, fx) {
    const w = this._w
    const h = this._h
    const cx = this._playerX
    const cy = this._playerY
    const p = Math.min(1, fx.t / fx.duration)
    const fade = p < 0.2 ? p / 0.2 : (p > 0.75 ? (1 - p) / 0.25 : 1)
    ctx.save()
    ctx.globalAlpha = Math.max(0, fade) * 0.55
    ctx.fillStyle = fx.tier === '上' ? 'rgba(255,247,237,0.35)' : (fx.tier === '中' ? 'rgba(99,102,241,0.22)' : 'rgba(56,189,248,0.18)')
    ctx.fillRect(0, 0, w, h)

    const rings = fx.tier === '上' ? 4 : (fx.tier === '中' ? 3 : 2)
    for (let i = 0; i < rings; i++) {
      const rr = 20 + (fx.t * 140 + i * 28)
      ctx.globalAlpha = Math.max(0, fade * (0.7 - i * 0.12))
      ctx.strokeStyle = fx.color
      ctx.lineWidth = fx.tier === '上' ? 3.5 : 2.2
      ctx.beginPath()
      ctx.arc(cx, cy, rr, 0, Math.PI * 2)
      ctx.stroke()
    }

    // 上境界：额外放射线
    if (fx.tier === '上') {
      ctx.globalAlpha = fade * 0.45
      ctx.strokeStyle = '#fff7ed'
      ctx.lineWidth = 1.5
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8 + fx.t * 1.2
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(a) * 90, cy + Math.sin(a) * 90)
        ctx.stroke()
      }
    }

    ctx.globalAlpha = fade
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = fx.color
    ctx.font = 'bold 28px "KaiTi", "STKaiti", serif'
    ctx.fillText('突破 · ' + fx.name + '期', w * 0.5, h * 0.28)
    ctx.font = '13px sans-serif'
    ctx.fillStyle = '#f8fafc'
    ctx.fillText(fx.tierName, w * 0.5, h * 0.28 + 28)
    ctx.font = '12px sans-serif'
    ctx.fillStyle = 'rgba(248,250,252,0.9)'
    this._drawWrappedText(ctx, fx.short || '', w * 0.5, h * 0.28 + 50, w * 0.78, 16)
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
    const realm = realmByKills(this._kills)
    ctx.fillText('击杀 ' + this._kills + ' · 境界 ' + realm.name, cx, cy + 48)
    ctx.restore()
  }
})
