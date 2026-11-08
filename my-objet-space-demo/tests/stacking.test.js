import test from 'node:test'
import assert from 'node:assert/strict'

import { getSceneCollisions } from '../src/productCollision.js'
import {
  canMoveGroupWithoutCrossingPartitions,
  canRotateGroupWithoutCrossingPartitions,
  deleteStackGroup,
  getStackDimensions,
  getStackMembers,
  moveStackGroup,
  relocateGroupsFromInteriorWalls,
  rotateStackGroup,
  stackWasherDryer,
  unstackWasherDryer,
} from '../src/stacking.js'

const ROOM = {
  shape: 'rectangle', width: 6.2, depth: 5.2, height: 2.4, showFurniture: false,
  partitions: [{ x: 0, startZ: -2.6, endZ: 2.6, gapCenterZ: 1.5, gapWidth: 0.9 }],
}

function instance(id, productId, x, z, angleDegrees = 0) {
  return { id, productId, position: { x, z }, rotation: 0, angleDegrees }
}

test('세탁기 선택 시 가장 가까운 기존 건조기를 재사용해 직렬 그룹을 만든다', () => {
  const washer = instance('washer-1', 'washer', -2, 0, 45)
  const nearDryer = instance('dryer-near', 'dryer', -1, 0, 90)
  const farDryer = instance('dryer-far', 'dryer', 2, 0, 0)
  const result = stackWasherDryer([washer, farDryer, nearDryer], washer.id)
  const members = getStackMembers(result.products, washer.id)

  assert.equal(result.createdId, null)
  assert.deepEqual(members.map((item) => item.id).sort(), ['dryer-near', 'washer-1'])
  assert.ok(members.every((item) => item.stackId === result.stackId))
  assert.ok(members.every((item) => item.position.x === -2 && item.position.z === 0 && item.angleDegrees === 45))
  assert.equal(members.find((item) => item.productId === 'washer').stackRole, 'base')
  assert.equal(members.find((item) => item.productId === 'dryer').stackRole, 'top')
  assert.equal(result.products.find((item) => item.id === 'dryer-far').stackId, undefined)
})

test('짝 제품이 없으면 고유 ID로 생성하고 공식 본체 규격 합계만 제공한다', () => {
  const dryer = instance('dryer-1', 'dryer', 1, -1, 0)
  const result = stackWasherDryer([dryer], dryer.id)
  assert.match(result.createdId, /^washer-stack-/)
  assert.equal(result.products.length, 2)
  assert.deepEqual(getStackDimensions(result.products, dryer.id), {
    widthMm: 700,
    bodyHeightMm: 1980,
    depthMm: 830,
    isInstallationSize: false,
  })
})

test('직렬 그룹은 함께 이동·회전·삭제된다', () => {
  const stacked = stackWasherDryer([instance('washer-1', 'washer', -2, 0)], 'washer-1').products
  const moved = moveStackGroup(stacked, 'washer-1', { x: 1.1, z: 0.8 })
  assert.ok(getStackMembers(moved, 'washer-1').every((item) => item.position.x === 1.1 && item.position.z === 0.8))
  const rotated = rotateStackGroup(moved, 'washer-1', 405)
  assert.ok(getStackMembers(rotated, 'washer-1').every((item) => item.angleDegrees === 45))
  assert.deepEqual(deleteStackGroup(rotated, 'washer-1'), [])
})

test('공간 변경 시 새 내부벽에 겹친 조합만 함께 옮기고 다른 배치를 보존한다', () => {
  const stack = stackWasherDryer([instance('washer-1', 'washer', 0, 0)], 'washer-1').products
  const sofa = instance('sofa-1', 'sofa-product', 2, -1)
  const result = relocateGroupsFromInteriorWalls([...stack, sofa], ROOM)
  assert.equal(result.success, true)
  assert.equal(result.movedIds.length, 2)
  assert.equal(result.products.find((item) => item.id === sofa.id), sofa)
  const members = getStackMembers(result.products, 'washer-1')
  assert.ok(members.every((item) => item.position.x === members[0].position.x && item.position.z === members[0].position.z))
  assert.ok(members.every((item) => !getSceneCollisions(result.products, ROOM)[item.id].colliding))
})

test('같은 직렬 구성원은 서로 충돌하지 않고 그룹의 충돌이 두 제품에 전파된다', () => {
  const stacked = stackWasherDryer([instance('washer-1', 'washer', -2.76, 0)], 'washer-1').products
  const collisions = getSceneCollisions(stacked, ROOM)
  for (const member of stacked) {
    assert.equal(collisions[member.id].type, 'wall')
    assert.equal(collisions[member.id].otherId, null)
  }

  const clear = moveStackGroup(stacked, 'washer-1', { x: -2, z: 0 })
  const clearCollisions = getSceneCollisions(clear, ROOM)
  assert.ok(Object.values(clearCollisions).every((collision) => !collision.colliding))
})

test('다른 제품과 겹치면 직렬 그룹 두 구성원 모두 같은 상대 충돌을 표시한다', () => {
  const stacked = stackWasherDryer([instance('washer-1', 'washer', -2, 0)], 'washer-1').products
  const sofa = instance('sofa-1', 'sofa-product', -2, 0)
  const collisions = getSceneCollisions([...stacked, sofa], ROOM)
  for (const member of stacked) {
    assert.equal(collisions[member.id].type, 'product')
    assert.equal(collisions[member.id].otherId, sofa.id)
  }
})

test('직렬 해제는 주변 빈 위치를 찾아 메타데이터를 제거한다', () => {
  const stacked = stackWasherDryer([instance('washer-1', 'washer', -2, 0)], 'washer-1').products
  const result = unstackWasherDryer(stacked, 'washer-1', ROOM)
  assert.equal(result.reason, null)
  assert.ok(result.releasedId)
  assert.ok(result.products.every((item) => !item.stackId && !item.stackRole))
  assert.notDeepEqual(result.products[0].position, result.products[1].position)
  assert.ok(Object.values(getSceneCollisions(result.products, ROOM)).every((collision) => !collision.colliding))
})

test('직렬 해제 위치가 모두 막혀 있으면 해제하지 않고 실패 상태를 반환한다', () => {
  const tinyRoom = { ...ROOM, width: 0.84, depth: 0.94, partitions: [] }
  const stacked = stackWasherDryer([instance('washer-1', 'washer', 0, 0)], 'washer-1').products
  const result = unstackWasherDryer(stacked, 'washer-1', tinyRoom)
  assert.equal(result.products, stacked)
  assert.equal(result.releasedId, null)
  assert.equal(result.reason, 'no-space')
})

test('이동 경로가 내부벽을 가로지르면 막고 출입구 경로는 허용한다', () => {
  const stacked = stackWasherDryer([instance('washer-1', 'washer', -1, 0)], 'washer-1').products
  assert.equal(canMoveGroupWithoutCrossingPartitions(stacked, 'washer-1', { x: 1, z: 0 }, ROOM), false)
  const byDoor = moveStackGroup(stacked, 'washer-1', { x: -1, z: 1.5 })
  assert.equal(canMoveGroupWithoutCrossingPartitions(byDoor, 'washer-1', { x: 1, z: 1.5 }, ROOM), true)
})

test('기존 위치가 내부벽과 겹치면 벽 밖으로 빠져나가는 복구 이동은 허용한다', () => {
  const trapped = stackWasherDryer([instance('washer-1', 'washer', 0, 0)], 'washer-1').products
  assert.equal(canMoveGroupWithoutCrossingPartitions(trapped, 'washer-1', { x: -1, z: 0 }, ROOM), true)
  assert.equal(canMoveGroupWithoutCrossingPartitions(trapped, 'washer-1', { x: 0.01, z: 0 }, ROOM), true)

  let products = trapped
  for (let step = 1; step <= 45; step += 1) {
    const position = { x: -step * 0.01, z: 0 }
    assert.equal(canMoveGroupWithoutCrossingPartitions(products, 'washer-1', position, ROOM), true)
    products = moveStackGroup(products, 'washer-1', position)
  }
  assert.ok(getStackMembers(products, 'washer-1').every((member) => member.position.x === -0.45))
  assert.equal(canMoveGroupWithoutCrossingPartitions(products, 'washer-1', { x: 0.45, z: 0 }, ROOM), false)
})

test('벽에 겹친 제품은 파티션 중심 쪽으로 더 깊어지는 작은 이동을 거부한다', () => {
  const trapped = stackWasherDryer([instance('washer-1', 'washer', -0.2, 0)], 'washer-1').products
  assert.equal(canMoveGroupWithoutCrossingPartitions(trapped, 'washer-1', { x: -0.19, z: 0 }, ROOM), false)
  assert.equal(canMoveGroupWithoutCrossingPartitions(trapped, 'washer-1', { x: -0.21, z: 0 }, ROOM), true)
})

test('직렬 해제는 내부벽 반대편의 빈 자리로 순간이동하지 않는다', () => {
  const narrowDoorRoom = {
    ...ROOM,
    partitions: [{ x: 0, startZ: -2.6, endZ: 2.6, gapCenterZ: 2.3, gapWidth: 0.3 }],
  }
  const stacked = stackWasherDryer([instance('washer-1', 'washer', -0.65, 0)], 'washer-1').products
  const blockers = [
    instance('block-right-z', 'sofa-product', -0.65, 1.0),
    instance('block-left-z', 'sofa-product', -0.65, -1.0),
    instance('block-left-x', 'sofa-product', -1.7, 0),
  ]
  const all = [...stacked, ...blockers]
  const result = unstackWasherDryer(all, 'washer-1', narrowDoorRoom)
  assert.equal(result.reason, 'no-space')
  assert.equal(result.products, all)
})

test('회전 중 내부벽을 침범하면 회전을 막는다', () => {
  const nearWall = stackWasherDryer([instance('washer-1', 'washer', -0.43, 0, 0)], 'washer-1').products
  assert.equal(canRotateGroupWithoutCrossingPartitions(nearWall, 'washer-1', 90, ROOM), false)
  const clear = moveStackGroup(nearWall, 'washer-1', { x: -1.2, z: 0 })
  assert.equal(canRotateGroupWithoutCrossingPartitions(clear, 'washer-1', 90, ROOM), true)
})
