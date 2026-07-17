const buildingsData = require('./buildings')

/** 部分楼层跳过（常见避讳层） */
const DEFAULT_SKIP_FLOORS = [4, 13, 14, 24]

let roomCache = null

/**
 * 生成门牌号，格式：1501 表示 15 层 01 户
 */
function formatRoomNo(floor, roomIndex) {
  return `${floor}${String(roomIndex).padStart(2, '0')}`
}

/**
 * 根据楼栋配置生成全部门牌
 */
function buildAllRooms() {
  if (roomCache) {
    return roomCache
  }
  const rooms = []
  buildingsData.phases.forEach(phase => {
    phase.buildings.forEach(building => {
      const skipFloors = building.skipFloors || DEFAULT_SKIP_FLOORS
      for (let unit = 1; unit <= building.units; unit += 1) {
        for (let floor = 1; floor <= building.maxFloor; floor += 1) {
          if (skipFloors.indexOf(floor) >= 0) {
            continue
          }
          for (let roomIndex = 1; roomIndex <= building.roomsPerFloor; roomIndex += 1) {
            const roomNo = formatRoomNo(floor, roomIndex)
            const id = `${phase.id}_${building.id}_${unit}_${roomNo}`
            const label = `${phase.name}${building.name} ${unit}单元 ${roomNo}`
            const searchKey = `${phase.name}${building.name}${unit}单元${roomNo}${building.name.replace('号楼', '')}${roomNo}`
            rooms.push({
              id,
              phaseId: phase.id,
              phaseName: phase.name,
              buildingId: building.id,
              buildingName: building.name,
              unit,
              roomNo,
              label,
              searchKey: searchKey.toLowerCase()
            })
          }
        }
      }
    })
  })
  roomCache = rooms
  return rooms
}

function getPhases() {
  return buildingsData.phases.map(phase => ({
    id: phase.id,
    name: phase.name,
    buildings: phase.buildings.map(b => ({
      id: b.id,
      name: b.name,
      units: b.units,
      maxFloor: b.maxFloor,
      roomsPerFloor: b.roomsPerFloor
    }))
  }))
}

function getBuildingsByPhase(phaseId) {
  const phase = buildingsData.phases.find(p => p.id === phaseId)
  return phase ? phase.buildings : []
}

function getRoomsByBuilding(phaseId, buildingId, unit) {
  const allRooms = buildAllRooms()
  return allRooms.filter(room => {
    if (room.phaseId !== phaseId || room.buildingId !== buildingId) {
      return false
    }
    if (unit && room.unit !== unit) {
      return false
    }
    return true
  })
}

function getRoomById(roomId) {
  return buildAllRooms().find(room => room.id === roomId) || null
}

/**
 * 搜索门牌：支持楼栋名、期数、门牌号模糊匹配
 */
function searchRooms(keyword, limit = 30) {
  const key = (keyword || '').trim().toLowerCase()
  if (!key) {
    return []
  }
  return buildAllRooms()
    .filter(room => room.searchKey.indexOf(key) >= 0)
    .slice(0, limit)
}

function getCommunityInfo() {
  return {
    communityName: buildingsData.communityName,
    address: buildingsData.address,
    phaseCount: buildingsData.phases.length,
    buildingCount: buildingsData.phases.reduce((sum, p) => sum + p.buildings.length, 0)
  }
}

module.exports = {
  getPhases,
  getBuildingsByPhase,
  getRoomsByBuilding,
  getRoomById,
  searchRooms,
  getCommunityInfo,
  buildAllRooms
}
