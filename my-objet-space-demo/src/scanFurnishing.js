import { PRODUCT_BY_ID } from './layout.js'
import { getProductCollision, polygonsOverlap, productPolygon, rectanglePolygon } from './productCollision.js'
import { openingPlacement } from './roomGeometry.js'

// These are editable demonstration objects, not objects detected by a camera.
// Preferred positions compose the default two-room scan, while the fallback
// search keeps edited room dimensions usable.
const FURNISHINGS = [
  { productId: 'dryer', id: 'scan-dryer-initial', angle: 0, zone: 'living', position: (room) => room.zones?.appliance ?? ({ x: room.width * 0.36, z: -room.depth * 0.34 }) },
  { productId: 'kitchen-counter-product', id: 'scan-kitchen-initial', angle: 0, zone: 'living', position: (room, product) => room.shape === 'l'
    ? ({ x: room.width * 0.24, z: -room.depth * 0.1 + product.depth / 2 + 0.08 })
    : ({ x: room.width * 0.09, z: -room.depth / 2 + product.depth / 2 + 0.12 }) },
  { productId: 'bed-product', id: 'scan-bed-initial', angle: 0, zone: 'bedroom', position: (room, product) => ({ x: -room.width / 2 + product.width / 2 + 0.18, z: -room.depth / 2 + product.depth / 2 + 0.18 }) },
  { productId: 'sofa-product', id: 'scan-sofa-initial', angle: 180, zone: 'living', position: (room) => ({ x: room.width * 0.2, z: room.depth * 0.08 }) },
  { productId: 'coffee-table-product', id: 'scan-table-initial', angle: 0, zone: 'living', position: (room) => ({ x: room.width * 0.2, z: room.depth * 0.27 }) },
  { productId: 'desk-product', id: 'scan-desk-initial', angle: 0, zone: 'living', position: (room) => ({ x: room.width * 0.1, z: -room.depth * 0.36 }) },
]

function doorArea(room) {
  const placement = openingPlacement(room, room.door)
  if (!placement.segment || !Number.isFinite(placement.absolute)) return null
  const horizontal = room.door.wall === 'front' || room.door.wall === 'back'
  const edge = horizontal ? room.depth / 2 : room.width / 2
  const sign = room.door.wall === 'front' || room.door.wall === 'right' ? 1 : -1
  const center = sign * (edge - 0.32)
  return rectanglePolygon(horizontal
    ? { x: placement.absolute, z: center, width: 1.02, depth: 0.64 }
    : { x: center, z: placement.absolute, width: 0.64, depth: 1.02 })
}

function partitionDoorAreas(room) {
  return (room.partitions ?? [])
    .filter((partition) => partition.gapWidth > 0)
    .map((partition) => rectanglePolygon({
      x: partition.x,
      z: partition.gapCenterZ,
      width: 1.05,
      depth: partition.gapWidth + 0.38,
    }))
}

function primaryPartition(room) {
  return (room.partitions ?? []).find((partition) => (
    partition.startZ <= -room.depth / 2 + 0.02
    && partition.endZ >= room.depth / 2 - 0.02
  ))
}

function inRequestedZone(candidate, furnishing, room) {
  const partition = primaryPartition(room)
  if (!partition) return true
  const xs = productPolygon(candidate).map((point) => point.x)
  if (furnishing.zone === 'bedroom') return Math.max(...xs) < partition.x - 0.06
  if (furnishing.zone === 'living') return Math.min(...xs) > partition.x + 0.06
  return true
}

function searchFractions(furnishing, room) {
  const partition = primaryPartition(room)
  if (!partition) return [-0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4]
  const boundary = partition.x / room.width
  if (furnishing.zone === 'bedroom') return [-0.42, -0.34, -0.26, Math.min(-0.18, boundary - 0.12)]
  return [Math.max(0, boundary + 0.12), 0.12, 0.23, 0.34, 0.42]
}

function findPlacement(room, existing, furnishing, reservedAreas) {
  const product = PRODUCT_BY_ID[furnishing.productId]
  const preferred = furnishing.position(room, product)
  const candidates = [{ position: preferred, angle: furnishing.angle }]
  // The preferred composition may not fit edited room sizes.
  // Try a bounded grid and skip any object that cannot be placed safely.
  const xFractions = searchFractions(furnishing, room)
  const zFractions = [-0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4]
  for (const angle of [furnishing.angle, (furnishing.angle + 90) % 360]) {
    for (const z of zFractions) for (const x of xFractions) {
      candidates.push({ position: { x: room.width * x, z: room.depth * z }, angle })
    }
  }
  for (const { position, angle } of candidates) {
    const candidate = { id: furnishing.id, productId: furnishing.productId, position, rotation: 0, angleDegrees: angle }
    if (getProductCollision(candidate, existing, room).colliding) continue
    if (!inRequestedZone(candidate, furnishing, room)) continue
    if (reservedAreas.some((area) => polygonsOverlap(productPolygon(candidate), area))) continue
    return candidate
  }
  return null
}

export function furnishScannedRoom(room, existing = []) {
  const result = [...existing]
  const reservedAreas = [doorArea(room), ...partitionDoorAreas(room)].filter(Boolean)
  for (const furnishing of FURNISHINGS) {
    if (result.some((item) => item.productId === furnishing.productId || item.id === furnishing.id)) continue
    const placement = findPlacement(room, result, furnishing, reservedAreas)
    if (placement) result.push(placement)
  }
  return result
}
