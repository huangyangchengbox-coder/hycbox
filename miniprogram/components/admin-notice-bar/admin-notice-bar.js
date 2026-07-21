const api = require('../../services/api')
const adminSubscribe = require('../../services/adminSubscribe')

const POLL_MS = 12000

Component({
  data: {
    visible: false,
    unreadCount: 0,
    latestTitle: '',
    latestContent: '',
    needSubscribe: false,
    subscribeQuota: 0
  },

  lifetimes: {
    detached() {
      this.stopPoll()
    }
  },

  pageLifetimes: {
    show() {
      this.startPoll()
    },
    hide() {
      this.stopPoll()
    }
  },

  methods: {
    startPoll() {
      this.stopPoll()
      this.fetchNotices()
      this._timer = setInterval(() => {
        this.fetchNotices()
      }, POLL_MS)
    },

    stopPoll() {
      if (this._timer) {
        clearInterval(this._timer)
        this._timer = null
      }
    },

    fetchNotices() {
      api.pollAdminNotices().then(res => {
        if (res.code !== 0 || !res.data) {
          this.setData({ visible: false, unreadCount: 0 })
          return
        }
        const unreadCount = Number(res.data.unreadCount) || 0
        const items = res.data.items || []
        const latest = items[0]
        const needSubscribe = !!res.data.needSubscribe
        const subscribeQuota = Number(res.data.subscribeQuota) || 0
        const showUnread = unreadCount > 0 && latest
        // 有未读，或需要续订额度时显示提示条
        const visible = showUnread || needSubscribe
        this.setData({
          visible,
          unreadCount,
          latestTitle: showUnread
            ? (latest.title || '新消息')
            : (needSubscribe ? '微信提醒额度已用完' : ''),
          latestContent: showUnread
            ? (latest.content || '')
            : (needSubscribe ? '点此重新订阅，才能继续收到新登记推送' : ''),
          needSubscribe,
          subscribeQuota
        })
      }).catch(() => {})
    },

    onTap() {
      const needSubscribe = this.data.needSubscribe
      const hasUnread = this.data.unreadCount > 0
      const finish = () => {
        if (needSubscribe) {
          this.promptSubscribe()
        }
      }
      if (hasUnread) {
        api.markAdminNoticesRead().then(() => {
          this.setData({ unreadCount: 0 })
          if (!needSubscribe) {
            this.setData({ visible: false })
            wx.showToast({ title: '已标记已读', icon: 'none' })
          } else {
            this.setData({
              latestTitle: '微信提醒额度已用完',
              latestContent: '点此重新订阅，才能继续收到新登记推送'
            })
          }
          finish()
        }).catch(err => {
          wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' })
        })
        return
      }
      finish()
    },

    promptSubscribe() {
      adminSubscribe.requestAdminSubscribe().then(result => {
        if (!result.accepted) {
          wx.showToast({ title: '未开启订阅', icon: 'none' })
          return
        }
        const quota = result.status ? result.status.subscribeQuota : 1
        this.setData({
          needSubscribe: false,
          subscribeQuota: quota,
          visible: this.data.unreadCount > 0
        })
        wx.showToast({ title: '已续订，可再推 ' + quota + ' 条', icon: 'none' })
        this.fetchNotices()
      }).catch(err => {
        wx.showToast({ title: (err && err.message) || '订阅失败', icon: 'none' })
      })
    }
  }
})
