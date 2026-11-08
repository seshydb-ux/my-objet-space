import test from 'node:test'
import assert from 'node:assert/strict'
import { addCartItem } from '../src/cart.js'
import { getProductCollision, getSceneCollisions } from '../src/productCollision.js'
import { makeScannedRoom } from '../src/roomScan.js'
import { furnishScannedRoom } from '../src/scanFurnishing.js'

test('기본 스캔 공간에 충돌 없는 가구와 건조기를 배치한다', () => {
  const room = makeScannedRoom()
  const products = furnishScannedRoom(room)
  assert.deepEqual(products.map((item) => item.productId), ['dryer', 'kitchen-counter-product', 'bed-product', 'sofa-product', 'coffee-table-product', 'desk-product'])
  assert.equal(new Set(products.map((item) => item.id)).size, products.length)
  assert.ok(Object.values(getSceneCollisions(products, room)).every((collision) => !collision.colliding))
})

test('투룸 스캔에서는 침대와 생활 가구를 내부 벽 양쪽에 나눠 배치한다', () => {
  const room = makeScannedRoom()
  const products = furnishScannedRoom(room)
  const partition = room.partitions[0]
  const byProduct = Object.fromEntries(products.map((item) => [item.productId, item]))
  assert.ok(partition, '투룸 스캔에는 내부 벽이 있어야 한다')
  assert.ok(byProduct['bed-product'].position.x < partition.x)
  for (const productId of ['dryer', 'kitchen-counter-product', 'sofa-product', 'desk-product', 'coffee-table-product']) {
    assert.ok(byProduct[productId].position.x > partition.x, `${productId}는 생활 공간에 있어야 한다`)
  }
  assert.deepEqual(byProduct.dryer.position, room.zones.appliance)
  const gapClearance = partition.gapWidth / 2 + 0.2
  assert.ok(products.every((item) => Math.abs(item.position.z - partition.gapCenterZ) > gapClearance || Math.abs(item.position.x - partition.x) > 0.6))
})

test('편집한 작은 투룸에서도 배치된 가구가 벽이나 서로 겹치지 않는다', () => {
  for (const form of [
    { width: '2400', depth: '2400', height: '2400' },
    { width: '4500', depth: '3200', height: '2400' },
    { width: '3600', depth: '4500', height: '2400' },
    { width: '3600', depth: '3600', height: '2400' },
  ]) {
    const room = makeScannedRoom(form)
    const products = furnishScannedRoom(room)
    assert.ok(products.some((item) => item.productId === 'dryer'))
    assert.ok(Object.values(getSceneCollisions(products, room)).every((collision) => !collision.colliding), JSON.stringify(form))
  }
})

test('직사각형과 L자형 기본 투룸 모두 주방 카운터를 충돌 없이 배치한다', () => {
  for (const shape of ['rectangle', 'l']) {
    const room = makeScannedRoom({ shape, width: '6200', depth: '5200', height: '2400' })
    const products = furnishScannedRoom(room)
    const kitchen = products.find((item) => item.productId === 'kitchen-counter-product')
    assert.ok(kitchen, `${shape} 투룸에 주방 카운터가 있어야 한다`)
    assert.equal(getProductCollision(kitchen, products, room).colliding, false)
  }
})

test('기존 배치를 보존하고 이미 같은 종류가 있다면 중복하지 않는다', () => {
  const room = makeScannedRoom()
  const current = [{ id: 'my-dryer', productId: 'dryer', position: { x: 0, z: 0 }, rotation: 0, angleDegrees: 45 }]
  const snapshot = structuredClone(current)
  const result = furnishScannedRoom(room, current)
  assert.deepEqual(current, snapshot)
  assert.equal(result[0], current[0])
  assert.equal(result.filter((item) => item.productId === 'dryer').length, 1)
  assert.deepEqual(furnishScannedRoom(room, result), result)
})

test('시연 가구를 회전하거나 다른 가구에 겹치면 기존 충돌과 장바구니 규칙을 따른다', () => {
  const room = makeScannedRoom()
  const products = furnishScannedRoom(room)
  const sofa = products.find((item) => item.productId === 'sofa-product')
  const dryer = products.find((item) => item.productId === 'dryer')
  const moved = { ...sofa, position: { ...dryer.position }, angleDegrees: 45 }
  assert.equal(getProductCollision(moved, products, room).colliding, true)
  assert.deepEqual(addCartItem([], 'sofa-product'), [])
  assert.deepEqual(addCartItem([], 'dryer'), [{ productId: 'dryer', quantity: 1 }])
})
