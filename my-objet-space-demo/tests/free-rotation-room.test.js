import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'

import {
  getProductCollision,
  getSceneCollisions,
  productAngle,
  productPolygon,
} from '../src/productCollision.js'
import { PRODUCT_BY_ID, ROOM } from '../src/layout.js'

const clearRoom = {
  shape: 'rectangle',
  width: ROOM.width,
  depth: ROOM.depth,
  height: ROOM.height,
  showFurniture: false,
}

function instance(id, productId, x, z, angleDegrees) {
  return { id, productId, position: { x, z }, rotation: 0, angleDegrees }
}

test('자유 회전 각도와 기존 90도 회전 값을 모두 지원한다', () => {
  assert.equal(productAngle({ angleDegrees: 37, rotation: 3 }), 37)
  assert.equal(productAngle({ rotation: 3 }), 270)
  assert.equal(productAngle({ angleDegrees: -10 }), 350)
})

test('AABB는 겹치지만 실제 회전 사각형이 떨어진 경우 충돌하지 않는다', () => {
  const first = instance('desk-1', 'desk-product', 0, 0, 45)
  const second = instance('desk-2', 'desk-product', 0.45, 0.45, 45)
  const collisions = getSceneCollisions([first, second], clearRoom)

  assert.equal(collisions[first.id].colliding, false)
  assert.equal(collisions[second.id].colliding, false)
})

test('45도 제품이 벽을 1mm보다 많이 침범하면 충돌한다', () => {
  const dryer = PRODUCT_BY_ID.dryer
  const rotatedHalfWidth = (dryer.width + dryer.depth) / (2 * Math.sqrt(2))
  const touching = instance(
    'dryer-touching',
    'dryer',
    clearRoom.width / 2 - rotatedHalfWidth,
    0,
    45,
  )
  const penetrating = {
    ...touching,
    id: 'dryer-penetrating',
    position: { ...touching.position, x: touching.position.x + 0.002 },
  }

  assert.equal(getProductCollision(touching, [touching], clearRoom).colliding, false)
  assert.equal(getProductCollision(penetrating, [penetrating], clearRoom).type, 'wall')
})

test('L자형의 빠진 영역은 방 밖으로 판정한다', () => {
  const lRoom = { ...clearRoom, shape: 'l' }
  const notchEdgeX = lRoom.width / 2 - lRoom.width * 0.4
  const notchEdgeZ = -lRoom.depth / 2 + lRoom.depth * 0.4
  const dryer = instance('dryer-notch', 'dryer', notchEdgeX + 0.2, notchEdgeZ - 0.2, 0)

  assert.equal(getProductCollision(dryer, [dryer], lRoom).type, 'wall')
})

test('제품 모서리가 빠진 영역에 없어도 L자 오목 모서리를 가로지르면 충돌한다', () => {
  const lRoom = { ...clearRoom, shape: 'l' }
  const notchEdgeX = lRoom.width / 2 - lRoom.width * 0.4
  const notchEdgeZ = -lRoom.depth / 2 + lRoom.depth * 0.4
  const desk = instance('desk-crossing', 'desk-product', notchEdgeX, notchEdgeZ, 135)
  const corners = productPolygon(desk)

  assert.equal(corners.some((point) => point.x > notchEdgeX && point.z < notchEdgeZ), false)
  assert.equal(getProductCollision(desk, [desk], lRoom).type, 'wall')
})

test('맞춤 방에서는 showFurniture가 true일 때만 기존 가구를 충돌 대상으로 사용한다', () => {
  const dryer = instance('dryer', 'dryer', -1.65, 0.84, 0)

  assert.equal(getProductCollision(dryer, [dryer], clearRoom).colliding, false)
  assert.equal(getProductCollision(dryer, [dryer], { ...clearRoom, showFurniture: true }).type, 'furniture')
  assert.equal(getProductCollision(dryer, [dryer]).type, 'furniture')
})

test('내부 구획의 벽 부분은 자유 회전 제품과 충돌한다', () => {
  const partitionedRoom = {
    ...clearRoom,
    partitions: [{ x: 0, startZ: -1.8, endZ: 1.8, gapCenterZ: 0, gapWidth: 1.2 }],
  }
  const desk = instance('desk-wall', 'desk-product', 0, 0.9, 32)

  assert.equal(getProductCollision(desk, [desk], partitionedRoom).type, 'wall')
})

test('내부 구획의 출입구 구간은 제품이 통과할 수 있다', () => {
  const partitionedRoom = {
    ...clearRoom,
    partitions: [{ x: 0, startZ: -1.8, endZ: 1.8, gapCenterZ: 0, gapWidth: 1.2 }],
  }
  const dryer = instance('dryer-doorway', 'dryer', 0, 0, 0)

  assert.equal(getProductCollision(dryer, [dryer], partitionedRoom).colliding, false)
})

test('gapWidth가 0인 구획은 전체가 실벽이다', () => {
  const partitionedRoom = {
    ...clearRoom,
    partitions: [{ x: 0, startZ: -1.8, endZ: 1.8, gapCenterZ: 0, gapWidth: 0 }],
  }
  const dryer = instance('dryer-solid-wall', 'dryer', 0, 0, 0)

  assert.equal(getProductCollision(dryer, [dryer], partitionedRoom).type, 'wall')
})

for (const angleDegrees of [45, 135]) {
  test(`${angleDegrees}도 footprint가 Three.js Y축 회전 좌표와 일치한다`, () => {
    const desk = instance(`desk-${angleDegrees}`, 'desk-product', 0.3, -0.2, angleDegrees)
    const product = PRODUCT_BY_ID['desk-product']
    const axis = new THREE.Vector3(0, 1, 0)
    const expected = [
      [-product.width / 2, -product.depth / 2],
      [product.width / 2, -product.depth / 2],
      [product.width / 2, product.depth / 2],
      [-product.width / 2, product.depth / 2],
    ].map(([x, z]) => {
      const transformed = new THREE.Vector3(x, 0, z)
        .applyAxisAngle(axis, angleDegrees * Math.PI / 180)
      return { x: transformed.x + desk.position.x, z: transformed.z + desk.position.z }
    })

    productPolygon(desk).forEach((point, index) => {
      assert.ok(Math.abs(point.x - expected[index].x) < 1e-12)
      assert.ok(Math.abs(point.z - expected[index].z) < 1e-12)
    })
  })
}

test('시각 회전 방향을 따라 놓인 장애물과 충돌한다', () => {
  const desk = instance('desk-direction', 'desk-product', 0, 0, 45)
  const dryer = instance('dryer-direction', 'dryer', 0.65, -0.65, 0)
  const collisions = getSceneCollisions([desk, dryer], clearRoom)

  assert.equal(collisions[desk.id].type, 'product')
  assert.equal(collisions[desk.id].otherId, dryer.id)
  assert.equal(collisions[dryer.id].type, 'product')
})
