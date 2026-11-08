import { useEffect, useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const LINE_COLOR = '#4f463d'

function DimensionLabel({ position, anchor = [0.5, 0.5], children }) {
  const sprite = useRef()
  const { camera, size } = useThree()
  const worldPosition = useMemo(() => new THREE.Vector3(), [])
  const label = Array.isArray(children) ? children.join('') : String(children)
  const textureData = useMemo(() => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    const font = '700 28px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'
    context.font = font
    const paddingX = 22
    const paddingY = 14
    canvas.width = Math.ceil(context.measureText(label).width + paddingX * 2)
    canvas.height = 56

    context.font = font
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = 'rgba(255,253,249,.96)'
    context.strokeStyle = 'rgba(79,70,61,.32)'
    context.lineWidth = 2
    const radius = 20
    const x = 1
    const y = 1
    const width = canvas.width - 2
    const height = canvas.height - 2
    context.beginPath()
    context.roundRect(x, y, width, height, radius)
    context.fill()
    context.stroke()
    context.fillStyle = '#3f3831'
    context.fillText(label, canvas.width / 2, canvas.height / 2 + 1)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = false
    texture.needsUpdate = true
    return { texture, aspect: canvas.width / canvas.height }
  }, [label])

  useEffect(() => () => textureData.texture.dispose(), [textureData])

  useFrame(() => {
    if (!sprite.current || size.height <= 0) return
    sprite.current.getWorldPosition(worldPosition)
    let visibleWorldHeight
    if (camera.isPerspectiveCamera) {
      const distance = camera.position.distanceTo(worldPosition)
      visibleWorldHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
    } else if (camera.isOrthographicCamera) {
      visibleWorldHeight = (camera.top - camera.bottom) / camera.zoom
    } else {
      return
    }
    const targetPixels = 24
    const worldHeight = (visibleWorldHeight / size.height) * targetPixels
    sprite.current.scale.set(worldHeight * textureData.aspect, worldHeight, 1)
  })

  return (
    <sprite ref={sprite} position={position} center={anchor} scale={[0.14 * textureData.aspect, 0.14, 1]} renderOrder={40} raycast={() => null}>
      <spriteMaterial map={textureData.texture} transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </sprite>
  )
}

function GuideLine({ points }) {
  return <Line points={points} color={LINE_COLOR} lineWidth={1.25} transparent opacity={0.82} raycast={() => null} />
}

function DoorOpenDepthGuide({ product }) {
  if (!product.specVerified || !Number.isFinite(product.doorOpenDepthMm)) return null
  const openDepth = product.doorOpenDepthMm / 1000
  const extraDepth = openDepth - product.depth
  if (extraDepth <= 0) return null

  const startZ = product.depth / 2
  const endZ = startZ + extraDepth
  return (
    <group renderOrder={18}>
      <mesh
        position={[0, 0.019, startZ + extraDepth / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={18}
        raycast={() => null}
      >
        <planeGeometry args={[product.width, extraDepth]} />
        <meshBasicMaterial color="#d9a62e" transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <GuideLine points={[[-product.width / 2, 0.026, endZ], [product.width / 2, 0.026, endZ]]} />
      <GuideLine points={[[-product.width / 2, 0.026, startZ], [-product.width / 2, 0.026, endZ]]} />
      <GuideLine points={[[product.width / 2, 0.026, startZ], [product.width / 2, 0.026, endZ]]} />
      <DimensionLabel position={[0, 0.055, endZ + 0.07]} anchor={[0.5, 1]}>
        문 열림 깊이 참고 · 설치 여유 아님
      </DimensionLabel>
    </group>
  )
}

export default function ProductDimensions({ product }) {
  const widthHalf = product.width / 2
  const depthHalf = product.depth / 2
  const groundY = 0.025
  const widthZ = depthHalf + 0.14
  const depthX = widthHalf + 0.14
  const heightX = -widthHalf - 0.14
  const labelSuffix = product.specVerified ? '' : ' · 데모 규격'

  return (
    <group renderOrder={20}>
      <DoorOpenDepthGuide product={product} />
      <GuideLine points={[[-widthHalf, groundY, widthZ], [widthHalf, groundY, widthZ]]} />
      <GuideLine points={[[ -widthHalf, groundY, depthHalf + 0.04], [-widthHalf, groundY, widthZ + 0.045]]} />
      <GuideLine points={[[ widthHalf, groundY, depthHalf + 0.04], [widthHalf, groundY, widthZ + 0.045]]} />
      <DimensionLabel position={[0, groundY + 0.04, widthZ + 0.095]} anchor={[0.5, 1]}>
        가로 {Math.round(product.width * 1000)} mm{labelSuffix}
      </DimensionLabel>

      <GuideLine points={[[depthX, groundY, -depthHalf], [depthX, groundY, depthHalf]]} />
      <GuideLine points={[[widthHalf + 0.04, groundY, -depthHalf], [depthX + 0.045, groundY, -depthHalf]]} />
      <GuideLine points={[[widthHalf + 0.04, groundY, depthHalf], [depthX + 0.045, groundY, depthHalf]]} />
      <DimensionLabel position={[depthX + 0.09, groundY + 0.04, 0]} anchor={[0, 0.5]}>
        깊이 {Math.round(product.depth * 1000)} mm{labelSuffix}
      </DimensionLabel>

      <GuideLine points={[[heightX, 0, depthHalf + 0.02], [heightX, product.height, depthHalf + 0.02]]} />
      <GuideLine points={[[heightX - 0.045, 0, depthHalf + 0.02], [-widthHalf - 0.04, 0, depthHalf + 0.02]]} />
      <GuideLine points={[[heightX - 0.045, product.height, depthHalf + 0.02], [-widthHalf - 0.04, product.height, depthHalf + 0.02]]} />
      <DimensionLabel position={[heightX - 0.08, product.height / 2, 0]} anchor={[1, 0.5]}>
        높이 {Math.round(product.height * 1000)} mm{labelSuffix}
      </DimensionLabel>
    </group>
  )
}
