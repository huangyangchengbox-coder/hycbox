const api = require('../../../../services/api')
const adminSession = require('../../../../services/adminSession')
const { playTaskFly } = require('../../../../services/taskFly')

const STATUS_MAP = {
  pending: '排队中',
  running: '生成中',
  succeeded: '已完成',
  failed: '失败'
}

const POLL_INTERVAL_MS = 4000
const POLL_MAX_MS = 10 * 60 * 1000

function mapJob(item) {
  const status = item.status || 'pending'
  return Object.assign({}, item, {
    statusText: STATUS_MAP[status] || status,
    mediaUrl: item.resultUrl || item.remoteUrl || ''
  })
}

function isRunning(status) {
  return status === 'pending' || status === 'running'
}

Page({
  data: {
    prompt: '',
    jobs: [],
    loading: true,
    generating: false,
    enteringId: '',
    flyVisible: false,
    flyText: '',
    flyStyle: '',
    flyTrailStyle: ''
  },

  _pollTimer: null,
  _pollStartedAt: 0,
  _enteringTimer: null,

  onShow() {
    if (!adminSession.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/hyc/admin/login/login' })
      return
    }
    this.loadJobs()
  },

  onHide() {
    this.stopPoll()
  },

  onUnload() {
    this.stopPoll()
    if (this._enteringTimer) {
      clearTimeout(this._enteringTimer)
      this._enteringTimer = null
    }
  },

  onPromptInput(e) {
    this.setData({ prompt: e.detail.value })
  },

  loadJobs() {
    this.setData({ loading: true })
    api.listAiMedia({ type: 'image', page: 1, pageSize: 30 }).then(res => {
      if (res.code === 0) {
        const list = res.data || (res.pageInfo && res.pageInfo.list) || []
        this.setData({ jobs: list.map(mapJob) })
        this.startPoll()
      } else {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' })
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  startPoll() {
    if (!this.data.jobs.some(j => isRunning(j.status))) {
      this.stopPoll()
      return
    }
    if (this._pollTimer) return
    this._pollStartedAt = Date.now()
    this._pollTimer = setInterval(() => this.pollRunning(), POLL_INTERVAL_MS)
    this.pollRunning()
  },

  stopPoll() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
    this._pollStartedAt = 0
  },

  pollRunning() {
    if (this._pollStartedAt && Date.now() - this._pollStartedAt >= POLL_MAX_MS) {
      this.stopPoll()
      return
    }
    const running = this.data.jobs.filter(j => isRunning(j.status))
    if (!running.length) {
      this.stopPoll()
      return
    }
    const jobs = this.data.jobs.slice()
    Promise.all(running.map(job =>
      api.getAiMedia(job.id).then(res => {
        if (res.code === 0 && res.data) {
          const idx = jobs.findIndex(j => j.id === job.id)
          if (idx >= 0) jobs[idx] = mapJob(res.data)
        }
      }).catch(() => {})
    )).then(() => {
      this.setData({ jobs })
      if (!jobs.some(j => isRunning(j.status))) {
        this.stopPoll()
      }
    })
  },

  onGenerate() {
    if (this.data.generating) return
    const prompt = (this.data.prompt || '').trim()
    if (!prompt) {
      wx.showToast({ title: '请输入描述', icon: 'none' })
      return
    }
    this.setData({ generating: true })
    api.createAiImage({ prompt }).then(res => {
      if (res.code === 0 && res.data) {
        wx.showToast({ title: '已提交，后台生成中', icon: 'success' })
        return playTaskFly(this, '#promptBox', '#historyCard', prompt).then(() => {
          const jobs = [mapJob(res.data)].concat(this.data.jobs.filter(j => j.id !== res.data.id))
          this.setData({
            prompt: '',
            jobs,
            enteringId: res.data.id
          })
          if (this._enteringTimer) clearTimeout(this._enteringTimer)
          this._enteringTimer = setTimeout(() => {
            this.setData({ enteringId: '' })
            this._enteringTimer = null
          }, 700)
          this.scrollToHistory()
          this.startPoll()
        })
      }
      wx.showToast({ title: res.message || '提交失败', icon: 'none' })
      this.loadJobs()
    }).catch(err => {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' })
      this.loadJobs()
    }).finally(() => {
      this.setData({ generating: false })
    })
  },

  scrollToHistory() {
    wx.createSelectorQuery()
      .select('#historyCard')
      .boundingClientRect()
      .selectViewport()
      .scrollOffset()
      .exec((res) => {
        const rect = res && res[0]
        const scroll = res && res[1]
        if (!rect || !scroll) return
        const top = Math.max(0, scroll.scrollTop + rect.top - 24)
        wx.pageScrollTo({ scrollTop: top, duration: 300 })
      })
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    wx.previewImage({ urls: [url], current: url })
  },

  goPublish() {
    wx.redirectTo({ url: '/pages/hyc/admin/publish/publish' })
  },

  goMine() {
    wx.redirectTo({ url: '/pages/hyc/admin/mine/mine' })
  }
})
