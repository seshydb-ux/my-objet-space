import test from 'node:test'
import assert from 'node:assert/strict'

import { isValidRoom, roomArea } from '../src/roomGeometry.js'
import { acquireCameraStream, cameraErrorMessage, DEFAULT_SCAN_FORM, makeScannedRoom, SCAN_STAGES, scanAreaLabel, scanStageIndex, scanStageLabel, stopMediaStream } from '../src/roomScan.js'

test('기본 스캔 결과는 내부 벽과 두 창을 가진 6.2m × 5.2m 투룸이다', () => {
  const room = makeScannedRoom()
  assert.equal(isValidRoom(room), true)
  assert.equal(room.width, 6.2)
  assert.equal(room.depth, 5.2)
  assert.equal(room.height, 2.4)
  assert.equal(roomArea(room), 32.24)
  assert.equal(room.label, '스캔된 투룸')
  assert.equal(room.layout, 'two-room')
  assert.equal(room.source, 'scan-demo')
  assert.equal(room.scanDemo, true)
  assert.equal(room.partitions.length, 1)
  assert.equal(room.partitions[0].hasDoor, true)
  assert.equal(room.windows.length, 1)
  assert.deepEqual(room.zones, { bedroomSide: 'left', appliance: { x: 2.2506, z: -1.7524000000000002 } })
})

test('면적과 meter 값은 사용자가 수정한 mm 입력에서 계산한다', () => {
  const form = { ...DEFAULT_SCAN_FORM, width: '4000', depth: '5000', height: '2600' }
  const room = makeScannedRoom(form)
  assert.deepEqual([room.width, room.depth, room.height], [4, 5, 2.6])
  assert.equal(scanAreaLabel(form), '20.0㎡')
  assert.equal(isValidRoom(room), true)
})

test('수정한 투룸 치수에 맞춰 내부 벽과 출입구 위치를 비례 조정한다', () => {
  const form = { ...DEFAULT_SCAN_FORM, width: '7000', depth: '6000' }
  const room = makeScannedRoom(form)
  assert.equal(room.shape, 'rectangle')
  assert.equal(room.partitions[0].x, -0.623)
  assert.equal(room.partitions[0].startZ, -3)
  assert.equal(room.partitions[0].endZ, 3)
  assert.equal(room.partitions[0].gapCenterZ, 1.56)
  assert.equal(room.partitions[0].gapWidth, 0.95)
  assert.equal(scanAreaLabel(form), '42.0㎡')
})

test('L자형 투룸은 노치 밖의 뒤쪽 창과 왼쪽 창, 내부 벽을 유지한다', () => {
  const room = makeScannedRoom({ ...DEFAULT_SCAN_FORM, shape: 'l' })
  assert.equal(room.shape, 'l')
  assert.equal(isValidRoom(room), true)
  assert.equal(room.window.wall, 'back')
  assert.equal(room.window.offset, 0.32)
  assert.equal(room.windows.length, 1)
  assert.equal(room.partitions.length, 1)
  assert.equal(room.partitions[0].hasDoor, true)
  assert.ok(Math.abs(room.zones.appliance.z - 0.936) < 1e-12)
  assert.equal(scanAreaLabel({ ...DEFAULT_SCAN_FORM, shape: 'l' }), '27.1㎡')
})

test('진행률은 여섯 분석 단계의 경계에 맞게 제한된다', () => {
  assert.equal(SCAN_STAGES.length, 6)
  assert.deepEqual([-10, 0, 16.6, 16.7, 49.9, 50, 83.3, 83.4, 100, 140].map(scanStageIndex), [0, 0, 0, 1, 2, 3, 4, 5, 5, 5])
  assert.equal(scanStageLabel(40), '방의 구조를 분석하고 있어요')
  assert.equal(scanStageLabel(100), '3D 공간을 만들고 있어요')
})

test('카메라 취득은 후면 카메라를 선호하고 현재 요청에 스트림을 반환한다', async () => {
  const stream = { getTracks: () => [] }
  let constraints
  const result = await acquireCameraStream(async (value) => { constraints = value; return stream }, () => true)
  assert.deepEqual(constraints, { audio: false, video: { facingMode: { ideal: 'environment' } } })
  assert.deepEqual(result, { status: 'active', stream })
})

test('취소 뒤 늦게 도착한 카메라 스트림은 모든 트랙을 종료한다', async () => {
  let resolveCamera
  const stopped = []
  const stream = { getTracks: () => [{ stop: () => stopped.push('video') }, { stop: () => stopped.push('audio') }] }
  let current = true
  const pending = acquireCameraStream(() => new Promise((resolve) => { resolveCamera = resolve }), () => current)
  current = false
  resolveCamera(stream)
  assert.deepEqual(await pending, { status: 'stale' })
  assert.deepEqual(stopped, ['video', 'audio'])
})

test('권한 거부와 장치 없음 오류는 호출자에게 상태로 반환되고 throw하지 않는다', async () => {
  for (const name of ['NotAllowedError', 'NotFoundError']) {
    const error = Object.assign(new Error(name), { name })
    const result = await acquireCameraStream(async () => { throw error }, () => true)
    assert.equal(result.status, 'error')
    assert.equal(result.error, error)
    assert.match(cameraErrorMessage(result.error), /데모 모드/)
  }
  assert.match(cameraErrorMessage({ name: 'NotAllowedError' }), /권한/)
  assert.match(cameraErrorMessage({ name: 'NotFoundError' }), /찾지 못했어요/)
})

test('카메라 종료 시 활성 스트림의 모든 트랙을 정리한다', () => {
  let stopped = 0
  stopMediaStream({ getTracks: () => [{ stop: () => stopped++ }, { stop: () => stopped++ }] })
  stopMediaStream(null)
  assert.equal(stopped, 2)
})
