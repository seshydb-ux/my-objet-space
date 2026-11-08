import { Edges, RoundedBox } from '@react-three/drei'

function Cabinet({ product, danger, color, children }) {
  const frontInset = Math.min(0.04, product.depth * 0.08)
  const cabinetDepth = product.depth - frontInset
  return (
    <>
      <RoundedBox
        args={[product.width, product.height, cabinetDepth]}
        radius={Math.min(0.045, product.width * 0.07)}
        smoothness={4}
        position={[0, product.height / 2, -frontInset / 2]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial color={danger ? '#d85745' : color} roughness={0.48} clearcoat={0.1} />
        {danger && <Edges color="#ff7466" lineWidth={2.5} />}
      </RoundedBox>
      {children(product.depth / 2, frontInset)}
    </>
  )
}

function CircularDoor({ product, frontZ, danger, washer = false }) {
  const diameter = Math.min(product.width * (washer ? 0.78 : 0.76), product.height * 0.54)
  const y = product.height * (washer ? 0.47 : 0.49)
  const rimDepth = Math.min(0.028, product.depth * 0.045)
  return (
    <>
      <mesh position={[0, y, frontZ - rimDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[diameter / 2, diameter / 2, rimDepth, 48]} />
        <meshStandardMaterial color={danger ? '#8e261d' : '#202020'} metalness={0.38} roughness={0.25} />
      </mesh>
      <mesh position={[0, y, frontZ - 0.001]}>
        <circleGeometry args={[diameter * 0.405, 48]} />
        <meshPhysicalMaterial color={danger ? '#68231f' : '#30373a'} metalness={0.12} roughness={0.16} />
      </mesh>
    </>
  )
}

export function DryerModel({ product, danger }) {
  return (
    <Cabinet product={product} danger={danger} color="#d7c1a6">
      {(frontZ) => (
        <>
          <CircularDoor product={product} frontZ={frontZ} danger={danger} />
          <mesh position={[product.width * 0.21, product.height * 0.855, frontZ - 0.008]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[product.width * 0.073, product.width * 0.073, 0.016, 32]} />
            <meshStandardMaterial color={danger ? '#8e261d' : '#1c1c1c'} metalness={0.35} roughness={0.3} />
          </mesh>
          <mesh position={[-product.width * 0.17, product.height * 0.855, frontZ - 0.008]}>
            <boxGeometry args={[product.width * 0.28, product.height * 0.052, 0.016]} />
            <meshStandardMaterial color={danger ? '#8e261d' : '#1c1c1c'} />
          </mesh>
        </>
      )}
    </Cabinet>
  )
}

export function WasherModel({ product, danger }) {
  return (
    <Cabinet product={product} danger={danger} color="#e5ddd1">
      {(frontZ) => (
        <>
          <CircularDoor product={product} frontZ={frontZ} danger={danger} washer />
          <mesh position={[0, product.height * 0.84, frontZ - 0.008]}>
            <boxGeometry args={[product.width * 0.72, product.height * 0.075, 0.016]} />
            <meshStandardMaterial color={danger ? '#8e261d' : '#292929'} roughness={0.3} />
          </mesh>
        </>
      )}
    </Cabinet>
  )
}

export function FridgeModel({ product, danger }) {
  const doorDepth = Math.min(0.018, product.depth * 0.035)
  const frontZ = product.depth / 2 - doorDepth / 2
  return (
    <Cabinet product={product} danger={danger} color="#d9cec0">
      {() => (
        <>
          <mesh position={[0, product.height / 2, frontZ]} castShadow>
            <boxGeometry args={[product.width * 0.985, product.height * 0.985, doorDepth]} />
            <meshPhysicalMaterial color={danger ? '#c94d3e' : '#cfc0ae'} roughness={0.42} clearcoat={0.08} />
          </mesh>
          <mesh position={[-product.width * 0.41, product.height * 0.54, product.depth / 2 - 0.0015]}>
            <boxGeometry args={[Math.min(0.014, product.width * 0.025), product.height * 0.36, 0.003]} />
            <meshStandardMaterial color={danger ? '#8e261d' : '#171717'} metalness={0.28} roughness={0.3} />
          </mesh>
        </>
      )}
    </Cabinet>
  )
}

export function StylerModel({ product, danger }) {
  const doorDepth = Math.min(0.018, product.depth * 0.035)
  return (
    <Cabinet product={product} danger={danger} color="#c9b7a3">
      {() => (
        <>
          <mesh position={[0, product.height / 2, product.depth / 2 - doorDepth / 2]} castShadow>
            <boxGeometry args={[product.width * 0.975, product.height * 0.985, doorDepth]} />
            <meshPhysicalMaterial
              color={danger ? '#c94d3e' : '#202426'}
              metalness={danger ? 0.08 : 0.32}
              roughness={danger ? 0.4 : 0.16}
              clearcoat={danger ? 0.08 : 0.7}
            />
          </mesh>
          <mesh position={[product.width * 0.36, product.height * 0.54, product.depth / 2 - 0.0015]}>
            <boxGeometry args={[Math.min(0.014, product.width * 0.025), product.height * 0.38, 0.003]} />
            <meshStandardMaterial color={danger ? '#8e261d' : '#51483f'} metalness={0.32} roughness={0.35} />
          </mesh>
          <mesh position={[0, product.height * 0.9, product.depth / 2 - 0.001]}>
            <boxGeometry args={[product.width * 0.42, product.height * 0.035, 0.002]} />
            <meshBasicMaterial color={danger ? '#8e261d' : '#242424'} />
          </mesh>
        </>
      )}
    </Cabinet>
  )
}
