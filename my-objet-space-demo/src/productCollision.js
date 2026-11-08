import { COLLISION_EPSILON, FURNITURE, PRODUCT_BY_ID, ROOM } from './layout.js'

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360
}

export function productAngle(instance) {
  return normalizeDegrees(instance.angleDegrees ?? (instance.rotation ?? 0) * 90)
}

export function productFootprint(productId, rotation) {
  const product = PRODUCT_BY_ID[productId]
  if (!product) throw new Error(`Unknown product: ${productId}`)
  const quarterTurns = ((rotation % 4) + 4) % 4
  const swapped = quarterTurns % 2 === 1
  return {
    width: swapped ? product.depth : product.width,
    depth: swapped ? product.width : product.depth,
  }
}

export function rectanglePolygon({ x, z, width, depth, angleDegrees = 0 }) {
  const angle = normalizeDegrees(angleDegrees) * Math.PI / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const halfWidth = width / 2
  const halfDepth = depth / 2

  return [
    { x: -halfWidth, z: -halfDepth },
    { x: halfWidth, z: -halfDepth },
    { x: halfWidth, z: halfDepth },
    { x: -halfWidth, z: halfDepth },
  ].map((point) => ({
    // Match THREE.Object3D rotation.y: positive angles rotate +X toward -Z.
    x: x + point.x * cos + point.z * sin,
    z: z - point.x * sin + point.z * cos,
  }))
}

export function productPolygon(instance) {
  const product = PRODUCT_BY_ID[instance.productId]
  if (!product) throw new Error(`Unknown product: ${instance.productId}`)
  return rectanglePolygon({
    ...instance.position,
    width: product.width,
    depth: product.depth,
    angleDegrees: productAngle(instance),
  })
}

function polygonAxes(polygon) {
  return polygon.map((point, index) => {
    const next = polygon[(index + 1) % polygon.length]
    const edgeX = next.x - point.x
    const edgeZ = next.z - point.z
    const length = Math.hypot(edgeX, edgeZ)
    return { x: -edgeZ / length, z: edgeX / length }
  })
}

function projectPolygon(polygon, axis) {
  const projections = polygon.map((point) => point.x * axis.x + point.z * axis.z)
  return { min: Math.min(...projections), max: Math.max(...projections) }
}

export function polygonsOverlap(first, second, epsilon = COLLISION_EPSILON) {
  return [...polygonAxes(first), ...polygonAxes(second)].every((axis) => {
    const firstProjection = projectPolygon(first, axis)
    const secondProjection = projectPolygon(second, axis)
    const overlap = Math.min(firstProjection.max, secondProjection.max)
      - Math.max(firstProjection.min, secondProjection.min)
    return overlap > epsilon
  })
}

function axisAlignedPolygon(item) {
  return rectanglePolygon({ ...item, angleDegrees: 0 })
}

function outsideRoom(polygon, room) {
  const halfWidth = room.width / 2
  const halfDepth = room.depth / 2
  return polygon.some((point) => (
    point.x < -halfWidth - COLLISION_EPSILON
    || point.x > halfWidth + COLLISION_EPSILON
    || point.z < -halfDepth - COLLISION_EPSILON
    || point.z > halfDepth + COLLISION_EPSILON
  ))
}

function overlapsLShapeNotch(polygon, room) {
  if (room.shape !== 'l') return false
  const notchWidth = room.width * 0.4
  const notchDepth = room.depth * 0.4
  const notch = rectanglePolygon({
    x: room.width / 2 - notchWidth / 2,
    z: -room.depth / 2 + notchDepth / 2,
    width: notchWidth,
    depth: notchDepth,
  })
  return polygonsOverlap(polygon, notch)
}

export function partitionPolygons(partition) {
  const startZ = Math.min(partition.startZ, partition.endZ)
  const endZ = Math.max(partition.startZ, partition.endZ)
  const gapWidth = Math.max(0, partition.gapWidth ?? 0)
  if (endZ - startZ <= COLLISION_EPSILON) return []

  const segments = gapWidth <= COLLISION_EPSILON
    ? [[startZ, endZ]]
    : [
        [startZ, Math.max(startZ, Math.min(endZ, partition.gapCenterZ - gapWidth / 2))],
        [Math.max(startZ, Math.min(endZ, partition.gapCenterZ + gapWidth / 2)), endZ],
      ]

  return segments
    .filter(([segmentStart, segmentEnd]) => segmentEnd - segmentStart > COLLISION_EPSILON)
    .map(([segmentStart, segmentEnd]) => rectanglePolygon({
      x: partition.x,
      z: (segmentStart + segmentEnd) / 2,
      width: 0.1,
      depth: segmentEnd - segmentStart,
    }))
}

function overlapsPartition(polygon, room) {
  return (room.partitions ?? []).some((partition) => (
    partitionPolygons(partition).some((segment) => polygonsOverlap(polygon, segment))
  ))
}

export function hasInteriorPartitionCollision(instance, room) {
  return overlapsPartition(productPolygon(instance), room)
}

function sameStack(first, second) {
  return Boolean(first.stackId) && first.stackId === second.stackId
}

function subjectMembers(instance, instances) {
  if (!instance.stackId) return [instance]
  const members = instances
    .filter((candidate) => candidate.stackId === instance.stackId)
    .map((candidate) => candidate.id === instance.id ? instance : candidate)
  return members.some((candidate) => candidate.id === instance.id)
    ? members
    : [instance, ...members]
}

export function getProductCollision(instance, instances, room) {
  const activeRoom = room ?? { ...ROOM, shape: 'rectangle' }
  const members = subjectMembers(instance, instances)
  const polygons = members.map(productPolygon)
  const wall = polygons.some((polygon) => outsideRoom(polygon, activeRoom)
    || overlapsLShapeNotch(polygon, activeRoom)
    || overlapsPartition(polygon, activeRoom))
  const includeFixedFurniture = room == null || room.showFurniture === true
  const fixedItem = includeFixedFurniture
    ? FURNITURE.find((item) => polygons.some((polygon) => polygonsOverlap(polygon, axisAlignedPolygon(item))))
    : null
  const other = instances.find((candidate) => (
    candidate.id !== instance.id
    && !sameStack(instance, candidate)
    && polygons.some((polygon) => polygonsOverlap(polygon, productPolygon(candidate)))
  ))

  return {
    colliding: wall || Boolean(fixedItem) || Boolean(other),
    type: wall ? 'wall' : fixedItem ? 'furniture' : other ? 'product' : null,
    label: wall ? '벽' : fixedItem?.label ?? (other ? PRODUCT_BY_ID[other.productId].shortName : null),
    otherId: other?.id ?? null,
  }
}

export function getSceneCollisions(instances, room) {
  return Object.fromEntries(
    instances.map((instance) => [instance.id, getProductCollision(instance, instances, room)]),
  )
}
