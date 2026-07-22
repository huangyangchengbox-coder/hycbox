/**
 * 配送地图追踪（闪送 / 村村送共用）：
 * - 管理员头顶箱子标记
 * - 折线指向收货点
 * - 每 10 秒拉真实 GPS，translateMarker 动画挪到新位置
 */
const api = require('./api')

const POLL_MS = 10000
const ANIM_MS = 2800
const BOX_ICON = '/images/map/courier-box.png'
const DEST_ICON = '/images/map/user-pin.png'
const MARKER_COURIER = 1
const MARKER_DEST = 2

/**
 * @param {WechatMiniprogram.Page.Instance} page
 * @param {{
 *   mapId?: string,
 *   getOrderId: () => string,
 *   getDest?: () => ({ latitude: number, longitude: number } | null),
 *   isActive?: () => boolean
 * }} options
 * getDest：收货点坐标；无则仅显示配送员
 */
function createCourierMapTrack(page, options) {
  const mapId = options.mapId || 'courierMap'
  let timer = null
  let animating = false
  let lastCourier = null
  let mapCtx = null

  function getMapCtx() {
    if (!mapCtx) {
      mapCtx = wx.createMapContext(mapId, page)
    }
    return mapCtx
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    lastCourier = null
    animating = false
  }

  function start() {
    stop()
    refresh()
    timer = setInterval(refresh, POLL_MS)
  }

  function refresh() {
    const orderId = options.getOrderId && options.getOrderId()
    const active = options.isActive ? options.isActive() : true
    if (!orderId || !active) return

    api.getCourierLocation(orderId).then(res => {
      if (res.code !== 0 || !res.data) return
      const d = res.data
      if (!d.sharing || d.latitude == null || d.longitude == null) {
        lastCourier = null
        page.setData({
          courierSharing: false,
          courierTip: '配送员暂未开启位置分享',
          mapMarkers: [],
          mapPolylines: [],
          mapIncludePoints: []
        })
        return
      }

      const next = {
        latitude: Number(d.latitude),
        longitude: Number(d.longitude)
      }
      const dest = resolveDest()
      const prev = lastCourier
      // 动画起点用上一帧真实 GPS；随后再更新 lastCourier，避免异步回调读到新点
      applyMap(next, dest, prev)
      lastCourier = next
    }).catch(() => {
      page.setData({ courierSharing: false, courierTip: '位置暂时无法获取' })
    })
  }

  function resolveDest() {
    if (!options.getDest) return null
    try {
      const dest = options.getDest()
      if (!dest || dest.latitude == null || dest.longitude == null) return null
      const latitude = Number(dest.latitude)
      const longitude = Number(dest.longitude)
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null
      return { latitude, longitude }
    } catch (e) {
      return null
    }
  }

  function applyMap(courier, dest, prevCourier) {
    // 有动画时先落在旧坐标，再 translateMarker 挪到新坐标，视觉上像「箱子走过来」
    const markerPos = prevCourier || courier
    const markers = [buildCourierMarker(markerPos)]
    const polylines = []
    const includePoints = [{ latitude: courier.latitude, longitude: courier.longitude }]

    if (dest) {
      markers.push(buildDestMarker(dest))
      polylines.push({
        points: [
          { latitude: courier.latitude, longitude: courier.longitude },
          { latitude: dest.latitude, longitude: dest.longitude }
        ],
        color: '#E67E22AA',
        width: 5,
        dottedLine: true,
        arrowLine: true
      })
      includePoints.push({ latitude: dest.latitude, longitude: dest.longitude })
    }

    const center = dest
      ? {
          latitude: (courier.latitude + dest.latitude) / 2,
          longitude: (courier.longitude + dest.longitude) / 2
        }
      : courier

    const tip = dest
      ? '箱子正在送往您这边（约每 10 秒更新）'
      : '配送员位置（约每 10 秒刷新）'

    page.setData({
      courierSharing: true,
      courierTip: tip,
      mapLatitude: center.latitude,
      mapLongitude: center.longitude,
      mapMarkers: markers,
      mapPolylines: polylines,
      mapIncludePoints: includePoints
    }, () => {
      if (prevCourier) {
        animateCourier(prevCourier, courier)
      }
    })
  }

  function buildCourierMarker(pos) {
    return {
      id: MARKER_COURIER,
      latitude: pos.latitude,
      longitude: pos.longitude,
      width: 40,
      height: 40,
      anchor: { x: 0.5, y: 1 },
      iconPath: BOX_ICON,
      callout: {
        content: '配送箱',
        display: 'ALWAYS',
        padding: 6,
        borderRadius: 8,
        fontSize: 12,
        bgColor: '#FFF8F0',
        color: '#8A4B12',
        borderWidth: 1,
        borderColor: '#E67E22'
      }
    }
  }

  function buildDestMarker(pos) {
    return {
      id: MARKER_DEST,
      latitude: pos.latitude,
      longitude: pos.longitude,
      width: 28,
      height: 36,
      anchor: { x: 0.5, y: 1 },
      iconPath: DEST_ICON,
      callout: {
        content: '收货点',
        display: 'ALWAYS',
        padding: 6,
        borderRadius: 6,
        fontSize: 12
      }
    }
  }

  /** 真实 GPS 点之间用地图 API 平滑挪动箱子 */
  function animateCourier(from, destination) {
    if (animating || !from) return
    const dist = haversineM(from, destination)
    // 几乎没动则跳过动画，避免抖动
    if (dist < 3) return
    animating = true
    const duration = Math.min(ANIM_MS, Math.max(800, Math.round(dist * 40)))
    const rotate = bearingDeg(from, destination)
    try {
      getMapCtx().translateMarker({
        markerId: MARKER_COURIER,
        destination: {
          latitude: destination.latitude,
          longitude: destination.longitude
        },
        autoRotate: false,
        rotate,
        moveWithRotate: false,
        duration,
        animationEnd() {
          animating = false
        },
        fail(err) {
          animating = false
          console.warn('[courierMap] translateMarker fail', err)
        }
      })
    } catch (e) {
      animating = false
    }
  }

  return { start, stop, refresh }
}

function toRad(deg) {
  return (deg * Math.PI) / 180
}

function haversineM(a, b) {
  const R = 6371000
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** 两点方位角，供箱子朝向收货点 */
function bearingDeg(from, to) {
  const lat1 = toRad(from.latitude)
  const lat2 = toRad(to.latitude)
  const dLng = toRad(to.longitude - from.longitude)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2)
    - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (Math.atan2(y, x) * 180) / Math.PI
}

module.exports = {
  createCourierMapTrack,
  POLL_MS
}
