export const ROOM_LIMITS_MM = {
  width: { min: 2400, max: 12000 },
  depth: { min: 2400, max: 12000 },
  height: { min: 2000, max: 5000 },
}

export const DEFAULT_ROOM = Object.freeze({
  shape: 'rectangle',
  width: 5.5,
  depth: 3.6,
  height: 2.65,
  door: Object.freeze({ wall: 'front', offset: 0.72 }),
  window: Object.freeze({ wall: 'back', offset: 0.22 }),
  showFurniture: true,
  label: '6평 원룸',
  partitions: Object.freeze([]),
})

export const ROOM_TEMPLATES = Object.freeze([
  DEFAULT_ROOM,
  Object.freeze({
    shape: 'rectangle', width: 6.4, depth: 4.2, height: 2.65,
    door: Object.freeze({ wall: 'front', offset: 0.74 }),
    window: Object.freeze({ wall: 'back', offset: 0.28 }),
    showFurniture: false,
    label: '1.5룸 개념 템플릿',
    description: '부분 분리벽으로 생활 공간과 침실 영역 구분',
    partitions: Object.freeze([
      Object.freeze({ x: 0.65, startZ: -2.1, endZ: 0.45, gapCenterZ: 0, gapWidth: 0 }),
    ]),
  }),
  Object.freeze({
    shape: 'l', width: 7.2, depth: 5.2, height: 2.7,
    door: Object.freeze({ wall: 'front', offset: 0.78 }),
    window: Object.freeze({ wall: 'left', offset: 0.32 }),
    showFurniture: false,
    label: '투룸 개념 템플릿',
    description: '출입구가 있는 구획벽으로 두 개의 방 영역 표현',
    partitions: Object.freeze([
      Object.freeze({ x: -0.6, startZ: -2.6, endZ: 2.6, gapCenterZ: 1.25, gapWidth: 0.95 }),
    ]),
  }),
])

export function roomArea(room) {
  const base = room.width * room.depth
  return room.shape === 'l' ? base * (1 - 0.4 * 0.4) : base
}

export function getLNotch(room) {
  return {
    minX: room.width / 2 - room.width * 0.4,
    maxX: room.width / 2,
    minZ: -room.depth / 2,
    maxZ: -room.depth / 2 + room.depth * 0.4,
  }
}

export function roomFloorPoints(room) {
  const left = -room.width / 2
  const right = room.width / 2
  const back = -room.depth / 2
  const front = room.depth / 2
  if (room.shape !== 'l') {
    return [[left, back], [right, back], [right, front], [left, front]]
  }
  const notch = getLNotch(room)
  return [
    [left, back], [notch.minX, back], [notch.minX, notch.maxZ],
    [right, notch.maxZ], [right, front], [left, front],
  ]
}

export function outerWallSegments(room) {
  const left = -room.width / 2
  const right = room.width / 2
  const back = -room.depth / 2
  const front = room.depth / 2
  if (room.shape !== 'l') return [
    { key: 'back', wall: 'back', axis: 'x', start: left, end: right, fixed: back, cutaway: false },
    { key: 'right', wall: 'right', axis: 'z', start: back, end: front, fixed: right, cutaway: true },
    { key: 'front', wall: 'front', axis: 'x', start: left, end: right, fixed: front, cutaway: true },
    { key: 'left', wall: 'left', axis: 'z', start: back, end: front, fixed: left, cutaway: false },
  ]
  const notch = getLNotch(room)
  return [
    { key: 'back', wall: 'back', axis: 'x', start: left, end: notch.minX, fixed: back, cutaway: false },
    { key: 'notch-side', wall: null, axis: 'z', start: back, end: notch.maxZ, fixed: notch.minX, cutaway: false },
    { key: 'notch-front', wall: null, axis: 'x', start: notch.minX, end: right, fixed: notch.maxZ, cutaway: false },
    { key: 'right', wall: 'right', axis: 'z', start: notch.maxZ, end: front, fixed: right, cutaway: true },
    { key: 'front', wall: 'front', axis: 'x', start: left, end: right, fixed: front, cutaway: true },
    { key: 'left', wall: 'left', axis: 'z', start: back, end: front, fixed: left, cutaway: false },
  ]
}

export function openingPlacement(room, opening) {
  if (!room || !opening || typeof opening !== 'object') return { segment: undefined, absolute: Number.NaN, local: Number.NaN }
  const horizontal = opening.wall === 'front' || opening.wall === 'back'
  const absolute = horizontal
    ? -room.width / 2 + room.width * opening.offset
    : -room.depth / 2 + room.depth * opening.offset
  const segment = outerWallSegments(room).find((candidate) => candidate.wall === opening.wall)
  return { segment, absolute, local: segment ? absolute - segment.start : Number.NaN }
}

export function roomValidationErrors(room) {
  const errors = []
  if (!room || !['rectangle', 'l'].includes(room.shape)) errors.push('방 형태를 선택해 주세요.')
  const values = room ? [room.width, room.depth, room.height] : []
  if (values.length !== 3 || !values.every(Number.isFinite)) return [...errors, '공간 크기를 숫자로 입력해 주세요.']
  const within = (metres, limits) => metres * 1000 >= limits.min && metres * 1000 <= limits.max
  if (!within(room.width, ROOM_LIMITS_MM.width) || !within(room.depth, ROOM_LIMITS_MM.depth) || !within(room.height, ROOM_LIMITS_MM.height)) errors.push('가로·세로·높이의 입력 범위를 확인해 주세요.')
  if (room.shape === 'l' && (room.width < 3.6 || room.depth < 3.6)) errors.push('L자형은 가로와 세로가 각각 3,600mm 이상이어야 합니다.')
  const specs = [{ name: '문', value: room.door, width: 0.92 }, { name: '창문', value: room.window, width: 1.25 }]
  for (const spec of specs) {
    const opening = spec.value
    if (!opening || !['front', 'back', 'left', 'right'].includes(opening.wall) || !Number.isFinite(opening.offset)) {
      errors.push(`${spec.name} 위치를 선택해 주세요.`)
      continue
    }
    if (opening.offset < 0.12 || opening.offset > 0.88) errors.push(`${spec.name}을 모서리에서 조금 더 떨어뜨려 주세요.`)
    const placement = openingPlacement(room, opening)
    const clearance = spec.width / 2 + 0.08
    if (!placement.segment || placement.absolute - placement.segment.start < clearance || placement.segment.end - placement.absolute < clearance) errors.push(`${spec.name}이 벽 구간 또는 L자형 모서리 밖에 있습니다.`)
  }
  if (room.door && room.window && room.door.wall === room.window.wall) {
    const door = openingPlacement(room, room.door)
    const window = openingPlacement(room, room.window)
    if (Number.isFinite(door.absolute) && Number.isFinite(window.absolute) && Math.abs(door.absolute - window.absolute) < (0.92 + 1.25) / 2 + 0.12) errors.push('문과 창문이 겹칩니다. 위치를 더 떨어뜨려 주세요.')
  }
  const partitions = room.partitions ?? []
  if (!Array.isArray(partitions)) {
    errors.push('내부 구획 데이터가 올바르지 않습니다.')
  } else if (partitions.some((partition) => !partition || ![partition.x, partition.startZ, partition.endZ, partition.gapCenterZ, partition.gapWidth].every(Number.isFinite))) {
    errors.push('내부 구획 치수가 올바르지 않습니다.')
  }
  if (typeof room.label !== 'string' || !room.label.trim()) errors.push('공간 이름이 필요합니다.')
  return errors
}

export function isValidRoom(room) {
  return roomValidationErrors(room).length === 0
}

export function cloneRoom(room) {
  return {
    ...room,
    door: { ...room.door },
    window: { ...room.window },
    partitions: (room.partitions ?? []).map((partition) => ({ ...partition })),
  }
}
