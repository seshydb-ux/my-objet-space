import { useCallback, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Product3D from './Product3D.jsx'
import Room from './Room.jsx'
import { PRODUCT_BY_ID, ROOM } from './layout.js'
import { hasExceededDragThreshold, pointerCoordinates } from './pointerGesture.js'

const CAMERA_FOV = 36

function viewHalfAngles(aspect) {
  const vertical = THREE.MathUtils.degToRad(CAMERA_FOV) / 2
  const horizontal = Math.atan(Math.tan(vertical) * Math.max(aspect, 0.1))
  return { vertical, horizontal }
}

function getCameraPosition(mode, room, aspect = 1, target = new THREE.Vector3()) {
  const width = room?.width ?? ROOM.width
  const depth = room?.depth ?? ROOM.depth
  const height = room?.height ?? ROOM.height
  const { vertical, horizontal } = viewHalfAngles(aspect)
  const padding = 1.22
  const heightAboveTarget = Math.max(0, height - target.y)
  const verticalExtent = Math.max(target.y, heightAboveTarget)

  if (mode === 'top') {
    const planarFitDistance = Math.max(
      depth / (2 * Math.tan(vertical)),
      width / (2 * Math.tan(horizontal)),
    ) * padding
    // The wall tops are closer to a top camera than the floor, so reserve their
    // height in addition to the planar fit distance.
    const distance = planarFitDistance + heightAboveTarget
    return new THREE.Vector3(target.x, target.y + distance, target.z + 0.001)
  }

  if (mode === 'side') {
    const faceFitDistance = Math.max(
      verticalExtent / Math.tan(vertical),
      depth / (2 * Math.tan(horizontal)),
    ) * padding
    // Add the half-width between the room centre and its nearest side wall.
    const distance = faceFitDistance + width / 2
    // A slightly elevated side view preserves the elevation-style composition
    // while ensuring pointer rays intersect the floor reliably during dragging.
    const elevation = THREE.MathUtils.degToRad(17)
    return new THREE.Vector3(
      target.x + Math.cos(elevation) * distance,
      target.y + Math.sin(elevation) * distance,
      target.z,
    )
  }

  // A bounding sphere stays inside both the horizontal and vertical frustum
  // for an oblique free view, including very narrow browser widths.
  const radius = Math.hypot(width / 2, depth / 2, verticalExtent)
  const limitingHalfAngle = Math.max(0.08, Math.min(vertical, horizontal))
  const distance = (radius / Math.sin(limitingHalfAngle)) * 1.16
  const direction = new THREE.Vector3(1, 0.78, 1.08).normalize()
  return target.clone().add(direction.multiplyScalar(distance))
}

function CameraControls({ controls, dragging, resetToken, cameraMode = 'free', room }) {
  const { camera, size } = useThree()
  const target = new THREE.Vector3(0, Math.min((room?.height ?? ROOM.height) * 0.22, 0.7), 0)
  const span = Math.max(room?.width ?? ROOM.width, room?.depth ?? ROOM.depth, room?.height ?? ROOM.height)
  const aspect = Math.max(size.width / Math.max(size.height, 1), 0.1)
  const fittedPosition = getCameraPosition(cameraMode, room, aspect, target)
  const fittedDistance = fittedPosition.distanceTo(target)

  useEffect(() => {
    camera.up.set(0, cameraMode === 'top' ? 0 : 1, cameraMode === 'top' ? -1 : 0)
    camera.far = Math.max(100, span * 12)
    camera.updateProjectionMatrix()
    camera.position.copy(fittedPosition)
    controls.current?.target.copy(target)
    controls.current?.update()
  }, [camera, cameraMode, resetToken, room?.width, room?.depth, room?.height, aspect])

  return (
    <OrbitControls
      ref={controls}
      enabled={!dragging}
      makeDefault
      target={target}
      enableDamping
      dampingFactor={0.07}
      minDistance={Math.max(2.2, span * 0.55)}
      maxDistance={Math.max(11, span * 3.1, fittedDistance * 2.5)}
      minPolarAngle={cameraMode === 'top' ? 0.01 : 0.18}
      maxPolarAngle={Math.PI / 2.08}
    />
  )
}

function EmptyRoomInteraction({ onSelect, children }) {
  const gesture = useRef({ active: false, pointerId: null, start: null, moved: false })

  const finish = useCallback((event, allowDeselect) => {
    const current = gesture.current
    if (!current.active || current.pointerId !== event.pointerId) return
    const moved = current.moved || hasExceededDragThreshold(current.start, pointerCoordinates(event))
    gesture.current = { active: false, pointerId: null, start: null, moved: false }
    if (allowDeselect && !moved) onSelect?.(null)
  }, [onSelect])

  useEffect(() => {
    const finishWindow = (event) => finish(event, event.type === 'pointerup')
    const cancel = () => {
      gesture.current = { active: false, pointerId: null, start: null, moved: false }
    }
    window.addEventListener('pointerup', finishWindow)
    window.addEventListener('pointercancel', finishWindow)
    window.addEventListener('blur', cancel)
    return () => {
      window.removeEventListener('pointerup', finishWindow)
      window.removeEventListener('pointercancel', finishWindow)
      window.removeEventListener('blur', cancel)
    }
  }, [finish])

  return (
    <group
      onPointerDown={(event) => {
        if ((event.nativeEvent?.button ?? event.button) !== 0) return
        gesture.current = {
          active: true,
          pointerId: event.pointerId,
          start: pointerCoordinates(event),
          moved: false,
        }
      }}
      onPointerMove={(event) => {
        if (!gesture.current.active || gesture.current.pointerId !== event.pointerId) return
        if (hasExceededDragThreshold(gesture.current.start, pointerCoordinates(event))) {
          gesture.current.moved = true
        }
      }}
      onPointerUp={(event) => finish(event, true)}
      onPointerCancel={(event) => finish(event, false)}
    >
      {children}
    </group>
  )
}

function SelectionAnchorReporter({ instance, onAnchorChange }) {
  const { camera, size } = useThree()
  const callback = useRef(onAnchorChange)
  const last = useRef(null)
  const point = useRef(new THREE.Vector3())

  useEffect(() => {
    callback.current = onAnchorChange
  }, [onAnchorChange])

  useEffect(() => {
    last.current = null
  }, [instance?.id])

  useFrame(() => {
    const product = instance ? PRODUCT_BY_ID[instance.productId] : null
    let next
    if (!instance || !product) {
      next = { x: 0, y: 0, visible: false, width: size.width, height: size.height }
    } else {
      point.current.set(instance.position.x, product.height + 0.16, instance.position.z).project(camera)
      const x = (point.current.x * 0.5 + 0.5) * size.width
      const y = (-point.current.y * 0.5 + 0.5) * size.height
      const visible = Number.isFinite(x)
        && Number.isFinite(y)
        && point.current.z >= -1
        && point.current.z <= 1
        && x >= 0
        && x <= size.width
        && y >= 0
        && y <= size.height
      next = { x, y, visible, width: size.width, height: size.height }
    }

    const previous = last.current
    const changed = !previous
      || previous.visible !== next.visible
      || previous.width !== next.width
      || previous.height !== next.height
      || (next.visible && (Math.abs(previous.x - next.x) >= 1 || Math.abs(previous.y - next.y) >= 1))
    if (changed) {
      last.current = next
      callback.current?.(next)
    }
  })

  return null
}

function CanvasMissGestureTracker({ gesture }) {
  const { gl } = useThree()

  useEffect(() => {
    const canvas = gl.domElement
    const start = (event) => {
      if (event.button !== 0) return
      gesture.current = {
        active: true,
        pointerId: event.pointerId,
        start: pointerCoordinates(event),
        moved: false,
        lastWasDrag: false,
      }
    }
    const move = (event) => {
      const current = gesture.current
      if (!current.active || current.pointerId !== event.pointerId) return
      if (hasExceededDragThreshold(current.start, pointerCoordinates(event))) current.moved = true
    }
    const finish = (event) => {
      const current = gesture.current
      if (!current.active || current.pointerId !== event.pointerId) return
      const moved = current.moved || hasExceededDragThreshold(current.start, pointerCoordinates(event))
      gesture.current = {
        active: false,
        pointerId: null,
        start: null,
        moved: false,
        lastWasDrag: event.type !== 'pointerup' || moved,
      }
    }
    const cancel = () => {
      gesture.current = {
        active: false,
        pointerId: null,
        start: null,
        moved: false,
        lastWasDrag: true,
      }
    }

    canvas.addEventListener('pointerdown', start, true)
    window.addEventListener('pointermove', move, true)
    window.addEventListener('pointerup', finish, true)
    window.addEventListener('pointercancel', finish, true)
    window.addEventListener('blur', cancel)
    return () => {
      canvas.removeEventListener('pointerdown', start, true)
      window.removeEventListener('pointermove', move, true)
      window.removeEventListener('pointerup', finish, true)
      window.removeEventListener('pointercancel', finish, true)
      window.removeEventListener('blur', cancel)
    }
  }, [gl, gesture])

  return null
}

function SceneContent(props) {
  const controls = useRef()
  const roomWidth = props.room?.width ?? ROOM.width
  const roomDepth = props.room?.depth ?? ROOM.depth
  const roomHeight = props.room?.height ?? ROOM.height
  const sceneSpan = Math.max(roomWidth, roomDepth, roomHeight)
  const fogNear = Math.max(9, sceneSpan * 1.5)
  const fogFar = Math.max(20, sceneSpan * 4)
  const shadowExtent = Math.max(5, sceneSpan * 0.9)
  return (
    <>
      <color attach="background" args={['#ebe7df']} />
      <fog attach="fog" args={['#ebe7df', fogNear, fogFar]} />
      <ambientLight intensity={0.95} />
      <hemisphereLight args={['#fff9ed', '#9d8d79', 1.05]} />
      <directionalLight
        castShadow
        position={[2.8, 6.4, -2.8]}
        intensity={2.25}
        color="#fff7e9"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={14}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
      />
      <EmptyRoomInteraction onSelect={props.onSelect}>
        <Room room={props.room} />
      </EmptyRoomInteraction>
      {props.products.map((instance) => (
        <Product3D
          key={instance.id}
          instance={instance}
          collision={props.collisions[instance.id]}
          selected={props.selectedId === instance.id}
          dimensionsVisible={props.dimensionsVisible ?? true}
          onSelect={props.onSelect}
          onMove={props.onMove}
          onDraggingChange={props.onDraggingChange}
          controls={controls}
          room={props.room}
        />
      ))}
      <ContactShadows position={[0, 0.012, 0]} opacity={0.27} scale={Math.max(11, sceneSpan * 2.15)} blur={2.5} far={Math.max(4.5, roomHeight * 1.8)} />
      <SelectionAnchorReporter
        instance={props.products.find((instance) => instance.id === props.selectedId) ?? null}
        onAnchorChange={props.onAnchorChange}
      />
      <CanvasMissGestureTracker gesture={props.canvasMissGesture} />
      <CameraControls controls={controls} dragging={props.dragging} resetToken={props.resetToken} cameraMode={props.cameraMode} room={props.room} />
    </>
  )
}

export default function Scene(props) {
  const canvasMissGesture = useRef({
    active: false,
    pointerId: null,
    start: null,
    moved: false,
    lastWasDrag: false,
  })

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: getCameraPosition(props.cameraMode ?? 'free', props.room).toArray(), fov: CAMERA_FOV, near: 0.1, far: Math.max(100, Math.max(props.room?.width ?? ROOM.width, props.room?.depth ?? ROOM.depth) * 12) }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMappingExposure = 1.04
      }}
      onPointerMissed={() => {
        if (!canvasMissGesture.current.lastWasDrag) props.onSelect?.(null)
        canvasMissGesture.current.lastWasDrag = false
      }}
    >
      <SceneContent {...props} canvasMissGesture={canvasMissGesture} />
    </Canvas>
  )
}
