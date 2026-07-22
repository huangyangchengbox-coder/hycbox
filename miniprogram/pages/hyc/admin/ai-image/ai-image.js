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
    mediaUrl: item.resultUrl || item.remoteUrl || ''
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
    api.listAiMedia({ type: 'image', page: 1, pageSize: 30 }).then(res => {
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
    api.createAiImage({ prompt }).then(res => {
      if (res.code === 0 && res.data) {
        wx.showToast({ title: '生成成功', icon: 'success' })
        this.setData({ prompt: '' })
        const jobs = [mapJob(res.data)].concat(this.data.jobs)
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
