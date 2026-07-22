const api = require('../../../../services/api')
const adminSession = require('../../../../services/adminSession')

const STATUS_MAP = {
  pending: '排队中',
  running: '生成中',
  succeeded: '已完成',
  failed: '失败'
}

function mapJob(item) {
  const status = item.status || 'pending'
  return Object.assign({}, item, {
    statusText: STATUS_MAP[status] || status,
    mediaUrl: item.resultUrl || item.remoteUrl || '',
    refreshing: false
  })
}

Page({
  data: {
    prompt: '',
    jobs: [],
    loading: true,
    generating: false
  },

  onShow() {
    if (!adminSession.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/hyc/admin/login/login' })
      return
    }
    this.loadJobs()
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
      } else {
        wx.showToast({ title: res.message || '加载失败', icon: 'none' })
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }).finally(() => {
      this.setData({ loading: false })
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
        const job = mapJob(res.data)
        wx.showToast({
          title: job.status === 'succeeded' ? '生成成功' : '已提交，可刷新状态',
          icon: 'success'
        })
        this.setData({ prompt: '' })
        const jobs = [job].concat(this.data.jobs)
        this.setData({ jobs })
      } else {
        wx.showToast({ title: res.message || '生成失败', icon: 'none' })
        this.loadJobs()
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '生成失败', icon: 'none' })
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
    api.refreshAiMedia(id).then(res => {
      if (res.code === 0 && res.data) {
        jobs[index] = mapJob(res.data)
        this.setData({ jobs })
        wx.showToast({ title: '已更新', icon: 'success' })
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
