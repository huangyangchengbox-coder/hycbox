Page({
  data: {
    on: false,
    mode: 'screen', // screen | torch
    camFlash: 'off',
    cameraReady: false,
    tip: '点击开关；屏幕光无需相机权限',
    error: '',
    _savedBrightness: 0.5
  },

  onLoad() {
    const that = this
    wx.getScreenBrightness({
      success(res) {
        that.setData({ _savedBrightness: res.value })
      }
    })
  },

  onUnload() {
    this.turnOff()
  },

  onHide() {
    // 离开页面关掉，避免耗电
    if (this.data.on) this.turnOff()
  },

  setMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (!mode || mode === this.data.mode) return
    const wasOn = this.data.on
    if (wasOn) this.turnOff()
    const tip = mode === 'torch'
      ? '闪光灯需相机权限；部分机型/模拟器可能不支持'
      : '屏幕光：调高亮度并点亮白屏'
    this.setData({
      mode,
      tip,
      error: '',
      cameraReady: mode === 'torch'
    })
    if (wasOn) {
      setTimeout(() => this.turnOn(), 80)
    }
  },

  toggle() {
    if (this.data.on) this.turnOff()
    else this.turnOn()
  },

  turnOn() {
    const mode = this.data.mode
    if (mode === 'screen') {
      wx.setScreenBrightness({ value: 1 })
      this.setData({ on: true, error: '' })
      return
    }
    // torch
    this.setData({
      cameraReady: true,
      camFlash: 'torch',
      on: true,
      error: ''
    })
  },

  turnOff() {
    if (this.data.mode === 'screen') {
      const v = this.data._savedBrightness
      wx.setScreenBrightness({ value: typeof v === 'number' ? v : 0.5 })
    }
    this.setData({
      on: false,
      camFlash: 'off'
    })
  },

  onCameraError(e) {
    const msg = (e && e.detail && e.detail.errMsg) || '相机不可用'
    this.setData({
      error: msg + '，可改用「屏幕光」',
      on: false,
      camFlash: 'off'
    })
  }
})
