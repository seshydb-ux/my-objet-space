import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_ROOM, ROOM_TEMPLATES, cloneRoom, getLNotch, isValidRoom, openingPlacement, roomArea, roomFloorPoints, roomValidationErrors } from '../src/roomGeometry.js'

test('기본 6평을 포함한 세 템플릿이 유효하고 구획 정보를 가진다', () => {
  assert.equal(ROOM_TEMPLATES.length, 3)
  assert.ok(ROOM_TEMPLATES.every(isValidRoom))
  assert.equal(roomArea(DEFAULT_ROOM), 19.8)
  assert.ok(ROOM_TEMPLATES[1].partitions.length > 0)
  assert.equal(ROOM_TEMPLATES[2].partitions.length, 1)
  assert.ok(ROOM_TEMPLATES[2].partitions.some((wall) => wall.gapWidth > 0))
  assert.equal(ROOM_TEMPLATES[2].layout, 'two-room')
  assert.equal(ROOM_TEMPLATES[2].recommended, true)
  assert.equal(ROOM_TEMPLATES[2].windows.length, 1)
})

test('L자형의 바닥은 입력 외곽 크기와 동일한 비율의 노치를 사용한다', () => {
  const room = { ...DEFAULT_ROOM, shape: 'l', width: 6, depth: 5 }
  const notch = getLNotch(room)
  assert.ok(Math.abs(notch.minX - 0.6) < 1e-9)
  assert.equal(notch.maxX, 3)
  assert.equal(notch.minZ, -2.5)
  assert.equal(notch.maxZ, -0.5)
  assert.equal(roomFloorPoints(room).length, 6)
  assert.ok(Math.abs(roomArea(room) - 25.2) < 1e-9)
})

test('문과 창문이 벽 범위를 벗어나거나 같은 위치에 겹치면 생성할 수 없다', () => {
  const room = cloneRoom(DEFAULT_ROOM)
  room.window = { wall: room.door.wall, offset: room.door.offset }
  assert.ok(roomValidationErrors(room).some((error) => error.includes('겹칩니다')))
  room.window = { wall: 'back', offset: 0.12 }
  room.width = 2.4
  assert.ok(roomValidationErrors(room).some((error) => error.includes('모서리')))
})

test('L자형 창문 위치가 실제 외벽 구간 안에 있어야 한다', () => {
  const room = { ...cloneRoom(DEFAULT_ROOM), shape: 'l', width: 7.2, depth: 5.2 }
  room.window = { wall: 'back', offset: 0.8 }
  assert.equal(isValidRoom(room), false)
  assert.ok(openingPlacement(room, room.window).absolute > openingPlacement(room, room.window).segment.end)
})

test('템플릿 복사본의 문과 구획을 변경해도 원본은 바뀌지 않는다', () => {
  const source = ROOM_TEMPLATES[2]
  const copy = cloneRoom(source)
  copy.door.offset = 0.5
  copy.windows[0].offset = 0.5
  copy.partitions[0].x += 1
  assert.notEqual(copy.door.offset, source.door.offset)
  assert.notEqual(copy.windows[0].offset, source.windows[0].offset)
  assert.notEqual(copy.partitions[0].x, source.partitions[0].x)
})

test('잘못된 공간 데이터는 예외 대신 유효하지 않음으로 반환한다', () => {
  assert.equal(isValidRoom({ ...DEFAULT_ROOM, partitions: {} }), false)
  assert.equal(isValidRoom({ ...DEFAULT_ROOM, windows: {} }), false)
  assert.equal(isValidRoom({ ...DEFAULT_ROOM, door: undefined, window: undefined }), false)
})
