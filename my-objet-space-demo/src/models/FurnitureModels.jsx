import { Edges, RoundedBox } from '@react-three/drei'

export function BedModel({ product, danger }) {
  const baseHeight = product.height * 0.55
  const mattressHeight = product.height * 0.36
  const mattressY = baseHeight + mattressHeight / 2
  return (
    <>
      <RoundedBox args={[product.width, baseHeight, product.depth]} radius={0.05} position={[0, baseHeight / 2, 0]} castShadow>
        <meshStandardMaterial color={danger ? '#d85745' : '#c5a985'} roughness={0.82} />
        {danger && <Edges color="#ff7466" lineWidth={2.2} />}
      </RoundedBox>
      <RoundedBox args={[product.width * 0.92, mattressHeight, product.depth * 0.88]} radius={0.05} position={[0, mattressY, 0]} castShadow>
        <meshStandardMaterial color={danger ? '#eb786a' : '#f7f1e7'} roughness={0.96} />
      </RoundedBox>
      <RoundedBox
        args={[product.width * 0.3, product.height * 0.08, product.depth * 0.28]}
        radius={0.035}
        position={[-product.width * 0.25, product.height * 0.95, product.depth * 0.27]}
        castShadow
      >
        <meshStandardMaterial color={danger ? '#f39a90' : '#d8c6b2'} />
      </RoundedBox>
    </>
  )
}

export function SofaModel({ product, danger }) {
  const fabric = danger ? '#d85745' : '#c9b8a2'
  return (
    <>
      <RoundedBox args={[product.width, product.height * 0.46, product.depth]} radius={0.07} position={[0, product.height * 0.23, 0]} castShadow>
        <meshStandardMaterial color={fabric} roughness={0.95} />
        {danger && <Edges color="#ff7466" lineWidth={2.2} />}
      </RoundedBox>
      <RoundedBox args={[product.width * 0.93, product.height * 0.67, product.depth * 0.22]} radius={0.06} position={[0, product.height * 0.665, product.depth * 0.39]} castShadow>
        <meshStandardMaterial color={fabric} roughness={0.95} />
      </RoundedBox>
      {[-1, 1].map((side) => (
        <RoundedBox key={side} args={[product.width * 0.1, product.height * 0.54, product.depth * 0.82]} radius={0.05} position={[side * product.width * 0.45, product.height * 0.27, 0]} castShadow>
          <meshStandardMaterial color={fabric} roughness={0.95} />
        </RoundedBox>
      ))}
    </>
  )
}

export function DeskModel({ product, danger }) {
  const wood = danger ? '#d85745' : '#ad7d55'
  const topHeight = Math.min(0.09, product.height * 0.14)
  const legHeight = product.height - topHeight
  const legWidth = Math.min(0.055, product.width * 0.08, product.depth * 0.12)
  return (
    <>
      <RoundedBox args={[product.width, topHeight, product.depth]} radius={0.025} position={[0, product.height - topHeight / 2, 0]} castShadow>
        <meshStandardMaterial color={wood} roughness={0.72} />
        {danger && <Edges color="#ff7466" lineWidth={2.2} />}
      </RoundedBox>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x * (product.width / 2 - legWidth), legHeight / 2, z * (product.depth / 2 - legWidth)]} castShadow>
          <boxGeometry args={[legWidth, legHeight, legWidth]} />
          <meshStandardMaterial color={wood} roughness={0.78} />
        </mesh>
      ))}
    </>
  )
}
