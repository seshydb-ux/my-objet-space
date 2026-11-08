import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { PRODUCT_BY_ID, PRODUCT_CATALOG, PRODUCT_REGISTRY } from '../src/products.js'
import { DRYER } from '../src/layout.js'

const expectedOfficial = {
  dryer: { modelNumber: 'RG18EN', capacity: '18kg', size: [700, 990, 820], doorOpenDepthMm: 1380, model3d: 'dryer' },
  washer: { modelNumber: 'FX24ENER', capacity: '24kg', size: [700, 990, 830], doorOpenDepthMm: 1410, model3d: 'washer' },
  fridge: { modelNumber: 'DL195ME', capacity: '195L', size: [525, 1295, 555], doorOpenDepthMm: null, model3d: 'fridge' },
  styler: { modelNumber: 'SC5GMR80S', capacity: '5벌 + 바지 1벌', size: [600, 1965, 620], doorOpenDepthMm: 1190, model3d: 'styler' },
}

test('공식 LG 네 모델은 검증된 규격과 확인되지 않은 가격을 보존한다', () => {
  for (const [id, expected] of Object.entries(expectedOfficial)) {
    const product = PRODUCT_BY_ID[id]
    assert.ok(product, `${id}가 registry에 있어야 한다`)
    assert.equal(product.modelNumber, expected.modelNumber)
    assert.equal(product.capacity, expected.capacity)
    assert.deepEqual([product.widthMm, product.heightMm, product.depthMm], expected.size)
    assert.equal(product.doorOpenDepthMm, expected.doorOpenDepthMm)
    assert.equal(product.model3d, expected.model3d)
    assert.equal(product.specVerified, true)
    assert.equal(product.purchasable, true)
    assert.equal(product.price, null)
    assert.equal(product.priceLabel, '가격 확인')
    assert.match(product.officialProductUrl, /^https:\/\/www\.lge\.co\.kr\/product\//)
    assert.match(product.imageSourceUrl, /^https:\/\/www\.lge\.co\.kr\/kr\/images\//)
  }
})

test('스타일러 도어 방향과 냉장고의 미확인 문 열림 깊이를 구분한다', () => {
  assert.equal(PRODUCT_BY_ID.styler.doorDirection, '우측 열림')
  assert.equal(PRODUCT_BY_ID.fridge.doorOpenDepthMm, null)
})

test('공식 카탈로그 이미지는 원격 hotlink 대신 실제 로컬 WebP를 사용한다', async () => {
  for (const id of Object.keys(expectedOfficial)) {
    const product = PRODUCT_BY_ID[id]
    assert.match(product.catalogImage, /^\/products\/[a-z0-9-]+\.webp$/)
    assert.equal(product.image, product.catalogImage)
    const localUrl = new URL(`../public${product.catalogImage}`, import.meta.url)
    const bytes = await readFile(fileURLToPath(localUrl))
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF')
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP')
    assert.ok(bytes.length > 3000)
  }
})

test('호환 alias와 meter 단위는 registry 값에서 파생된다', () => {
  const dryer = PRODUCT_BY_ID.dryer
  assert.equal(dryer.name, dryer.productName)
  assert.equal(dryer.model, dryer.modelNumber)
  assert.equal(dryer.officialUrl, dryer.officialProductUrl)
  assert.equal(dryer.priceNote, dryer.priceLabel)
  assert.equal(dryer.width, 0.7)
  assert.equal(dryer.height, 0.99)
  assert.equal(dryer.depth, 0.82)
  assert.deepEqual(DRYER, { width: 0.7, height: 0.99, depth: 0.82 })
})

test('기존 데모 가구는 비검증·비구매 제품으로 registry에 남는다', () => {
  for (const id of ['bed-product', 'sofa-product', 'desk-product']) {
    const product = PRODUCT_BY_ID[id]
    assert.equal(product.specVerified, false)
    assert.equal(product.purchasable, false)
    assert.equal(product.price, null)
    assert.ok(Number.isInteger(product.widthMm))
    assert.ok(Number.isInteger(product.heightMm))
    assert.ok(Number.isInteger(product.depthMm))
  }
  assert.equal(PRODUCT_REGISTRY.length, 7)
  assert.equal(PRODUCT_CATALOG.length, 7)
})
