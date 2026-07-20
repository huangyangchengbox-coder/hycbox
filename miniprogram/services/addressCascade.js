/**
 * 期数 → 楼栋 → 单元 → 门牌 级联选择，供选址页/登记页复用。
 * 通过 bind 挂到 Page，不改动原有业务提交逻辑。
 */
const api = require('./api')

function findIndexById(list, id) {
  if (!list || !list.length || !id) {
    return 0
  }
  const idx = list.findIndex(item => item.id === id)
  return idx >= 0 ? idx : 0
}

function buildUnitOptions(building) {
  const unitOptions = []
  const units = (building && building.units) || 0
  for (let i = 1; i <= units; i += 1) {
    unitOptions.push(i + '单元')
  }
  return unitOptions
}

/**
 * @param {WechatMiniprogram.Page.Instance} page
 * @param {{ getCommunityId: Function, onRoomReady?: Function }} options
 */
function bindAddressCascade(page, options) {
  const getCommunityId = options.getCommunityId
  const onRoomReady = options.onRoomReady || function () {}

  page.loadPhasesForAddress = function (prefer) {
    const pref = prefer || {}
    const communityId = getCommunityId()
    return api.getPhases(communityId).then(res => {
      if (res.code !== 0) {
        return
      }
      const phases = res.data || []
      const phaseIndex = findIndexById(phases, pref.phaseId)
      page.setData({
        phases,
        phaseNames: phases.map(item => item.name),
        phaseIndex
      })
      if (phases.length > 0) {
        return page.refreshBuildings(phaseIndex, pref)
      }
      page.setData({
        buildingNames: [],
        buildingIndex: 0,
        unitOptions: [],
        unitIndex: 0,
        rooms: [],
        roomLabels: [],
        roomIndex: 0,
        selectedRoom: null
      })
      onRoomReady(null)
    })
  }

  page.refreshBuildings = function (phaseIndex, prefer) {
    const pref = prefer || {}
    const phase = page.data.phases[phaseIndex]
    if (!phase) {
      return Promise.resolve()
    }
    const buildings = phase.buildings || []
    const buildingIndex = findIndexById(buildings, pref.buildingId)
    page.setData({
      phaseIndex,
      buildingNames: buildings.map(item => item.name),
      buildingIndex
    })
    return page.refreshUnits(buildingIndex, pref)
  }

  page.refreshUnits = function (buildingIndex, prefer) {
    const pref = prefer || {}
    const phase = page.data.phases[page.data.phaseIndex]
    const building = phase && phase.buildings[buildingIndex]
    if (!building) {
      return Promise.resolve()
    }
    const unitOptions = buildUnitOptions(building)
    let unitIndex = 0
    if (pref.unit && pref.unit >= 1 && pref.unit <= building.units) {
      unitIndex = pref.unit - 1
    }
    page.setData({
      buildingIndex,
      unitOptions,
      unitIndex
    })
    return page.loadRooms(building, unitIndex + 1, pref)
  }

  page.loadRooms = function (building, unit, prefer) {
    const pref = prefer || {}
    const phase = page.data.phases[page.data.phaseIndex]
    if (!phase || !building) {
      return Promise.resolve()
    }
    return api.getRooms({
      communityId: getCommunityId(),
      phaseId: phase.id,
      buildingId: building.id,
      unit
    }).then(res => {
      if (res.code !== 0) {
        return
      }
      const rooms = res.data || []
      const roomIndex = findIndexById(rooms, pref.roomId)
      const selectedRoom = rooms[roomIndex] || null
      page.setData({
        rooms,
        roomLabels: rooms.map(item => item.roomNo || ''),
        roomIndex,
        selectedRoom
      })
      onRoomReady(selectedRoom)
    })
  }

  page.onPhaseChange = function (e) {
    page.refreshBuildings(Number(e.detail.value), {})
  }

  page.onBuildingChange = function (e) {
    page.refreshUnits(Number(e.detail.value), {})
  }

  page.onUnitChange = function (e) {
    const unitIndex = Number(e.detail.value)
    const phase = page.data.phases[page.data.phaseIndex]
    const building = phase && phase.buildings[page.data.buildingIndex]
    page.setData({ unitIndex })
    page.loadRooms(building, unitIndex + 1, {})
  }

  page.onRoomChange = function (e) {
    const roomIndex = Number(e.detail.value)
    const selectedRoom = page.data.rooms[roomIndex] || null
    page.setData({
      roomIndex,
      selectedRoom
    })
    onRoomReady(selectedRoom)
  }

  /** 从当前级联状态拼出可持久化的地址偏好字段 */
  page.buildAddressPref = function (community) {
    const phase = page.data.phases[page.data.phaseIndex]
    const building = phase && phase.buildings[page.data.buildingIndex]
    const room = page.data.selectedRoom
    const unit = page.data.unitIndex + 1
    return {
      communityId: community.id,
      communityName: community.name,
      phaseId: phase ? phase.id : '',
      phaseName: phase ? phase.name : '',
      hasPhases: !!(community.hasPhases || (page.data.phases && page.data.phases.length)),
      buildingId: building ? building.id : '',
      buildingName: building ? building.name : '',
      unit: room ? room.unit : unit,
      roomId: room ? room.id : '',
      roomNo: room ? room.roomNo : '',
      roomLabel: room ? room.label : ''
    }
  }
}

module.exports = {
  bindAddressCascade,
  findIndexById,
  buildUnitOptions
}
