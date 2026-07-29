const api = require('../../../services/api')

/** 定位失败时的兜底坐标（宜昌附近），仍展示真实天气便于审核体验 */
const FALLBACK_LAT = 30.6915
const FALLBACK_LNG = 111.2864

/** 雨丝水平位置（百分比），固定以免每次 setData 抖动 */
const RAIN_DROPS = [8, 16, 24, 33, 41, 52, 61, 70, 78, 88, 94]

/**
 * 按 WMO weather_code 决定卡片天空与动效开关。
 * @param {number|null|undefined} code
 * @param {string} text 中文天气文案兜底
 */
function resolveWeatherFx(code, text) {
  const c = code == null ? -1 : Number(code)
  const t = text || ''
  const storm =
    c === 95 || c === 96 || c === 99 ||
    t.indexOf('雷') >= 0
  const rain =
    storm ||
    (c >= 51 && c <= 67) ||
    (c >= 80 && c <= 82) ||
    t.indexOf('雨') >= 0
  const cloudy =
    rain || storm ||
    (c >= 1 && c <= 3) ||
    c === 45 || c === 48 ||
    (c >= 71 && c <= 77) ||
    (c >= 85 && c <= 86) ||
    t.indexOf('云') >= 0 || t.indexOf('阴') >= 0 || t.indexOf('雾') >= 0 || t.indexOf('雪') >= 0

  let weatherSky = 'sky-clear'
  if (storm) weatherSky = 'sky-storm'
  else if (rain) weatherSky = 'sky-rain'
  else if (cloudy) weatherSky = 'sky-cloud'

  return {
    weatherSky,
    fxCloud: cloudy || c === 0 || c === 1, // 晴天也有轻云飘过
    fxRain: rain,
    fxLightning: storm,
    rainDrops: rain ? RAIN_DROPS : []
  }
}

Page({
  data: {
    /** 管理员可配置：默认隐藏，接口返回后更新 */
    showFlash: false,
    showExpress: false,
    showVillage: false,
    weatherLoading: true,
    weatherText: '',
    weatherTemp: '',
    weatherExtra: '',
    weatherTip: '正在获取天气…',
    weatherFromFallback: false,
    weatherSky: 'sky-clear',
    fxCloud: false,
    fxRain: false,
    fxLightning: false,
    rainDrops: []
  },

  onShow() {
    this.loadHubEntries()
    this.loadWeather()
  },

  loadHubEntries() {
    const that = this
    api.getHubEntries().then(res => {
      if (res.code !== 0 || !res.data) {
        return
      }
      that.setData({
        showFlash: !!res.data.flash,
        showExpress: !!res.data.express,
        showVillage: !!res.data.village
      })
    }).catch(err => {
      console.warn('[hub] entries', err && err.message)
    })
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
      const fx = resolveWeatherFx(d.weatherCode, text)
      that.setData({
        weatherLoading: false,
        weatherText: text,
        weatherTemp: temp,
        weatherExtra: parts.join(' · '),
        weatherTip: fromFallback
          ? ('未开启定位 · ' + (d.placeLabel || '默认城市') + '（点击授权）')
          : ((d.placeLabel || '当前位置') + '天气'),
        weatherFromFallback: !!fromFallback,
        weatherSky: fx.weatherSky,
        fxCloud: fx.fxCloud,
        fxRain: fx.fxRain,
        fxLightning: fx.fxLightning,
        rainDrops: fx.rainDrops
      })
    }).catch(err => {
      console.warn('[hub] weather', err && err.message)
      that.setData({
        weatherLoading: false,
        weatherText: '',
        weatherTemp: '',
        weatherExtra: '',
        weatherTip: '天气暂时不可用，点击重试',
        weatherFromFallback: false,
        weatherSky: 'sky-clear',
        fxCloud: false,
        fxRain: false,
        fxLightning: false,
        rainDrops: []
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
