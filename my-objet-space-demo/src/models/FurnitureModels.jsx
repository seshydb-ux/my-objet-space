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
      {[-1, 1].map((side) => <RoundedBox key={side}
        args={[product.width * 0.28, product.height * 0.08, product.depth * 0.23]}
        radius={Math.min(0.015, product.height * 0.035)}
        position={[side * product.width * 0.19, product.height * 0.95, product.depth * 0.29]}
        castShadow
      >
        <meshStandardMaterial color={danger ? '#f39a90' : side < 0 ? '#e4d6c7' : '#f7f1e7'} roughness={0.95} />
      </RoundedBox>)}
      <RoundedBox args={[product.width * 0.86, product.height * 0.055, product.depth * 0.33]} radius={Math.min(0.01, product.height * 0.025)} position={[0, product.height * 0.937, -product.depth * 0.22]} castShadow>
        <meshStandardMaterial color={danger ? '#e37b70' : '#b9ab9a'} roughness={0.98} />
      </RoundedBox>
    </>
  )
}

export function SofaModel({ product, danger }) {
  const fabric = danger ? '#d85745' : '#c9b8a2'
  return (
    <>
      <RoundedBox args={[product.width, product.height * 0.4, product.depth]} radius={0.07} position={[0, product.height * 0.26, 0]} castShadow>
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
      {[-1, 1].map((side) => <group key={`cushions-${side}`}>
        <RoundedBox args={[product.width * 0.36, product.height * 0.10, product.depth * 0.58]} radius={0.035} position={[side * product.width * 0.2, product.height * 0.51, -product.depth * 0.06]} castShadow>
          <meshStandardMaterial color={danger ? '#e77a6c' : '#e5d9ca'} roughness={0.98} />
        </RoundedBox>
        <RoundedBox args={[product.width * 0.36, product.height * 0.42, product.depth * 0.16]} radius={0.045} position={[side * product.width * 0.2, product.height * 0.72, product.depth * 0.2]} castShadow>
          <meshStandardMaterial color={danger ? '#e77a6c' : '#e2d5c5'} roughness={0.98} />
        </RoundedBox>
      </group>)}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => <mesh key={`foot-${x}-${z}`} position={[x * product.width * 0.42, product.height * 0.03, z * product.depth * 0.39]} castShadow>
        <boxGeometry args={[product.width * 0.045, product.height * 0.06, product.depth * 0.06]} />
        <meshStandardMaterial color={danger ? '#ae4034' : '#80674f'} roughness={0.8} />
      </mesh>)}
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
      <RoundedBox args={[product.width * 0.72, product.height * 0.14, product.depth * 0.78]} radius={0.015} position={[0, product.height - topHeight - product.height * 0.07, 0]} castShadow>
        <meshStandardMaterial color={danger ? '#c94d3e' : '#c19a72'} roughness={0.8} />
      </RoundedBox>
      <mesh position={[-product.width * 0.22, product.height + 0.012, 0]} castShadow>
        <boxGeometry args={[product.width * 0.22, 0.024, product.depth * 0.31]} />
        <meshStandardMaterial color={danger ? '#c94d3e' : '#eee7d9'} roughness={0.95} />
      </mesh>
      <mesh position={[-product.width * 0.2, product.height + 0.032, 0.01]} rotation={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[product.width * 0.18, 0.016, product.depth * 0.25]} />
        <meshStandardMaterial color={danger ? '#d85745' : '#bca998'} roughness={0.95} />
      </mesh>
      <group position={[product.width * 0.29, product.height, 0]}>
        <mesh position={[0, 0.04, 0]} castShadow><cylinderGeometry args={[0.055, 0.042, 0.08, 20]} /><meshStandardMaterial color={danger ? '#c94d3e' : '#e3d8cb'} roughness={0.9} /></mesh>
        {[[-0.025, 0.11, 0], [0.027, 0.125, 0.008], [0, 0.14, -0.015]].map(([x, y, z], index) => <mesh key={index} position={[x, y, z]} rotation={[0, 0, x * -5]} castShadow>
          <sphereGeometry args={[0.035, 12, 10]} /><meshStandardMaterial color={danger ? '#bd4d3f' : '#7e8b6c'} roughness={0.95} />
        </mesh>)}
      </group>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x * (product.width / 2 - legWidth), legHeight / 2, z * (product.depth / 2 - legWidth)]} castShadow>
          <boxGeometry args={[legWidth, legHeight, legWidth]} />
          <meshStandardMaterial color={wood} roughness={0.78} />
        </mesh>
      ))}
    </>
  )
}

export function CoffeeTableModel({ product, danger }) {
  const wood = danger ? '#d85745' : '#c1a17c'
  const topHeight = 0.055
  const leg = 0.045
  return <>
    <RoundedBox args={[product.width, topHeight, product.depth]} radius={0.025} position={[0, product.height - topHeight / 2, 0]} castShadow>
      <meshStandardMaterial color={wood} roughness={0.78} />
      {danger && <Edges color="#ff7466" lineWidth={2.2} />}
    </RoundedBox>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => <mesh key={`${x}-${z}`} position={[x * (product.width / 2 - leg), (product.height - topHeight) / 2, z * (product.depth / 2 - leg)]} castShadow>
      <boxGeometry args={[leg, product.height - topHeight, leg]} />
      <meshStandardMaterial color={wood} roughness={0.8} />
    </mesh>)}
  </>
}

export function KitchenCounterModel({ product, danger }) {
  const cabinetColor = danger ? '#d85745' : '#eee8de'
  const woodColor = danger ? '#bd483b' : '#b8946d'
  const frontZ = product.depth / 2 + 0.006
  const counterHeight = 0.075
  const counterY = product.height * 0.78
  const cabinetHeight = counterY - counterHeight
  return <>
    <RoundedBox args={[product.width, cabinetHeight, product.depth * 0.94]} radius={0.025} position={[0, cabinetHeight / 2, -product.depth * 0.02]} castShadow receiveShadow>
      <meshStandardMaterial color={cabinetColor} roughness={0.86} />
      {danger && <Edges color="#ff7466" lineWidth={2.2} />}
    </RoundedBox>
    <RoundedBox args={[product.width + 0.06, counterHeight, product.depth]} radius={0.025} position={[0, counterY - counterHeight / 2, 0]} castShadow>
      <meshStandardMaterial color={danger ? '#ce574a' : '#d6c7b5'} roughness={0.74} />
    </RoundedBox>
    {[-0.32, 0, 0.32].map((x, index) => <group key={x} position={[x * product.width, cabinetHeight * 0.53, frontZ]}>
      <mesh castShadow><boxGeometry args={[product.width * 0.3, cabinetHeight * 0.7, 0.018]} /><meshStandardMaterial color={cabinetColor} roughness={0.9} /></mesh>
      <mesh position={[index === 0 ? product.width * 0.105 : -product.width * 0.105, 0, 0.014]}><boxGeometry args={[0.012, cabinetHeight * 0.25, 0.018]} /><meshStandardMaterial color={woodColor} roughness={0.62} /></mesh>
    </group>)}
    <RoundedBox args={[product.width * 0.32, 0.018, product.depth * 0.52]} radius={0.025} position={[product.width * 0.22, counterY + 0.003, 0]}>
      <meshStandardMaterial color={danger ? '#91342c' : '#aaa59d'} metalness={0.3} roughness={0.4} />
    </RoundedBox>
    <RoundedBox args={[product.width * 0.26, 0.022, product.depth * 0.4]} radius={0.025} position={[product.width * 0.22, counterY + 0.014, 0]}>
      <meshStandardMaterial color={danger ? '#68251f' : '#d7d2ca'} metalness={0.12} roughness={0.3} />
    </RoundedBox>
    <group position={[product.width * 0.39, counterY + 0.08, -product.depth * 0.15]}>
      <mesh castShadow><cylinderGeometry args={[0.018, 0.022, 0.16, 18]} /><meshStandardMaterial color={danger ? '#8e3027' : '#77736d'} metalness={0.75} roughness={0.28} /></mesh>
      <mesh position={[-0.055, 0.075, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.017, 0.017, 0.11, 18]} /><meshStandardMaterial color={danger ? '#8e3027' : '#77736d'} metalness={0.75} roughness={0.28} /></mesh>
    </group>
    <mesh position={[0, 0.04, -product.depth * 0.02]} castShadow><boxGeometry args={[product.width * 0.88, 0.08, product.depth * 0.82]} /><meshStandardMaterial color={woodColor} roughness={0.84} /></mesh>
  </>
}
