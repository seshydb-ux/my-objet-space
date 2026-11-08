import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import { PRESENTATION_MARGIN, PRODUCT_BY_ID, ROOM } from './layout.js'
import ProductDimensions from './ProductDimensions.jsx'
import { hasExceededDragThreshold, pointerCoordinates } from './pointerGesture.js'
import ProductModel from './models/ProductModel.jsx'

const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const hitPoint = new THREE.Vector3()

function SelectionOutline({ product }) {
  return (
    <mesh position={[0, product.height / 2, 0]} raycast={() => null}>
      <boxGeometry args={[product.width + 0.025, product.height + 0.025, product.depth + 0.025]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      <Edges color="#e0ad22" lineWidth={3.4} threshold={8} />
    </mesh>
  )
}

export default function Product3D({ instance, collision, selected, dimensionsVisible = true, onSelect, onMove, onDraggingChange, controls, room }) {
  const dragging = useRef(false)
  const gesture = useRef({ active: false, pointerId: null, start: null })
  const grabOffset = useRef(null)
  const product = PRODUCT_BY_ID[instance.productId]
  const activeRoom = room ?? ROOM
  const bounds = useMemo(() => ({
    minX: -activeRoom.width / 2 - PRESENTATION_MARGIN,
    maxX: activeRoom.width / 2 + PRESENTATION_MARGIN,
    minZ: -activeRoom.depth / 2 - PRESENTATION_MARGIN,
    maxZ: activeRoom.depth / 2 + PRESENTATION_MARGIN,
  }), [activeRoom.width, activeRoom.depth])

  const finishGesture = useCallback((selectClick = false) => {
    if (!gesture.current.active) return
    const wasDragging = dragging.current
    const shouldSelect = selectClick && !wasDragging
    gesture.current = { active: false, pointerId: null, start: null }
    dragging.current = false
    if (controls.current) controls.current.enabled = true
    if (wasDragging) onDraggingChange(false)
    if (shouldSelect) onSelect(instance.id)
  }, [controls, instance.id, onDraggingChange, onSelect])

  useEffect(() => {
    const finishWindowPointer = (event) => {
      if (!gesture.current.active || gesture.current.pointerId !== event.pointerId) return
      const current = pointerCoordinates(event)
      const moved = hasExceededDragThreshold(gesture.current.start, current)
      finishGesture(event.type === 'pointerup' && !moved)
    }
    const cancelWindowGesture = () => finishGesture(false)
    window.addEventListener('blur', cancelWindowGesture)
    window.addEventListener('pointerup', finishWindowPointer)
    window.addEventListener('pointercancel', finishWindowPointer)
    return () => {
      window.removeEventListener('blur', cancelWindowGesture)
      window.removeEventListener('pointerup', finishWindowPointer)
      window.removeEventListener('pointercancel', finishWindowPointer)
    }
  }, [finishGesture])

  const startGesture = (event) => {
    if ((event.nativeEvent?.button ?? event.button) !== 0) return
    event.stopPropagation()
    event.nativeEvent?.stopImmediatePropagation?.()
    gesture.current = {
      active: true,
      pointerId: event.pointerId,
      start: pointerCoordinates(event),
    }
    dragging.current = false
    if (controls.current) controls.current.enabled = false
    grabOffset.current = event.ray.intersectPlane(floorPlane, hitPoint)
      ? { x: instance.position.x - hitPoint.x, z: instance.position.z - hitPoint.z }
      : null
    event.target.setPointerCapture?.(event.pointerId)
  }

  const moveGesture = (event) => {
    if (!gesture.current.active || gesture.current.pointerId !== event.pointerId) return
    event.stopPropagation()
    event.nativeEvent?.stopImmediatePropagation?.()
    if (!dragging.current) {
      if (!hasExceededDragThreshold(gesture.current.start, pointerCoordinates(event))) return
      dragging.current = true
      onSelect(instance.id)
      onDraggingChange(true)
    }
    if (!event.ray.intersectPlane(floorPlane, hitPoint)) return
    if (!grabOffset.current) {
      grabOffset.current = { x: instance.position.x - hitPoint.x, z: instance.position.z - hitPoint.z }
    }
    onMove(instance.id, {
      x: THREE.MathUtils.clamp(hitPoint.x + grabOffset.current.x, bounds.minX, bounds.maxX),
      z: THREE.MathUtils.clamp(hitPoint.z + grabOffset.current.z, bounds.minZ, bounds.maxZ),
    })
  }

  const finishPointer = (event) => {
    if (!gesture.current.active || gesture.current.pointerId !== event.pointerId) return
    event.stopPropagation()
    event.nativeEvent?.stopImmediatePropagation?.()
    const isPointerUp = event.type === 'pointerup' || event.nativeEvent?.type === 'pointerup'
    const moved = hasExceededDragThreshold(gesture.current.start, pointerCoordinates(event))
    const selectClick = isPointerUp && !moved
    finishGesture(selectClick)
    event.target.releasePointerCapture?.(event.pointerId)
  }

  return (
    <group
      position={[instance.position.x, 0, instance.position.z]}
      rotation={[0, ((instance.angleDegrees ?? instance.rotation * 90) * Math.PI) / 180, 0]}
      onPointerDown={startGesture}
      onPointerMove={moveGesture}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onLostPointerCapture={finishPointer}
    >
      <ProductModel product={product} danger={collision.colliding} />
      {selected && (
        <>
          <SelectionOutline product={product} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} raycast={() => null}>
            <ringGeometry args={[Math.max(product.width, product.depth) * 0.58, Math.max(product.width, product.depth) * 0.62, 48]} />
            <meshBasicMaterial color="#e0ad22" transparent opacity={0.78} depthWrite={false} />
          </mesh>
          {dimensionsVisible && <ProductDimensions product={product} />}
        </>
      )}
    </group>
  )
}
