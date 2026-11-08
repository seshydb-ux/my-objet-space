import test from 'node:test'
import assert from 'node:assert/strict'

import { addCartItem, removeCartItem } from '../src/cart.js'
import { PRODUCT_BY_ID, ROOM } from '../src/layout.js'
import { getProductCollision, productPolygon } from '../src/productCollision.js'

const LG_PRODUCT_IDS = ['dryer', 'washer', 'fridge', 'styler']
const CLEAR_ROOM = {
  shape: 'rectangle',
  width: ROOM.width,
  depth: ROOM.depth,
  height: ROOM.height,
  showFurniture: false,
}
const TOLERANCE = 1e-12

function instance(productId, x, angleDegrees) {
  return {
    id: `${productId}-${angleDegrees}`,
    productId,
    position: { x, z: 0 },
    rotation: 0,
    angleDegrees,
  }
}

function polygonRange(productId, angleDegrees, x = 0) {
  const polygon = productPolygon(instance(productId, x, angleDegrees))
  const xs = polygon.map((point) => point.x)
  const zs = polygon.map((point) => point.z)
  return {
    width: Math.max(...xs) - Math.min(...xs),
    depth: Math.max(...zs) - Math.min(...zs),
  }
}

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < TOLERANCE, `${message}: ${actual} !== ${expected}`)
}

for (const productId of LG_PRODUCT_IDS) {
  test(`${productId}: registry mm 규격이 meter 단위 0°/90°/45° 바닥 polygon에 반영된다`, () => {
    const product = PRODUCT_BY_ID[productId]
    const widthMeters = product.widthMm / 1000
    const depthMeters = product.depthMm / 1000
    const diagonalRange = (widthMeters + depthMeters) / Math.sqrt(2)

    assert.equal(product.width, widthMeters)
    assert.equal(product.depth, depthMeters)

    const atZero = polygonRange(productId, 0)
    assertClose(atZero.width, widthMeters, '0° X 범위')
    assertClose(atZero.depth, depthMeters, '0° Z 범위')

    const atNinety = polygonRange(productId, 90)
    assertClose(atNinety.width, depthMeters, '90° X 범위')
    assertClose(atNinety.depth, widthMeters, '90° Z 범위')

    const atFortyFive = polygonRange(productId, 45)
    assertClose(atFortyFive.width, diagonalRange, '45° X 범위')
    assertClose(atFortyFive.depth, diagonalRange, '45° Z 범위')
  })

  test(`${productId}: 0°/90°/45° 회전 범위로 오른쪽 벽 충돌을 다시 계산한다`, () => {
    for (const angleDegrees of [0, 90, 45]) {
      const { width: rotatedWidth } = polygonRange(productId, angleDegrees)
      const touchingX = CLEAR_ROOM.width / 2 - rotatedWidth / 2
      const touching = instance(productId, touchingX, angleDegrees)
      const penetrating = {
        ...touching,
        id: `${touching.id}-penetrating`,
        position: { ...touching.position, x: touchingX + 0.002 },
      }

      assert.equal(
        getProductCollision(touching, [touching], CLEAR_ROOM).colliding,
        false,
        `${angleDegrees}°에서 벽 접촉은 허용해야 한다`,
      )
      assert.equal(
        getProductCollision(penetrating, [penetrating], CLEAR_ROOM).type,
        'wall',
        `${angleDegrees}°에서 2mm 침범은 벽 충돌이어야 한다`,
      )
    }

    const product = PRODUCT_BY_ID[productId]
    const atZeroTouchingX = CLEAR_ROOM.width / 2 - product.width / 2
    const zero = instance(productId, atZeroTouchingX, 0)
    const ninety = instance(productId, atZeroTouchingX, 90)
    const fortyFive = instance(productId, atZeroTouchingX, 45)

    assert.equal(getProductCollision(zero, [zero], CLEAR_ROOM).colliding, false)
    assert.equal(getProductCollision(ninety, [ninety], CLEAR_ROOM).type, 'wall')
    assert.equal(getProductCollision(fortyFive, [fortyFive], CLEAR_ROOM).type, 'wall')
  })

  test(`${productId}: 장바구니 추가, 중복 수량 증가, 삭제가 productId를 유지한다`, () => {
    const empty = []
    const once = addCartItem(empty, productId)
    const twice = addCartItem(once, productId)
    const removed = removeCartItem(twice, productId)

    assert.deepEqual(once, [{ productId, quantity: 1 }])
    assert.deepEqual(twice, [{ productId, quantity: 2 }])
    assert.deepEqual(removed, [])
    assert.deepEqual(empty, [])
  })
}

test('일반 가구는 장바구니 추가를 거절하고 기존 배열을 보존한다', () => {
  for (const productId of ['bed-product', 'sofa-product', 'desk-product']) {
    const cart = [{ productId: 'dryer', quantity: 1 }]
    const next = addCartItem(cart, productId)
    assert.equal(next, cart)
    assert.deepEqual(next, [{ productId: 'dryer', quantity: 1 }])
  }
})
