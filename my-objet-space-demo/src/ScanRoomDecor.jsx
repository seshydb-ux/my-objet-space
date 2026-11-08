import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { openingPlacement, roomFloorPoints } from './roomGeometry.js'

const ignorePointer = () => null

function makeWoodTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext('2d')
  const shades = ['#c1a183', '#c8aa8d', '#bd9b7d', '#cfb394', '#c5a484', '#b9997c', '#cbb092', '#c2a084']
  shades.forEach((color, row) => {
    const y = row * 64
    context.fillStyle = color
    context.fillRect(0, y, 512, 64)
    context.fillStyle = 'rgba(78, 53, 33, .17)'
    context.fillRect(0, y, 512, 2)
    const joint = row % 2 ? 172 : 390
    context.fillRect(joint, y, 2, 64)
    for (let line = 0; line < 6; line++) {
      const lineY = y + 8 + ((row * 13 + line * 9) % 49)
      context.fillStyle = line % 2 ? 'rgba(255, 246, 224, .10)' : 'rgba(91, 62, 41, .075)'
      context.fillRect(0, lineY, 512, 1)
    }
  })
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 4
  return texture
}

function WoodFloor({ room }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    roomFloorPoints(room).forEach(([x, z], index) => index === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z))
    shape.closePath()
    const result = new THREE.ShapeGeometry(shape)
    const positions = result.attributes.position
    const uv = result.attributes.uv
    for (let index = 0; index < positions.count; index++) {
      uv.setXY(index, positions.getX(index) / 1.6, positions.getY(index) / 1.6)
    }
    uv.needsUpdate = true
    return result
  }, [room])
  const texture = useMemo(makeWoodTexture, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} receiveShadow raycast={ignorePointer}>
    <meshStandardMaterial map={texture} roughness={0.94} side={THREE.DoubleSide} />
  </mesh>
}

function Rug({ room }) {
  const width = Math.min(1.7, room.width * 0.55)
  const depth = Math.min(1.6, room.depth * 0.37)
  return <group position={[room.width * 0.08, 0.006, room.depth * 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
    <mesh receiveShadow raycast={ignorePointer}><planeGeometry args={[width, depth]} /><meshStandardMaterial color="#c0b5a7" roughness={1} /></mesh>
    <mesh position={[0, 0, 0.001]} raycast={ignorePointer}><planeGeometry args={[width - 0.07, depth - 0.07]} /><meshStandardMaterial color="#d6cdc1" roughness={1} /></mesh>
  </group>
}

function Curtains({ room, opening = room.window }) {
  const group = useRef()
  const placement = openingPlacement(room, opening)
  const wall = opening.wall
  const horizontal = wall === 'front' || wall === 'back'
  const facing = wall === 'front' || wall === 'right' ? -1 : 1
  const position = horizontal
    ? [placement.absolute, 0, wall === 'back' ? -room.depth / 2 : room.depth / 2]
    : [wall === 'left' ? -room.width / 2 : room.width / 2, 0, placement.absolute]
  const height = room.height - 0.28
  useFrame(({ camera }) => {
    if (!group.current) return
    const horizontalDistance = Math.hypot(camera.position.x, camera.position.z)
    const top = camera.position.y > Math.max(horizontalDistance * 1.8, room.height * 2.2)
    const outside = wall === 'back' ? camera.position.z < -room.depth / 2
      : wall === 'front' ? camera.position.z > room.depth / 2
        : wall === 'left' ? camera.position.x < -room.width / 2 : camera.position.x > room.width / 2
    group.current.visible = !top && !outside
  })
  if (!placement.segment) return null
  return <group ref={group} position={position} rotation={horizontal ? [0, 0, 0] : [0, Math.PI / 2, 0]}>
    <mesh position={[0, height + 0.13, facing * 0.06]} rotation={[0, 0, Math.PI / 2]} raycast={ignorePointer}>
      <cylinderGeometry args={[0.018, 0.018, 1.82, 12]} /><meshStandardMaterial color="#9f8b75" metalness={0.25} roughness={0.7} />
    </mesh>
    {[-1, 1].map((side) => <group key={side} position={[side * 0.73, height / 2 + 0.08, facing * 0.065]}>
      <mesh raycast={ignorePointer}><boxGeometry args={[0.23, height, 0.04]} /><meshStandardMaterial color="#c7b29b" roughness={1} /></mesh>
      {[-1, 0, 1].map((pleat) => <mesh key={pleat} position={[pleat * 0.065, 0, facing * 0.023]} raycast={ignorePointer}>
        <boxGeometry args={[0.012, height, 0.01]} /><meshStandardMaterial color="#b8a28c" roughness={1} />
      </mesh>)}
    </group>)}
  </group>
}

function WallArt({ room }) {
  const group = useRef()
  const onLeft = room.window.wall !== 'left'
  useFrame(({ camera }) => {
    if (!group.current) return
    const horizontalDistance = Math.hypot(camera.position.x, camera.position.z)
    const top = camera.position.y > Math.max(horizontalDistance * 1.8, room.height * 2.2)
    group.current.visible = !top && (onLeft ? camera.position.x >= -room.width / 2 : camera.position.z >= -room.depth / 2)
  })
  const position = onLeft
    ? [-room.width / 2 + 0.008, Math.min(room.height * 0.7, 1.7), -room.depth * 0.07]
    : [-room.width * 0.2, Math.min(room.height * 0.7, 1.7), -room.depth / 2 + 0.008]
  return <group ref={group} position={position} rotation={onLeft ? [0, Math.PI / 2, 0] : [0, 0, 0]}>
    <mesh raycast={ignorePointer}><boxGeometry args={[0.56, 0.7, 0.025]} /><meshStandardMaterial color="#ae9478" roughness={0.9} /></mesh>
    <mesh position={[0, 0, 0.015]} raycast={ignorePointer}><planeGeometry args={[0.49, 0.63]} /><meshStandardMaterial color="#f4eee3" roughness={1} /></mesh>
    <mesh position={[0.06, 0.08, 0.017]} raycast={ignorePointer}><circleGeometry args={[0.12, 32]} /><meshStandardMaterial color="#c8a78c" roughness={1} /></mesh>
    <mesh position={[-0.06, -0.1, 0.019]} rotation={[0, 0, -0.35]} raycast={ignorePointer}><planeGeometry args={[0.1, 0.27]} /><meshStandardMaterial color="#9fa28d" roughness={1} /></mesh>
  </group>
}

export default function ScanRoomDecor({ room }) {
  const windows = [room.window, ...(room.windows ?? [])].filter(Boolean)
  return <group><WoodFloor room={room} /><Rug room={room} />{windows.map((opening, index) => <Curtains key={`${opening.wall}-${opening.offset}-${index}`} room={room} opening={opening} />)}<WallArt room={room} /></group>
}
