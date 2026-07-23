const api = require('../../../../services/api')
const adminSession = require('../../../../services/adminSession')

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
    mediaUrl: item.resultUrl || item.remoteUrl || '',
    refreshing: false
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
    generating: false
  },

  _pollTimer: null,
  _pollStartedAt: 0,

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
  },

  onPromptInput(e) {
    this.setData({ prompt: e.detail.value })
  },

  loadJobs() {
    this.setData({ loading: true })
    api.listAiMedia({ type: 'video', page: 1, pageSize: 30 }).then(res => {
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
    const prompt = (this.data.prompt || '').trim()
    if (!prompt) {
      wx.showToast({ title: '请输入描述', icon: 'none' })
      return
    }
    this.setData({ generating: true })
    api.createAiVideo({ prompt }).then(res => {
      if (res.code === 0 && res.data) {
        wx.showToast({ title: '已提交，后台生成中', icon: 'success' })
        this.setData({ prompt: '' })
        const jobs = [mapJob(res.data)].concat(this.data.jobs.filter(j => j.id !== res.data.id))
        this.setData({ jobs })
        this.startPoll()
      } else {
        wx.showToast({ title: res.message || '提交失败', icon: 'none' })
        this.loadJobs()
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' })
      this.loadJobs()
    }).finally(() => {
      this.setData({ generating: false })
    })
  },

  onRefresh(e) {
    const id = e.currentTarget.dataset.id
    const index = e.currentTarget.dataset.index
    const jobs = this.data.jobs.slice()
    if (!jobs[index]) return
    jobs[index] = Object.assign({}, jobs[index], { refreshing: true })
    this.setData({ jobs })
    api.getAiMedia(id).then(res => {
      if (res.code === 0 && res.data) {
        jobs[index] = mapJob(res.data)
        this.setData({ jobs })
        wx.showToast({ title: '已更新', icon: 'success' })
        this.startPoll()
      } else {
        wx.showToast({ title: res.message || '刷新失败', icon: 'none' })
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '刷新失败', icon: 'none' })
    }).finally(() => {
      const list = this.data.jobs.slice()
      if (list[index]) {
        list[index] = Object.assign({}, list[index], { refreshing: false })
        this.setData({ jobs: list })
      }
    })
  },

  goPublish() {
    wx.redirectTo({ url: '/pages/hyc/admin/publish/publish' })
  },

  goMine() {
    wx.redirectTo({ url: '/pages/hyc/admin/mine/mine' })
  }
})
