/**
 * 仙途 Demo（1-A～1-F）—— 纯章节故事 + 可选剧情打斗
 * 场景统一：自研 Canvas（libs/xianStoryCanvas.js）
 *
 * beat.kind: narrate | fight
 * fx: mist | walk | climb | glow | pulse | slash | spar | spirit | quake
 */

const DEMO_CHAPTERS = [
  {
    id: '1_a',
    unitCode: '1-A',
    batch: 1,
    order: 1,
    title: '山边小村',
    seq: '1-2',
    mode: 'story',
    major: 'mortal',
    scene: 'village',
    render: 'canvas',
    win: { type: 'story' },
    beats: [
      { text: '山边小村，少年心气不平，一心想走出这片天地。', fx: 'mist' },
      { text: '三叔回村，说起七玄门招收弟子——机缘，就在眼前。', fx: 'walk' },
      { text: '夜色沉沉，他望着村外山影，心里第一次生出「走出去」的念头。', fx: 'glow' }
    ],
    outro: ['凡人一步，故事开篇。', '「山边小村」一章已了。'],
    nextId: '1_b'
  },
  {
    id: '1_b',
    unitCode: '1-B',
    batch: 1,
    order: 2,
    title: '炼骨崖',
    seq: '3-5',
    mode: 'story',
    major: 'lianqi',
    scene: 'cliff',
    render: 'canvas',
    win: { type: 'story' },
    beats: [
      { text: '彩霞山考核：穿竹林、攀岩壁、登三十余丈炼骨崖。', fx: 'mist' },
      { text: '双手磨破，力竭之时，仍不肯松手。', fx: 'climb' },
      {
        kind: 'fight',
        text: '崖顶，锦衣少年回头挑衅——比的不只是攀爬，还有胆气。',
        fx: 'slash',
        foe: '舞岩',
        taps: 4
      },
      { text: '虽未按时登顶，却因表现突出，记名弟子已定。', fx: 'glow' }
    ],
    outro: ['崖顶风起，腰牌在手。', '「炼骨崖」闯过。'],
    nextId: '1_c'
  },
  {
    id: '1_c',
    unitCode: '1-C',
    batch: 1,
    order: 3,
    title: '神手谷·无名口诀',
    seq: '6-9',
    mode: 'story',
    major: 'lianqi',
    scene: 'meditate',
    render: 'canvas',
    win: { type: 'story' },
    beats: [
      { text: '墨大夫只教采药炼药，却传下一套不许外传的无名口诀。', fx: 'glow' },
      { text: '苦修三月，体内仅生一丝凉意——仍不放弃。', fx: 'pulse' },
      { text: '石室独坐，药物浸身，口诀第一层初成。', fx: 'spirit' }
    ],
    outro: ['口诀入体，道心渐坚。', '「神手谷」一章收束。'],
    nextId: '1_d'
  },
  {
    id: '1_d',
    unitCode: '1-D',
    batch: 1,
    order: 4,
    title: '掌天瓶',
    seq: '10-14',
    mode: 'story',
    major: 'lianqi',
    scene: 'bottle',
    render: 'canvas',
    win: { type: 'story' },
    beats: [
      { text: '赤水峰途中，脚底硌出一只绿莹莹小瓶，盖死打不开。', fx: 'glow' },
      { text: '铁锤砸下，瓶身毫发无损——此物非凡。', fx: 'quake' },
      { text: '深夜光丝聚瓶；第八日，一滴碧绿液体悄然凝成。', fx: 'pulse' }
    ],
    outro: ['瓶中一滴，悬念未揭。', '「掌天瓶」通关。'],
    nextId: '1_e'
  },
  {
    id: '1_e',
    unitCode: '1-E',
    batch: 1,
    order: 5,
    title: '门内江湖',
    seq: '15-19',
    mode: 'story',
    major: 'lianqi',
    scene: 'spar',
    render: 'canvas',
    win: { type: 'story' },
    beats: [
      { text: '谷外少年群斗，门内阶级恩怨一览无余。', fx: 'spar' },
      {
        kind: 'fight',
        text: '比刀台上，软剑与快刀交错——场边有人低呼：厉虎来了。',
        fx: 'slash',
        foe: '赵子灵',
        taps: 5
      },
      { text: '厉师兄一刀震飞兵器，满场喝彩，旋即匆匆离场。', fx: 'slash' },
      { text: '野狼帮血战未歇，山中只剩未出师的年幼弟子。', fx: 'mist' }
    ],
    outro: ['江湖初见，刀光未冷。', '「门内江湖」了结。'],
    nextId: '1_f'
  },
  {
    id: '1_f',
    unitCode: '1-F',
    batch: 1,
    order: 6,
    title: '抽髓丸',
    seq: '20',
    mode: 'story',
    major: 'lianqi',
    scene: 'spirit',
    render: 'canvas',
    win: { type: 'story' },
    beats: [
      { text: '溪边，厉师兄突然发病倒地——透支寿命的抽髓丸。', fx: 'spirit' },
      { text: '韩立曾分十次服下药引，此刻劝他：戒药可保命，却会废武。', fx: 'mist' },
      { text: '选择落下。透支换来的强大，终有代价。', fx: 'glow' }
    ],
    outro: ['话到此处，伏笔已埋。', '「抽髓丸」收束——Demo 第 01 批完。'],
    nextId: null
  }
]

const DEMO_BY_ID = {}
for (let i = 0; i < DEMO_CHAPTERS.length; i++) {
  DEMO_BY_ID[DEMO_CHAPTERS[i].id] = DEMO_CHAPTERS[i]
}

module.exports = { DEMO_CHAPTERS, DEMO_BY_ID }
