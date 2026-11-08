import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { FURNITURE } from './layout.js'
import { DEFAULT_ROOM, openingPlacement, outerWallSegments, roomFloorPoints } from './roomGeometry.js'
import ScanRoomDecor from './ScanRoomDecor.jsx'

const WALL_THICKNESS = 0.1
const WALL_OUTSET = WALL_THICKNESS / 2

function Bed({ item }) {
  return <group position={[item.x, 0, item.z]}>
    <RoundedBox args={[item.width, 0.27, item.depth]} radius={0.06} position={[0, 0.21, 0]} castShadow receiveShadow><meshStandardMaterial color="#e9e0d4" roughness={0.9} /></RoundedBox>
    <RoundedBox args={[item.width * 0.92, 0.12, item.depth * 0.88]} radius={0.04} position={[0, 0.405, -0.02]} castShadow><meshStandardMaterial color="#faf8f2" roughness={0.95} /></RoundedBox>
    <RoundedBox args={[0.62, 0.12, 0.37]} radius={0.06} position={[-0.55, 0.51, 0.42]} castShadow><meshStandardMaterial color="#d6c5b5" roughness={0.9} /></RoundedBox>
    <RoundedBox args={[0.62, 0.12, 0.37]} radius={0.06} position={[0.19, 0.51, 0.42]} castShadow><meshStandardMaterial color="#f1ece4" roughness={0.9} /></RoundedBox>
  </group>
}

function Wardrobe({ item }) {
  return <group position={[item.x, 0, item.z]}>
    <RoundedBox args={[item.width, item.height, item.depth]} radius={0.035} position={[0, item.height / 2, 0]} castShadow receiveShadow><meshStandardMaterial color="#d6c0a4" roughness={0.78} /></RoundedBox>
    <mesh position={[0, item.height * 0.54, -item.depth / 2 - 0.003]}><boxGeometry args={[0.012, item.height * 0.78, 0.012]} /><meshStandardMaterial color="#b59b7d" /></mesh>
    {[-0.08, 0.08].map((x) => <mesh key={x} position={[x, item.height * 0.54, -item.depth / 2 - 0.018]}><boxGeometry args={[0.018, 0.16, 0.025]} /><meshStandardMaterial color="#9d856c" metalness={0.3} roughness={0.45} /></mesh>)}
  </group>
}

function Desk({ item }) {
  const legs = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
  return <group position={[item.x, 0, item.z]}>
    <RoundedBox args={[item.width, 0.09, item.depth]} radius={0.025} position={[0, item.height, 0]} castShadow><meshStandardMaterial color="#b8875e" roughness={0.65} /></RoundedBox>
    {legs.map(([x, z]) => <mesh key={`${x}-${z}`} position={[x * (item.width / 2 - 0.08), item.height / 2, z * (item.depth / 2 - 0.07)]} castShadow><boxGeometry args={[0.055, item.height, 0.055]} /><meshStandardMaterial color="#8f694b" roughness={0.7} /></mesh>)}
    <mesh position={[0.28, item.height + 0.09, 0]} castShadow><cylinderGeometry args={[0.09, 0.075, 0.13, 32]} /><meshStandardMaterial color="#d9d4c8" roughness={0.8} /></mesh>
  </group>
}

function Floor({ room }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    roomFloorPoints(room).forEach(([x, z], index) => index === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z))
    shape.closePath()
    return new THREE.ShapeGeometry(shape)
  }, [room])
  return <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><meshStandardMaterial color="#d7bea0" roughness={0.88} side={THREE.DoubleSide} /></mesh>
}

function WallPanel({ width, height, position, rotation = [0, 0, 0], color = '#f2eee7', opacity = 1, cutawayTest, cutawayOpacity = 0.14 }) {
  const material = useRef()
  useFrame(({ camera }, delta) => {
    if (!material.current || !cutawayTest) return
    const target = cutawayTest(camera) ? cutawayOpacity : 1
    material.current.opacity = THREE.MathUtils.damp(material.current.opacity, target, 10, delta)
    const shouldWriteDepth = target > 0.5
    if (material.current.depthWrite !== shouldWriteDepth) {
      material.current.depthWrite = shouldWriteDepth
      material.current.needsUpdate = true
    }
  })
  if (width <= 0.02) return null
  return <mesh position={position} rotation={rotation} receiveShadow><boxGeometry args={[width, height, WALL_THICKNESS]} /><meshStandardMaterial ref={material} color={color} roughness={0.92} transparent={Boolean(cutawayTest) || opacity < 1} opacity={opacity} depthWrite={opacity > 0.5} /></mesh>
}

function openingBox(room, type, opening = room[type]) {
  const placement = openingPlacement(room, opening)
  if (!placement.segment) return null
  if (type === 'door') return { center: placement.absolute, width: 0.92, bottom: 0, top: Math.min(2.04, room.height - 0.08) }
  const bottom = Math.min(Math.max(room.height * 0.43, 0.78), room.height - 0.78)
  return { center: placement.absolute, width: 1.25, bottom, top: Math.min(bottom + 0.9, room.height - 0.12) }
}

function wallCells(segment, room) {
  const openingSpecs = [
    { type: 'door', opening: room.door },
    { type: 'window', opening: room.window },
    ...(room.windows ?? []).map((opening) => ({ type: 'window', opening })),
  ]
  const openings = openingSpecs
    .filter(({ opening }) => opening?.wall === segment.wall)
    .map(({ type, opening }) => openingBox(room, type, opening))
    .filter(Boolean)
  const along = [segment.start, segment.end]
  const vertical = [0, room.height]
  openings.forEach((opening) => {
    along.push(Math.max(segment.start, opening.center - opening.width / 2), Math.min(segment.end, opening.center + opening.width / 2))
    vertical.push(opening.bottom, opening.top)
  })
  const unique = (values) => [...new Set(values.map((value) => Math.round(value * 10000) / 10000))].sort((a, b) => a - b)
  const xs = unique(along)
  const ys = unique(vertical)
  const cells = []
  for (let xi = 0; xi < xs.length - 1; xi++) for (let yi = 0; yi < ys.length - 1; yi++) {
    const midX = (xs[xi] + xs[xi + 1]) / 2
    const midY = (ys[yi] + ys[yi + 1]) / 2
    const insideOpening = openings.some((opening) => midX > opening.center - opening.width / 2 && midX < opening.center + opening.width / 2 && midY > opening.bottom && midY < opening.top)
    if (!insideOpening) cells.push({ start: xs[xi], end: xs[xi + 1], bottom: ys[yi], top: ys[yi + 1] })
  }
  return cells
}

function OuterWalls({ room }) {
  const outwardOffset = (segment) => {
    if (segment.key === 'front') return [0, 0, WALL_OUTSET]
    if (segment.key === 'back') return [0, 0, -WALL_OUTSET]
    if (segment.key === 'left') return [-WALL_OUTSET, 0, 0]
    if (segment.key === 'right') return [WALL_OUTSET, 0, 0]
    if (segment.key === 'notch-side') return [WALL_OUTSET, 0, 0]
    if (segment.key === 'notch-front') return [0, 0, -WALL_OUTSET]
    return [0, 0, 0]
  }
  const cutawayTest = (segment) => (camera) => {
    const horizontalDistance = Math.hypot(camera.position.x, camera.position.z)
    if (camera.position.y > Math.max(horizontalDistance * 1.8, room.height * 2.2)) return true
    if (segment.key === 'front') return camera.position.z > segment.fixed
    if (segment.key === 'back') return camera.position.z < segment.fixed
    if (segment.key === 'left') return camera.position.x < segment.fixed
    if (segment.key === 'right') return camera.position.x > segment.fixed
    if (segment.key === 'notch-side') return camera.position.x > segment.fixed
    if (segment.key === 'notch-front') return camera.position.z < segment.fixed
    return false
  }
  return <>{outerWallSegments(room).flatMap((segment) => wallCells(segment, room).map((cell, index) => {
    const center = (cell.start + cell.end) / 2
    const y = (cell.bottom + cell.top) / 2
    const basePosition = segment.axis === 'x' ? [center, y, segment.fixed] : [segment.fixed, y, center]
    const offset = outwardOffset(segment)
    const position = basePosition.map((value, axis) => value + offset[axis])
    const color = room.source === 'scan-demo' || room.layout === 'two-room'
      ? (segment.wall === 'left' ? '#e9e1d5' : '#ded2c2')
      : (segment.wall === 'left' ? '#f7f4ee' : '#f2eee7')
    return <WallPanel key={`${segment.key}-${index}`} width={cell.end - cell.start} height={cell.top - cell.bottom} position={position} rotation={segment.axis === 'x' ? [0, 0, 0] : [0, Math.PI / 2, 0]} color={color} cutawayTest={cutawayTest(segment)} />
  }))}</>
}

function PartitionDoor({ partition, height }) {
  if (!partition.gapWidth || !partition.hasDoor) return null
  const doorHeight = Math.min(2.04, height - 0.08)
  const gapStart = partition.gapCenterZ - partition.gapWidth / 2
  const frameColor = '#aa9277'
  return <group>
    <WallPanel width={partition.gapWidth} height={height - doorHeight} position={[partition.x, doorHeight + (height - doorHeight) / 2, partition.gapCenterZ]} rotation={[0, Math.PI / 2, 0]} color="#e2d8ca" />
    {[-1, 1].map((side) => <mesh key={side} position={[partition.x + 0.012, doorHeight / 2, partition.gapCenterZ + side * partition.gapWidth / 2]} castShadow>
      <boxGeometry args={[0.075, doorHeight, 0.055]} /><meshStandardMaterial color={frameColor} roughness={0.8} />
    </mesh>)}
    <mesh position={[partition.x + 0.012, doorHeight, partition.gapCenterZ]} castShadow><boxGeometry args={[0.075, 0.07, partition.gapWidth + 0.07]} /><meshStandardMaterial color={frameColor} roughness={0.8} /></mesh>
    <group position={[partition.x, 0, gapStart + 0.04]} rotation={[0, -Math.PI / 2.25, 0]}>
      <mesh position={[0, doorHeight / 2, partition.gapWidth * 0.43]} castShadow><boxGeometry args={[0.045, doorHeight - 0.06, partition.gapWidth * 0.86]} /><meshStandardMaterial color="#d0b89a" roughness={0.86} /></mesh>
      <mesh position={[0.04, doorHeight * 0.52, partition.gapWidth * 0.72]}><sphereGeometry args={[0.028, 14, 14]} /><meshStandardMaterial color="#78634d" metalness={0.4} roughness={0.42} /></mesh>
    </group>
  </group>
}

function PartitionWall({ partition, height, room }) {
  const length = partition.endZ - partition.startZ
  if (length <= 0) return null
  const cutawayTest = room.source === 'scan-demo' || room.layout === 'two-room' ? (camera) => camera.position.x > partition.x : undefined
  if (!partition.gapWidth) return <WallPanel width={length} height={height} position={[partition.x, height / 2, (partition.startZ + partition.endZ) / 2]} rotation={[0, Math.PI / 2, 0]} color="#eee9e1" cutawayTest={cutawayTest} cutawayOpacity={0.46} />
  const gapStart = Math.max(partition.startZ, partition.gapCenterZ - partition.gapWidth / 2)
  const gapEnd = Math.min(partition.endZ, partition.gapCenterZ + partition.gapWidth / 2)
  const first = gapStart - partition.startZ
  const second = partition.endZ - gapEnd
  return <>
    <WallPanel width={first} height={height} position={[partition.x, height / 2, partition.startZ + first / 2]} rotation={[0, Math.PI / 2, 0]} color="#eee9e1" cutawayTest={cutawayTest} cutawayOpacity={0.46} />
    <WallPanel width={second} height={height} position={[partition.x, height / 2, gapEnd + second / 2]} rotation={[0, Math.PI / 2, 0]} color="#eee9e1" cutawayTest={cutawayTest} cutawayOpacity={0.46} />
    <PartitionDoor partition={partition} height={height} />
  </>
}

function openingTransform(room, opening) {
  const horizontal = opening.wall === 'front' || opening.wall === 'back'
  const placement = openingPlacement(room, opening)
  return {
    position: [horizontal ? placement.absolute : opening.wall === 'left' ? -room.width / 2 : room.width / 2, 0, horizontal ? opening.wall === 'back' ? -room.depth / 2 : room.depth / 2 : placement.absolute],
    rotation: horizontal ? [0, 0, 0] : [0, Math.PI / 2, 0],
    facing: opening.wall === 'front' || opening.wall === 'right' ? -1 : 1,
  }
}

function Door({ room }) {
  const group = useRef()
  const { position, rotation, facing } = openingTransform(room, room.door)
  const height = Math.min(2.04, room.height - 0.08)
  const wallCenter = -facing * WALL_OUTSET
  useFrame(({ camera }) => {
    if (!group.current) return
    if (room.source !== 'scan-demo' && room.layout !== 'two-room') {
      group.current.visible = true
      return
    }
    const horizontalDistance = Math.hypot(camera.position.x, camera.position.z)
    const top = camera.position.y > Math.max(horizontalDistance * 1.8, room.height * 2.2)
    const wall = room.door.wall
    const outside = wall === 'back' ? camera.position.z < -room.depth / 2
      : wall === 'front' ? camera.position.z > room.depth / 2
        : wall === 'left' ? camera.position.x < -room.width / 2 : camera.position.x > room.width / 2
    group.current.visible = !top && !outside
  })
  return <group ref={group} position={position} rotation={rotation}><mesh position={[0, height / 2, wallCenter]}><boxGeometry args={[0.88, height, 0.055]} /><meshStandardMaterial color="#cbb393" roughness={0.82} /></mesh><mesh position={[0.3, height * 0.52, wallCenter + facing * 0.055]}><sphereGeometry args={[0.035, 18, 18]} /><meshStandardMaterial color="#7e6a54" metalness={0.45} /></mesh></group>
}

function Window({ room, opening = room.window }) {
  const { position, rotation, facing } = openingTransform(room, opening)
  const box = openingBox(room, 'window', opening)
  const height = box.top - box.bottom
  const wallCenter = -facing * WALL_OUTSET
  return <group position={[position[0], box.bottom + height / 2, position[2]]} rotation={rotation}>
    <mesh position={[0, 0, wallCenter]}><planeGeometry args={[1.1, height - 0.14]} /><meshPhysicalMaterial color="#c9d9d9" transparent opacity={0.52} roughness={0.24} transmission={0.12} side={THREE.DoubleSide} /></mesh>
    {[-1, 1].map((side) => <mesh key={`v-${side}`} position={[side * 0.59, 0, wallCenter]}><boxGeometry args={[0.055, height, 0.05]} /><meshStandardMaterial color="#aa967e" /></mesh>)}
    {[-1, 1].map((side) => <mesh key={`h-${side}`} position={[0, side * (height / 2 - 0.025), wallCenter]}><boxGeometry args={[1.23, 0.055, 0.05]} /><meshStandardMaterial color="#aa967e" /></mesh>)}
    <mesh position={[0, 0, wallCenter + facing * 0.001]}><boxGeometry args={[0.025, height - 0.1, 0.02]} /><meshStandardMaterial color="#aa967e" /></mesh>
  </group>
}

function RoomShell({ room }) {
  const original = room.showFurniture && room.width === DEFAULT_ROOM.width && room.depth === DEFAULT_ROOM.depth
  return <group>
    <Floor room={room} /><OuterWalls room={room} />{(room.partitions ?? []).map((partition, index) => <PartitionWall key={`${partition.x}-${index}`} partition={partition} height={room.height} room={room} />)}<Door room={room} /><Window room={room} />{(room.windows ?? []).map((opening, index) => <Window key={`${opening.wall}-${opening.offset}-${index}`} room={room} opening={opening} />)}
    {original && <mesh position={[0.35, 0.007, -0.15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2.05, 1.18]} /><meshStandardMaterial color="#ede6da" roughness={1} /></mesh>}
    {original && <group position={[0.45, 1.72, -room.depth / 2 + 0.08]}><mesh><circleGeometry args={[0.34, 48]} /><meshStandardMaterial color="#d8c7ad" /></mesh><mesh position={[0, 0, -0.008]}><circleGeometry args={[0.29, 48]} /><meshStandardMaterial color="#f8f5ef" /></mesh></group>}
  </group>
}

export default function Room({ room = DEFAULT_ROOM }) {
  return <group><RoomShell room={room} />{(room.source === 'scan-demo' || room.layout === 'two-room') && <ScanRoomDecor room={room} />}{room.showFurniture && FURNITURE.map((item) => item.id === 'bed' ? <Bed key={item.id} item={item} /> : item.id === 'wardrobe' ? <Wardrobe key={item.id} item={item} /> : <Desk key={item.id} item={item} />)}</group>
}
