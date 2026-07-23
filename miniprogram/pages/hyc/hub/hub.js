const api = require('../../../services/api')

/** 定位失败时的兜底坐标（宜昌附近），仍展示真实天气便于审核体验 */
const FALLBACK_LAT = 30.6915
const FALLBACK_LNG = 111.2864

Page({
  data: {
    weatherLoading: true,
    weatherText: '',
    weatherTemp: '',
    weatherExtra: '',
    weatherTip: '正在获取天气…',
    weatherFromFallback: false
  },

  onShow() {
    this.loadWeather()
  },

  loadWeather() {
    const that = this
    this.setData({ weatherLoading: true, weatherTip: '正在获取天气…' })
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: false,
      success(res) {
        that.fetchWeather(res.latitude, res.longitude, false)
      },
      fail() {
        // 未授权时用默认城市，首页仍有天气，满足「工具-天气」展示
        that.fetchWeather(FALLBACK_LAT, FALLBACK_LNG, true)
      }
    })
  },

  fetchWeather(latitude, longitude, fromFallback) {
    const that = this
    api.getWeather(latitude, longitude).then(res => {
      if (res.code !== 0 || !res.data) {
        throw new Error(res.message || '天气获取失败')
      }
      const d = res.data
      const temp = d.temperature != null ? Math.round(Number(d.temperature)) + '°' : '--'
      const text = d.weatherText || '天气'
      const parts = []
      if (d.humidity != null) parts.push('湿度 ' + d.humidity + '%')
      if (d.windSpeed != null) parts.push('风速 ' + Math.round(Number(d.windSpeed)) + 'km/h')
      that.setData({
        weatherLoading: false,
        weatherText: text,
        weatherTemp: temp,
        weatherExtra: parts.join(' · '),
        weatherTip: fromFallback
          ? ('未开启定位 · ' + (d.placeLabel || '默认城市') + '（点击授权）')
          : ((d.placeLabel || '当前位置') + '天气'),
        weatherFromFallback: !!fromFallback
      })
    }).catch(err => {
      console.warn('[hub] weather', err && err.message)
      that.setData({
        weatherLoading: false,
        weatherText: '',
        weatherTemp: '',
        weatherExtra: '',
        weatherTip: '天气暂时不可用，点击重试',
        weatherFromFallback: false
      })
    })
  },

  onWeatherTap() {
    if (this.data.weatherFromFallback || !this.data.weatherText) {
      this.loadWeather()
      return
    }
    // 已有天气时点击刷新
    this.loadWeather()
  },

  goFlash() {
    wx.navigateTo({ url: '/pages/hyc/user/mine/mine' })
  },

  goExpress() {
    wx.navigateTo({ url: '/pages/hyc/express/mine/mine' })
  },

  goVillage() {
    wx.navigateTo({ url: '/pages/hyc/village/mine/mine' })
  },

  goTools() {
    wx.navigateTo({ url: '/pages/hyc/tools/index/index' })
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/hyc/user/profile/profile' })
  }
})
