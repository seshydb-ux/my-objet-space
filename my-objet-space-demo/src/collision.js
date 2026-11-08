import { COLLISION_EPSILON, DRYER, FURNITURE, ROOM } from './layout.js'

export function dryerFootprint(rotation) {
  const quarterTurns = ((rotation % 4) + 4) % 4
  const swapped = quarterTurns % 2 === 1
  return {
    width: swapped ? DRYER.depth : DRYER.width,
    depth: swapped ? DRYER.width : DRYER.depth,
  }
}

export function toBounds({ x, z, width, depth }) {
  return {
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
  }
}

export function strictOverlap(a, b, epsilon = COLLISION_EPSILON) {
  const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX)
  const overlapZ = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ)
  return overlapX > epsilon && overlapZ > epsilon
}

export function getCollision(position, rotation) {
  const size = dryerFootprint(rotation)
  const dryerBounds = toBounds({ ...position, ...size })
  const halfWidth = ROOM.width / 2
  const halfDepth = ROOM.depth / 2

  const wall =
    dryerBounds.minX < -halfWidth - COLLISION_EPSILON ||
    dryerBounds.maxX > halfWidth + COLLISION_EPSILON ||
    dryerBounds.minZ < -halfDepth - COLLISION_EPSILON ||
    dryerBounds.maxZ > halfDepth + COLLISION_EPSILON

  const item = FURNITURE.find((furniture) =>
    strictOverlap(dryerBounds, toBounds(furniture)),
  )

  return {
    colliding: wall || Boolean(item),
    type: wall ? 'wall' : item ? 'furniture' : null,
    label: wall ? '벽' : item?.label ?? null,
  }
}
