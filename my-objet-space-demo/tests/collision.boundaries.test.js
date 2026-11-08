import test from 'node:test'
import assert from 'node:assert/strict'

import { dryerFootprint, getCollision } from '../src/collision.js'
import { COLLISION_EPSILON, DRYER, FURNITURE, ROOM } from '../src/layout.js'

const wallCases = [
  {
    name: '오른쪽 벽',
    contact: { x: ROOM.width / 2 - DRYER.width / 2, z: 0 },
    penetration: { x: ROOM.width / 2 - DRYER.width / 2 + 0.002, z: 0 },
  },
  {
    name: '왼쪽 벽',
    contact: { x: -ROOM.width / 2 + DRYER.width / 2, z: -0.8 },
    penetration: {
      x: -ROOM.width / 2 + DRYER.width / 2 - 0.002,
      z: -0.8,
    },
  },
  {
    name: '앞쪽 벽',
    contact: { x: 0, z: ROOM.depth / 2 - DRYER.depth / 2 },
    penetration: { x: 0, z: ROOM.depth / 2 - DRYER.depth / 2 + 0.002 },
  },
  {
    name: '뒤쪽 벽',
    contact: { x: -0.8, z: -ROOM.depth / 2 + DRYER.depth / 2 },
    penetration: {
      x: -0.8,
      z: -ROOM.depth / 2 + DRYER.depth / 2 - 0.002,
    },
  },
]

for (const { name, contact, penetration } of wallCases) {
  test(`${name}에 맞닿기만 하면 충돌하지 않는다`, () => {
    assert.deepEqual(getCollision(contact, 0), {
      colliding: false,
      type: null,
      label: null,
    })
  })

  test(`${name}을 허용오차보다 많이 침범하면 벽 충돌이다`, () => {
    const collision = getCollision(penetration, 0)
    assert.equal(collision.colliding, true)
    assert.equal(collision.type, 'wall')
    assert.equal(collision.label, '벽')
  })
}

test('가구 가장자리 접촉은 허용하고 1mm를 넘긴 침범은 가구 충돌로 판정한다', () => {
  const bed = FURNITURE.find(({ id }) => id === 'bed')
  const contactX = bed.x + bed.width / 2 + DRYER.width / 2

  assert.equal(getCollision({ x: contactX, z: bed.z }, 0).colliding, false)

  const collision = getCollision(
    { x: contactX - COLLISION_EPSILON - 0.001, z: bed.z },
    0,
  )
  assert.equal(collision.colliding, true)
  assert.equal(collision.type, 'furniture')
  assert.equal(collision.label, '침대')
})

test('90도 회전은 폭과 깊이를 바꾸고 같은 위치의 벽 충돌 상태를 갱신한다', () => {
  assert.deepEqual(dryerFootprint(0), {
    width: DRYER.width,
    depth: DRYER.depth,
  })
  assert.deepEqual(dryerFootprint(1), {
    width: DRYER.depth,
    depth: DRYER.width,
  })

  const position = { x: 2.36, z: 0 }
  assert.equal(getCollision(position, 0).colliding, false)
  assert.equal(getCollision(position, 1).type, 'wall')
  assert.equal(getCollision(position, 2).colliding, false)
  assert.equal(getCollision(position, 3).type, 'wall')
})
