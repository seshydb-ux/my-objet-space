import { PRODUCT_BY_ID } from './layout.js'
import { getProductCollision, hasInteriorPartitionCollision, partitionPolygons, polygonsOverlap, productPolygon } from './productCollision.js'

export const STACKABLE_PRODUCT_IDS = Object.freeze(['washer', 'dryer'])

function withoutStackMetadata(instance) {
  const { stackId, stackRole, ...rest } = instance
  return rest
}

function normalizedAngle(instance) {
  return ((instance.angleDegrees ?? (instance.rotation ?? 0) * 90) % 360 + 360) % 360
}

function uniqueId(items, prefix) {
  const ids = new Set(items.map((item) => item.id))
  let suffix = 1
  while (ids.has(`${prefix}-${suffix}`)) suffix += 1
  return `${prefix}-${suffix}`
}

function uniqueStackId(items) {
  const ids = new Set(items.map((item) => item.stackId).filter(Boolean))
  let suffix = 1
  while (ids.has(`washer-dryer-stack-${suffix}`)) suffix += 1
  return `washer-dryer-stack-${suffix}`
}

export function isStackableProduct(productId) {
  return STACKABLE_PRODUCT_IDS.includes(productId)
}

export function getStackMembers(items, instanceOrId) {
  const instance = typeof instanceOrId === 'string'
    ? items.find((item) => item.id === instanceOrId)
    : instanceOrId
  if (!instance?.stackId) return instance ? [instance] : []
  return items.filter((item) => item.stackId === instance.stackId)
}

export function stackWasherDryer(items, selectedId) {
  const selected = items.find((item) => item.id === selectedId)
  if (!selected || !isStackableProduct(selected.productId)) {
    return { products: items, stackId: null, createdId: null, selectedId }
  }
  if (selected.stackId) {
    return { products: items, stackId: selected.stackId, createdId: null, selectedId }
  }

  const partnerProductId = selected.productId === 'washer' ? 'dryer' : 'washer'
  const available = items
    .filter((item) => item.productId === partnerProductId && !item.stackId)
    .sort((first, second) => {
      const firstDistance = Math.hypot(first.position.x - selected.position.x, first.position.z - selected.position.z)
      const secondDistance = Math.hypot(second.position.x - selected.position.x, second.position.z - selected.position.z)
      return firstDistance - secondDistance
    })[0]
  const stackId = uniqueStackId(items)
  const createdId = available ? null : uniqueId(items, `${partnerProductId}-stack`)
  const partner = available ?? {
    id: createdId,
    productId: partnerProductId,
    position: { ...selected.position },
    rotation: 0,
    angleDegrees: normalizedAngle(selected),
  }
  const angleDegrees = normalizedAngle(selected)
  const position = { ...selected.position }
  const roleFor = (productId) => productId === 'washer' ? 'base' : 'top'
  const linked = (item) => ({
    ...item,
    position: { ...position },
    rotation: 0,
    angleDegrees,
    stackId,
    stackRole: roleFor(item.productId),
  })

  return {
    products: available
      ? items.map((item) => item.id === selected.id || item.id === available.id ? linked(item) : item)
      : [...items.map((item) => item.id === selected.id ? linked(item) : item), linked(partner)],
    stackId,
    createdId,
    selectedId: selected.id,
  }
}

export function moveStackGroup(items, instanceId, position) {
  const instance = items.find((item) => item.id === instanceId)
  if (!instance) return items
  const memberIds = new Set(getStackMembers(items, instance).map((item) => item.id))
  return items.map((item) => memberIds.has(item.id) ? { ...item, position: { ...position } } : item)
}

export function rotateStackGroup(items, instanceId, angleDegrees) {
  const instance = items.find((item) => item.id === instanceId)
  if (!instance) return items
  const memberIds = new Set(getStackMembers(items, instance).map((item) => item.id))
  const normalized = ((angleDegrees % 360) + 360) % 360
  return items.map((item) => memberIds.has(item.id) ? { ...item, rotation: 0, angleDegrees: normalized } : item)
}

export function deleteStackGroup(items, instanceId) {
  const instance = items.find((item) => item.id === instanceId)
  if (!instance) return items
  const memberIds = new Set(getStackMembers(items, instance).map((item) => item.id))
  return items.filter((item) => !memberIds.has(item.id))
}

// A different room can introduce a partition through an existing object.
// Keep every unaffected placement and move only groups intersecting the new wall.
export function relocateGroupsFromInteriorWalls(items, room) {
  if (!room?.partitions?.length) return { products: items, movedIds: [], success: true }
  let result = items
  const movedIds = []
  const visited = new Set()
  const fractions = [0, -0.12, 0.12, -0.24, 0.24, -0.36, 0.36, -0.42, 0.42]
  for (const original of items) {
    const member = result.find((item) => item.id === original.id)
    const groupKey = member.stackId ?? member.id
    if (visited.has(groupKey)) continue
    visited.add(groupKey)
    if (!getStackMembers(result, member).some((item) => hasInteriorPartitionCollision(item, room))) continue
    let collisionFallback = null
    let destination = null
    const offset = Math.max(PRODUCT_BY_ID[member.productId].width, PRODUCT_BY_ID[member.productId].depth) + 0.15
    const candidates = [
      { x: member.position.x - offset, z: member.position.z },
      { x: member.position.x + offset, z: member.position.z },
    ]
    for (const z of fractions) for (const x of fractions) candidates.push({ x: room.width * x, z: room.depth * z })
    for (const position of candidates) {
      const proposed = moveStackGroup(result, member.id, position)
      const movedMembers = getStackMembers(proposed, member.id)
      const collisions = movedMembers.map((item) => getProductCollision(item, proposed, room))
      if (collisions.some((collision) => collision.type === 'wall')) continue
      collisionFallback ??= proposed
      if (collisions.every((collision) => !collision.colliding)) { destination = proposed; break }
    }
    if (!destination && !collisionFallback) return { products: items, movedIds: [], success: false }
    result = destination ?? collisionFallback
    movedIds.push(...getStackMembers(result, member.id).map((item) => item.id))
  }
  return { products: result, movedIds, success: true }
}

function releaseCandidates(base, released) {
  const baseProduct = PRODUCT_BY_ID[base.productId]
  const releasedProduct = PRODUCT_BY_ID[released.productId]
  const spacing = Math.max(baseProduct.width, baseProduct.depth, releasedProduct.width, releasedProduct.depth) + 0.18
  const angle = normalizedAngle(base) * Math.PI / 180
  const directions = [
    [spacing, 0], [-spacing, 0], [0, spacing], [0, -spacing],
    [spacing, spacing], [-spacing, spacing], [spacing, -spacing], [-spacing, -spacing],
  ]
  return directions.map(([localX, localZ]) => ({
    x: base.position.x + localX * Math.cos(angle) + localZ * Math.sin(angle),
    z: base.position.z - localX * Math.sin(angle) + localZ * Math.cos(angle),
  }))
}

export function unstackWasherDryer(items, instanceId, room) {
  const selected = items.find((item) => item.id === instanceId)
  const members = getStackMembers(items, selected)
  if (!selected?.stackId || members.length < 2) return { products: items, releasedId: null }
  const base = members.find((item) => item.stackRole === 'base') ?? members[0]
  const released = members.find((item) => item.id !== base.id)
  const memberIds = new Set(members.map((item) => item.id))
  const outside = items.filter((item) => !memberIds.has(item.id))
  const cleanBase = withoutStackMetadata(base)
  let cleanReleased = withoutStackMetadata(released)

  const position = releaseCandidates(cleanBase, cleanReleased).find((candidatePosition) => {
    const candidate = { ...cleanReleased, position: candidatePosition }
    const separated = [...outside, cleanBase, cleanReleased]
    return canMoveGroupWithoutCrossingPartitions(separated, cleanReleased.id, candidatePosition, room)
      && !getProductCollision(candidate, [...outside, cleanBase, candidate], room).colliding
  })
  if (!position) return { products: items, releasedId: null, reason: 'no-space' }
  cleanReleased = { ...cleanReleased, position }

  return {
    products: items.map((item) => item.id === cleanBase.id
      ? cleanBase
      : item.id === cleanReleased.id ? cleanReleased : item),
    releasedId: cleanReleased.id,
    reason: null,
  }
}

export function getStackDimensions(items, instanceOrId) {
  const members = getStackMembers(items, instanceOrId)
  if (members.length < 2) return null
  const products = members.map((item) => PRODUCT_BY_ID[item.productId]).filter(Boolean)
  return {
    widthMm: Math.max(...products.map((product) => product.widthMm)),
    bodyHeightMm: products.reduce((sum, product) => sum + product.heightMm, 0),
    depthMm: Math.max(...products.map((product) => product.depthMm)),
    isInstallationSize: false,
  }
}

export function canPlaceWithoutAnyWallCollision(instance, items, room) {
  return getProductCollision(instance, items, room).type !== 'wall'
}

function transformedMembers(items, instanceId, update) {
  const instance = items.find((item) => item.id === instanceId)
  if (!instance) return []
  return getStackMembers(items, instance).map((member) => update(member))
}

function collidingPartitions(members, room) {
  return (room?.partitions ?? []).filter((partition) => {
    const walls = partitionPolygons(partition)
    return members.some((member) => {
      const footprint = productPolygon(member)
      return walls.some((wall) => polygonsOverlap(footprint, wall))
    })
  })
}

export function canMoveGroupWithoutCrossingPartitions(items, instanceId, nextPosition, room) {
  const instance = items.find((item) => item.id === instanceId)
  if (!instance || !(room?.partitions?.length > 0)) return true
  const distance = Math.hypot(nextPosition.x - instance.position.x, nextPosition.z - instance.position.z)
  const steps = Math.max(1, Math.ceil(distance / 0.02))
  const startingMembers = transformedMembers(items, instanceId, (member) => member)
  const startingPartitions = collidingPartitions(startingMembers, room)
  const startingPartitionSet = new Set(startingPartitions)
  const startsInside = startingPartitions.length > 0
  let escapedStartingWall = !startsInside
  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps
    const position = {
      x: instance.position.x + (nextPosition.x - instance.position.x) * progress,
      z: instance.position.z + (nextPosition.z - instance.position.z) * progress,
    }
    const members = transformedMembers(items, instanceId, (member) => ({ ...member, position }))
    const collisions = collidingPartitions(members, room)
    if (!escapedStartingWall && collisions.length === 0) {
      escapedStartingWall = true
      continue
    }
    if (escapedStartingWall && collisions.length > 0) return false
    if (!escapedStartingWall) {
      if (collisions.some((partition) => !startingPartitionSet.has(partition))) return false
      const movingDeeper = collisions.some((partition) => (
        Math.abs(position.x - partition.x) + 1e-9
          < Math.abs(instance.position.x - partition.x)
      ))
      if (movingDeeper) return false
    }
  }
  // Room changes can leave a product inside a new partition. Permit ordinary
  // small pointer steps that do not move deeper, so the user can recover it.
  return true
}

export function canRotateGroupWithoutCrossingPartitions(items, instanceId, nextAngleDegrees, room) {
  const instance = items.find((item) => item.id === instanceId)
  if (!instance || !(room?.partitions?.length > 0)) return true
  const start = normalizedAngle(instance)
  const target = ((nextAngleDegrees % 360) + 360) % 360
  const delta = ((target - start + 540) % 360) - 180
  const steps = Math.max(1, Math.ceil(Math.abs(delta) / 2))
  for (let step = 0; step <= steps; step += 1) {
    const angleDegrees = start + delta * (step / steps)
    const members = transformedMembers(items, instanceId, (member) => ({ ...member, angleDegrees }))
    if (members.some((member) => hasInteriorPartitionCollision(member, room))) return false
  }
  return true
}
