import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getProductCollision,
  getSceneCollisions,
  productFootprint,
} from '../src/productCollision.js'
import { PRODUCT_BY_ID } from '../src/layout.js'

function instance(id, productId, x, z, rotation = 0) {
  return { id, productId, position: { x, z }, rotation }
}

test('제품 footprint는 90도와 270도에서 폭과 깊이를 교환한다', () => {
  const dryer = PRODUCT_BY_ID.dryer

  assert.deepEqual(productFootprint('dryer', 0), {
    width: dryer.width,
    depth: dryer.depth,
  })
  assert.deepEqual(productFootprint('dryer', 1), {
    width: dryer.depth,
    depth: dryer.width,
  })
  assert.deepEqual(productFootprint('dryer', 2), {
    width: dryer.width,
    depth: dryer.depth,
  })
  assert.deepEqual(productFootprint('dryer', 3), {
    width: dryer.depth,
    depth: dryer.width,
  })
})

test('두 제품이 가장자리에서 맞닿기만 하면 어느 쪽도 충돌하지 않는다', () => {
  const dryer = instance('dryer-1', 'dryer', 0.5, 0.3)
  const sofa = PRODUCT_BY_ID['sofa-product']
  const touchingX = dryer.position.x + PRODUCT_BY_ID.dryer.width / 2 + sofa.width / 2
  const placedSofa = instance('sofa-1', 'sofa-product', touchingX, 0.3)
  const collisions = getSceneCollisions([dryer, placedSofa])

  assert.equal(collisions['dryer-1'].colliding, false)
  assert.equal(collisions['sofa-1'].colliding, false)
})

test('두 제품이 겹치면 양쪽 모두 상대 제품을 충돌 대상으로 보고한다', () => {
  const dryer = instance('dryer-1', 'dryer', 0.5, 0.3)
  const sofa = PRODUCT_BY_ID['sofa-product']
  const overlappingX =
    dryer.position.x + PRODUCT_BY_ID.dryer.width / 2 + sofa.width / 2 - 0.01
  const placedSofa = instance('sofa-1', 'sofa-product', overlappingX, 0.3)
  const collisions = getSceneCollisions([dryer, placedSofa])

  assert.deepEqual(collisions['dryer-1'], {
    colliding: true,
    type: 'product',
    label: sofa.shortName,
    otherId: 'sofa-1',
  })
  assert.deepEqual(collisions['sofa-1'], {
    colliding: true,
    type: 'product',
    label: PRODUCT_BY_ID.dryer.shortName,
    otherId: 'dryer-1',
  })
})

test('제품을 90도 회전하면 같은 위치에서도 제품 간 충돌이 다시 계산된다', () => {
  const dryer = instance('dryer-1', 'dryer', 0, 0)
  const deskAtZero = instance('desk-1', 'desk-product', 0.8, 0, 0)
  const deskAtNinety = { ...deskAtZero, rotation: 1 }

  assert.equal(getProductCollision(deskAtZero, [dryer, deskAtZero]).type, 'product')
  assert.equal(getProductCollision(deskAtNinety, [dryer, deskAtNinety]).colliding, false)
})

test('자기 자신은 제품 충돌 대상으로 계산하지 않는다', () => {
  const dryer = instance('dryer-1', 'dryer', 0, 0)

  assert.equal(getProductCollision(dryer, [dryer]).colliding, false)
})

