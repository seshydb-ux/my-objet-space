import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Edges, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { DRYER, PRESENTATION_MARGIN, ROOM } from './layout.js'

const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const hitPoint = new THREE.Vector3()

export default function Dryer({ position, rotation, colliding, onMove, onDraggingChange }) {
  const dragging = useRef(false)
  const pointerId = useRef(null)
  const grabOffset = useRef({ x: 0, z: 0 })
  const bodyColor = colliding ? '#d85745' : '#d7c1a6'
  const accentColor = colliding ? '#8e261d' : '#1c1c1c'

  const bounds = useMemo(
    () => ({
      minX: -ROOM.width / 2 - PRESENTATION_MARGIN,
      maxX: ROOM.width / 2 + PRESENTATION_MARGIN,
      minZ: -ROOM.depth / 2 - PRESENTATION_MARGIN,
      maxZ: ROOM.depth / 2 + PRESENTATION_MARGIN,
    }),
    [],
  )

  const finishDrag = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    pointerId.current = null
    onDraggingChange(false)
  }, [onDraggingChange])

  useEffect(() => {
    window.addEventListener('blur', finishDrag)
    window.addEventListener('pointerup', finishDrag)
    window.addEventListener('pointercancel', finishDrag)
    return () => {
      window.removeEventListener('blur', finishDrag)
      window.removeEventListener('pointerup', finishDrag)
      window.removeEventListener('pointercancel', finishDrag)
    }
  }, [finishDrag])

  const startDrag = (event) => {
    event.stopPropagation()
    if (!event.ray.intersectPlane(floorPlane, hitPoint)) return
    dragging.current = true
    pointerId.current = event.pointerId
    grabOffset.current = {
      x: position.x - hitPoint.x,
      z: position.z - hitPoint.z,
    }
    event.target.setPointerCapture?.(event.pointerId)
    onDraggingChange(true)
  }

  const moveDrag = (event) => {
    if (!dragging.current || pointerId.current !== event.pointerId) return
    event.stopPropagation()
    if (!event.ray.intersectPlane(floorPlane, hitPoint)) return
    onMove({
      x: THREE.MathUtils.clamp(hitPoint.x + grabOffset.current.x, bounds.minX, bounds.maxX),
      z: THREE.MathUtils.clamp(hitPoint.z + grabOffset.current.z, bounds.minZ, bounds.maxZ),
    })
  }

  const finishPointer = (event) => {
    event.stopPropagation()
    event.target.releasePointerCapture?.(event.pointerId)
    finishDrag()
  }

  return (
    <group
      position={[position.x, 0, position.z]}
      rotation={[0, rotation * (Math.PI / 2), 0]}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onLostPointerCapture={finishPointer}
    >
      <RoundedBox
        args={[DRYER.width, DRYER.height, DRYER.depth]}
        radius={0.055}
        smoothness={5}
        position={[0, DRYER.height / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial color={bodyColor} roughness={0.5} clearcoat={0.12} clearcoatRoughness={0.65} />
        {colliding && <Edges color="#ff7466" lineWidth={2.5} />}
      </RoundedBox>

      <mesh position={[0, 0.49, DRYER.depth / 2 + 0.018]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.272, 0.272, 0.055, 64]} />
        <meshStandardMaterial color={accentColor} metalness={0.42} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.49, DRYER.depth / 2 + 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.222, 64]} />
        <meshPhysicalMaterial color="#30373a" metalness={0.15} roughness={0.18} transmission={0.06} />
      </mesh>
      <mesh position={[0, 0.49, DRYER.depth / 2 + 0.056]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.212, 0.014, 16, 64]} />
        <meshStandardMaterial color="#697073" metalness={0.5} roughness={0.28} />
      </mesh>

      <mesh position={[0.145, 0.845, DRYER.depth / 2 + 0.044]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.051, 0.051, 0.034, 40]} />
        <meshStandardMaterial color={accentColor} metalness={0.42} roughness={0.3} />
      </mesh>
      <mesh position={[-0.12, 0.846, DRYER.depth / 2 + 0.043]}>
        <boxGeometry args={[0.195, 0.052, 0.022]} />
        <meshStandardMaterial color={accentColor} metalness={0.15} roughness={0.25} />
      </mesh>
      <mesh position={[-0.17, 0.846, DRYER.depth / 2 + 0.056]}>
        <boxGeometry args={[0.058, 0.009, 0.006]} />
        <meshBasicMaterial color={colliding ? '#ffb0a8' : '#e7e4da'} />
      </mesh>
      <mesh position={[0, 0.075, DRYER.depth / 2 + 0.043]}>
        <boxGeometry args={[0.23, 0.024, 0.012]} />
        <meshStandardMaterial color={accentColor} roughness={0.45} />
      </mesh>

      {[-0.25, 0.25].flatMap((x) =>
        [-0.31, 0.31].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.025, z]} castShadow>
            <cylinderGeometry args={[0.027, 0.032, 0.05, 20]} />
            <meshStandardMaterial color="#3f3b37" roughness={0.8} />
          </mesh>
        )),
      )}
    </group>
  )
}
