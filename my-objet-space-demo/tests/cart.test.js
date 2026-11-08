import test from 'node:test'
import assert from 'node:assert/strict'

import {
  addCartItem,
  cartSummary,
  changeCartQuantity,
  isPurchasable,
  removeCartItem,
} from '../src/cart.js'
import { PRODUCT_CATALOG } from '../src/layout.js'

test('처음 담는 제품은 수량 1로 추가되고 기존 장바구니를 변경하지 않는다', () => {
  const cart = []
  const next = addCartItem(cart, 'dryer')

  assert.deepEqual(next, [{ productId: 'dryer', quantity: 1 }])
  assert.deepEqual(cart, [])
})

test('같은 제품을 다시 담으면 새 행을 만들지 않고 수량을 증가시킨다', () => {
  const cart = [{ productId: 'dryer', quantity: 1 }]
  const next = addCartItem(cart, 'dryer')

  assert.deepEqual(next, [{ productId: 'dryer', quantity: 2 }])
  assert.deepEqual(cart, [{ productId: 'dryer', quantity: 1 }])
})

test('명시적으로 구매 가능한 LG 제품만 장바구니 대상이다', () => {
  assert.equal(isPurchasable('dryer'), true)
  assert.equal(isPurchasable('bed-product'), false)
  assert.equal(isPurchasable('unknown-product'), false)
})

test('일반 가구 추가 요청은 거부하고 기존 장바구니 참조와 내용을 보존한다', () => {
  const cart = [{ productId: 'dryer', quantity: 1 }]
  const next = addCartItem(cart, 'sofa-product')

  assert.equal(next, cart)
  assert.deepEqual(next, [{ productId: 'dryer', quantity: 1 }])
})

test('카탈로그에 없는 제품 추가 요청도 거부한다', () => {
  const cart = []
  const next = addCartItem(cart, 'unknown-product')

  assert.equal(next, cart)
  assert.deepEqual(next, [])
})

test('수량 변경은 대상 제품만 변경하고 0 이하가 되면 삭제한다', () => {
  const cart = [
    { productId: 'dryer', quantity: 2 },
    { productId: 'sofa-product', quantity: 1 },
  ]

  assert.deepEqual(changeCartQuantity(cart, 'dryer', -1), [
    { productId: 'dryer', quantity: 1 },
    { productId: 'sofa-product', quantity: 1 },
  ])
  assert.deepEqual(changeCartQuantity(cart, 'sofa-product', -1), [
    { productId: 'dryer', quantity: 2 },
  ])
  assert.deepEqual(cart, [
    { productId: 'dryer', quantity: 2 },
    { productId: 'sofa-product', quantity: 1 },
  ])
})

test('삭제는 선택한 제품 행만 제거한다', () => {
  const cart = [
    { productId: 'dryer', quantity: 1 },
    { productId: 'desk-product', quantity: 2 },
  ]

  assert.deepEqual(removeCartItem(cart, 'dryer'), [
    { productId: 'desk-product', quantity: 2 },
  ])
})

test('실제 제품 카탈로그에는 임의 가격을 표시하지 않는다', () => {
  for (const product of PRODUCT_CATALOG) {
    assert.equal(product.price, null, `${product.id}의 가격은 확인되지 않은 상태여야 한다`)
  }
})

test('장바구니 요약은 독립 fixture의 확인 가격과 미확인 가격을 분리한다', () => {
  const products = {
    'priced-fixture': { id: 'priced-fixture', price: 12000 },
    'unpriced-fixture': { id: 'unpriced-fixture', price: null },
  }
  const cart = [
    { productId: 'priced-fixture', quantity: 2 },
    { productId: 'unpriced-fixture', quantity: 3 },
  ]

  assert.deepEqual(cartSummary(cart, products), {
    quantity: 5,
    knownTotal: 24000,
    unpricedQuantity: 3,
  })
})
