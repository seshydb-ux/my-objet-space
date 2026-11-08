import test from 'node:test'
import assert from 'node:assert/strict'
import { dryerFootprint, getCollision, strictOverlap, toBounds } from './collision.js'
import { DRYER, FURNITURE, ROOM } from './layout.js'

test('90도와 270도에서 폭과 깊이를 교환한다', () => {
  assert.deepEqual(dryerFootprint(0), { width: DRYER.width, depth: DRYER.depth })
  assert.deepEqual(dryerFootprint(1), { width: DRYER.depth, depth: DRYER.width })
  assert.deepEqual(dryerFootprint(2), { width: DRYER.width, depth: DRYER.depth })
  assert.deepEqual(dryerFootprint(3), { width: DRYER.depth, depth: DRYER.width })
})

test('가구와 맞닿기만 하면 겹침이 아니다', () => {
  const bed = FURNITURE[0]
  const dryer = toBounds({
    x: bed.x + bed.width / 2 + DRYER.width / 2,
    z: bed.z,
    width: DRYER.width,
    depth: DRYER.depth,
  })
  assert.equal(strictOverlap(dryer, toBounds(bed)), false)
})

test('가구를 1mm보다 많이 침범하면 겹침이다', () => {
  const bed = FURNITURE[0]
  const dryer = toBounds({
    x: bed.x + bed.width / 2 + DRYER.width / 2 - 0.002,
    z: bed.z,
    width: DRYER.width,
    depth: DRYER.depth,
  })
  assert.equal(strictOverlap(dryer, toBounds(bed)), true)
})

test('네 벽의 정확한 접촉은 정상이다', () => {
  const x = ROOM.width / 2 - DRYER.width / 2
  const z = ROOM.depth / 2 - DRYER.depth / 2
  assert.equal(getCollision({ x, z: 0 }, 0).colliding, false)
  assert.equal(getCollision({ x: -x, z: -0.8 }, 0).colliding, false)
  assert.equal(getCollision({ x: 0, z }, 0).colliding, false)
  assert.equal(getCollision({ x: -0.8, z: -z }, 0).colliding, false)
})

test('네 벽을 1mm보다 많이 침범하면 충돌이다', () => {
  const x = ROOM.width / 2 - DRYER.width / 2 + 0.002
  const z = ROOM.depth / 2 - DRYER.depth / 2 + 0.002
  assert.equal(getCollision({ x, z: 0 }, 0).type, 'wall')
  assert.equal(getCollision({ x: -x, z: -0.8 }, 0).type, 'wall')
  assert.equal(getCollision({ x: 0, z }, 0).type, 'wall')
  assert.equal(getCollision({ x: -0.8, z: -z }, 0).type, 'wall')
})
