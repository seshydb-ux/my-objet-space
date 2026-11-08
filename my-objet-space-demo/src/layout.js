export const ROOM = {
  width: 5.5,
  depth: 3.6,
  height: 2.65,
  area: 19.8,
}

import { PRODUCT_BY_ID, PRODUCT_CATALOG, PRODUCT_REGISTRY } from './products.js'

export { PRODUCT_BY_ID, PRODUCT_CATALOG, PRODUCT_REGISTRY }

export const DRYER = Object.freeze({
  width: PRODUCT_BY_ID.dryer.width,
  height: PRODUCT_BY_ID.dryer.height,
  depth: PRODUCT_BY_ID.dryer.depth,
})

export const INITIAL_DRYER = { x: 1.72, z: 0.32 }

export const INITIAL_PRODUCTS = [
  { id: 'dryer-initial', productId: 'dryer', position: INITIAL_DRYER, rotation: 0 },
]

export const FURNITURE = [
  {
    id: 'bed',
    label: '침대',
    x: -1.65,
    z: 0.84,
    width: 2.0,
    depth: 1.45,
    height: 0.43,
  },
  {
    id: 'wardrobe',
    label: '수납장',
    x: 2.12,
    z: -1.15,
    width: 0.88,
    depth: 1.02,
    height: 2.12,
  },
  {
    id: 'desk',
    label: '테이블',
    x: 0.8,
    z: -1.28,
    width: 1.35,
    depth: 0.58,
    height: 0.74,
  },
]

export const PRESENTATION_MARGIN = 1
export const COLLISION_EPSILON = 0.001
