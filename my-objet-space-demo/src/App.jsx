import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Scene from './Scene.jsx'
import RoomSetup from './RoomSetup.jsx'
import Landing from './Landing.jsx'
import ApartmentBackground from './ApartmentBackground.jsx'
import FloatingToolbar from './FloatingToolbar.jsx'
import { addCartItem, cartSummary, changeCartQuantity, removeCartItem } from './cart.js'
import { getProductCollision, getSceneCollisions, hasInteriorPartitionCollision } from './productCollision.js'
import { INITIAL_PRODUCTS, PRESENTATION_MARGIN, PRODUCT_BY_ID, PRODUCT_CATALOG } from './layout.js'
import { roomArea } from './roomGeometry.js'
import { furnishScannedRoom } from './scanFurnishing.js'
import { canMoveGroupWithoutCrossingPartitions, canRotateGroupWithoutCrossingPartitions, deleteStackGroup, getStackDimensions, getStackMembers, isStackableProduct, moveStackGroup, relocateGroupsFromInteriorWalls, rotateStackGroup, stackWasherDryer, unstackWasherDryer } from './stacking.js'
import './editor-enhancements.css'

const PRODUCT_GLYPHS = { dryer: '◉', 'bed-product': '▰', 'sofa-product': '▱', 'desk-product': '⌑', 'coffee-table-product': '▭', 'kitchen-counter-product': '▤' }

function scrollToSection(element, block = 'start') {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  element?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block })
}

function initialProductsForRoom(room) {
  if (room.source === 'scan-demo' || room.layout === 'two-room') return furnishScannedRoom(room)
  return INITIAL_PRODUCTS.map((item) => ({
    ...item,
    angleDegrees: 0,
    position: room.showFurniture ? { ...item.position } : findSpawnPosition(item.productId, [], room) ?? { x: 0, z: 0 },
  }))
}

function findSpawnPosition(productId, products, room) {
  // Search near the middle first; leave a colliding placement visible if the room is full.
  const fractions = [0, -0.16, 0.16, -0.32, 0.32, -0.42, 0.42]
  let fallback = null
  for (const z of fractions) {
    for (const x of fractions) {
      const position = { x: room.width * x, z: room.depth * z }
      const candidate = { id: '__candidate__', productId, position, rotation: 0, angleDegrees: 0 }
      if (hasInteriorPartitionCollision(candidate, room)) continue
      fallback ??= position
      if (!getProductCollision(candidate, products, room).colliding) return position
    }
  }
  return fallback
}

function hasFinalConsonant(word) {
  const code = word.charCodeAt(word.length - 1)
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0
}

function overlapMessage(label) {
  if (!label) return '겹침을 확인해 주세요'
  return `${label}${hasFinalConsonant(label) ? '과' : '와'} 겹쳐요`
}

function priceText(product) {
  return product.price == null ? product.priceNote : `${product.price.toLocaleString('ko-KR')}원`
}

function RotateIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.7 8.4A7.5 7.5 0 1 0 19.4 15M18.7 8.4V4m0 4.4h-4.4" /></svg>
}

function ResetIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.2V4m0 4.2h4.2M5.4 8A7.5 7.5 0 1 1 5 15.5" /></svg>
}

function TrashIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3m2 0-1 13H8L7 7m3 4v5m4-5v5" /></svg>
}

function CartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16l-1.4 10H5.4L4 8Zm4 0 2-4m6 4-2-4M9 12v3m6-3v3" /></svg>
}

function EducationNotice() {
  return <footer className="education-notice"><strong>교육용 시안</strong><span>공간 배치 결과는 참고용입니다. 실제 설치 가능 여부는 제품 규격, 반입 경로 및 설치 환경 확인 후 최종 결정됩니다.</span></footer>
}

function Catalog({ onAdd, onAddCart }) {
  const [category, setCategory] = useState('전체')
  const visibleProducts = PRODUCT_CATALOG.filter((product) => category === '전체' || product.category === category)
  return (
    <aside className="catalog-panel">
      <div className="panel-title"><span>OBJET COLLECTION &amp; FURNITURE</span><h2>공간에 추가하기</h2><p>LG 제품은 배치하고 장바구니에 담을 수 있어요. 일반 가구는 공간 배치 전용입니다.</p></div>
      <div className="catalog-filters" aria-label="제품 카테고리">
        {['전체', '세탁·건조', '냉장고', '의류관리', '가구'].map((option) => <button type="button" key={option} aria-pressed={category === option} onClick={() => setCategory(option)}>{option}</button>)}
      </div>
      <div className="catalog-list">
        {visibleProducts.map((product) => (
          <article className="catalog-card" key={product.id}>
            <div className={`catalog-visual catalog-visual--${product.id} ${product.specVerified ? 'catalog-visual--official' : ''}`}>{product.image ? <img src={product.image} alt={`${product.name} 제품 이미지`} /> : <span aria-hidden="true">{PRODUCT_GLYPHS[product.id]}</span>}</div>
            <div className="catalog-copy">
              <small>{product.category} · {product.modelNumber}</small><strong>{product.productName}</strong><span>{product.color}</span><span>{product.widthMm} × {product.heightMm} × {product.depthMm} mm{product.specVerified ? '' : ' · 시연용'}</span>{product.purchasable && <em>{priceText(product)}</em>}
            </div>
            {product.officialUrl && <a className="catalog-official-link" href={product.officialUrl} target="_blank" rel="noreferrer">LG 공식 제품 보기 ↗</a>}
            {!product.purchasable && <span className="catalog-placement-only">공간 배치 전용</span>}
            <div className={`catalog-actions ${product.purchasable ? '' : 'catalog-actions--placement'}`}>
              <button type="button" className="add-space" aria-label={`${product.productName} ${product.modelNumber} 공간에 추가`} onClick={() => onAdd(product.id)}>+ 공간에 추가</button>
              {product.purchasable && <button type="button" className="add-cart" onClick={() => onAddCart(product.id)} aria-label={`${product.shortName} 장바구니에 담기`}>담기</button>}
            </div>
          </article>
        ))}
      </div>
      <p className="catalog-note">LG 제품은 공식 사양을 참고했습니다. 일반 가구는 공간 배치용 시연 모델입니다.</p>
    </aside>
  )
}

function Cart({ cart, onQuantity, onRemove, sectionRef }) {
  const summary = cartSummary(cart, PRODUCT_BY_ID)
  return (
    <section className="cart-section" aria-label="시연용 장바구니" ref={sectionRef} tabIndex={-1}>
      <div className="section-heading"><div><span>DEMO CART</span><h3>시연용 장바구니</h3></div><b>{summary.quantity}</b></div>
      {cart.length === 0 ? <p className="empty-cart">카탈로그의 ‘담기’를 눌러<br />제품 구성을 확인해 보세요.</p> : (
        <div className="cart-items">
          {cart.map((item) => {
            const product = PRODUCT_BY_ID[item.productId]
            return (
              <div className="cart-item" key={item.productId}>
                <div className="cart-item__name"><strong title={product.name}>{product.name}</strong><span>{product.model} · {priceText(product)}</span>{product.officialUrl && <a href={product.officialUrl} target="_blank" rel="noreferrer">LG 공식 상세 ↗</a>}</div>
                <div className="quantity-control"><button type="button" aria-label={`${product.shortName} 수량 줄이기`} onClick={() => onQuantity(item.productId, -1)}>−</button><b>{item.quantity}</b><button type="button" aria-label={`${product.shortName} 수량 늘리기`} onClick={() => onQuantity(item.productId, 1)}>+</button></div>
                <button type="button" className="cart-remove" onClick={() => onRemove(item.productId)} aria-label={`${product.shortName} 삭제`}><TrashIcon /></button>
              </div>
            )
          })}
        </div>
      )}
      {cart.length > 0 && <div className="cart-total"><span>가격 상태</span><strong>{summary.unpricedQuantity > 0 ? '가격 확인 필요' : `${summary.knownTotal.toLocaleString('ko-KR')}원`}</strong><small>제품 {summary.quantity}개 · 가격 확인 필요 {summary.unpricedQuantity}개</small></div>}
      <p className="cart-disclaimer">시연용이며 주문·결제·재고 및 LG 공식몰 장바구니와 연동되지 않습니다.</p>
    </section>
  )
}

export default function App() {
  const [room, setRoom] = useState(null)
  const [editorScrollRequest, setEditorScrollRequest] = useState(0)
  const [products, setProducts] = useState([])
  const [selectedId, setSelectedId] = useState(INITIAL_PRODUCTS[0].id)
  const [dragging, setDragging] = useState(false)
  const [viewResetToken, setViewResetToken] = useState(0)
  const [cameraMode, setCameraMode] = useState('free')
  const [cart, setCart] = useState([])
  const [anchor, setAnchor] = useState(null)
  const [rotationOpen, setRotationOpen] = useState(false)
  const [moveMode, setMoveMode] = useState(false)
  const [dimensionsVisible, setDimensionsVisible] = useState(true)
  const [actionNotice, setActionNotice] = useState('')
  const nextId = useRef(1)
  const cartRef = useRef(null)
  const setupRef = useRef(null)
  const editorRef = useRef(null)
  const scenePanelRef = useRef(null)
  const selectedIdRef = useRef(selectedId)
  const productsRef = useRef(products)
  selectedIdRef.current = selectedId
  productsRef.current = products
  const collisions = useMemo(() => getSceneCollisions(products, room ?? undefined), [products, room])
  const cartQuantity = useMemo(() => cartSummary(cart, PRODUCT_BY_ID).quantity, [cart])
  const selected = products.find((item) => item.id === selectedId) ?? null
  const selectedProduct = selected ? PRODUCT_BY_ID[selected.productId] : null
  const selectedCollision = selected ? collisions[selected.id] : null
  const selectedAngle = selected ? (selected.angleDegrees ?? selected.rotation * 90) : 0
  const selectedStack = selected?.stackId ? getStackMembers(products, selected) : []
  const selectedStackDimensions = selected?.stackId ? getStackDimensions(products, selected) : null
  const stackable = selectedProduct ? isStackableProduct(selectedProduct.id) : false

  useEffect(() => {
    if (!editorScrollRequest) return undefined
    const frame = window.requestAnimationFrame(() => scrollToSection(editorRef.current))
    return () => window.cancelAnimationFrame(frame)
  }, [editorScrollRequest])

  useEffect(() => {
    const panel = scenePanelRef.current
    if (!panel) return undefined
    const keepCanvasWheel = (event) => {
      if (event.target instanceof HTMLCanvasElement) event.preventDefault()
    }
    panel.addEventListener('wheel', keepCanvasWheel, { passive: false })
    return () => panel.removeEventListener('wheel', keepCanvasWheel)
  }, [room])

  const selectProduct = useCallback((id) => {
    if (selectedIdRef.current !== id) {
      setRotationOpen(false)
      setMoveMode(false)
      setAnchor(null)
      setActionNotice('')
    }
    setSelectedId(id)
  }, [])

  const createRoom = (nextRoom) => {
    let roomNotice = ''
    if (!room) {
      const initial = initialProductsForRoom(nextRoom)
      setProducts(initial)
      selectProduct(nextRoom.source === 'scan-demo' || nextRoom.layout === 'two-room' ? null : initial[0]?.id ?? null)
    } else {
      const relocation = relocateGroupsFromInteriorWalls(products, nextRoom)
      if (!relocation.success) {
        setActionNotice('새 공간의 내부 벽을 피할 자리가 없어요. 제품을 정리한 뒤 공간을 변경해 주세요.')
        setEditorScrollRequest((value) => value + 1)
        return
      }
      const nextProducts = nextRoom.source === 'scan-demo' || nextRoom.layout === 'two-room'
        ? furnishScannedRoom(nextRoom, relocation.products) : relocation.products
      setProducts(nextProducts)
      if (relocation.movedIds.length) roomNotice = '새 공간의 내부 벽과 겹치는 제품 위치를 조정했어요.'
    }
    setRoom(nextRoom)
    setEditorScrollRequest((value) => value + 1)
    setCameraMode('free')
    setViewResetToken((value) => value + 1)
    setActionNotice(roomNotice)
  }

  const addProduct = (productId) => {
    const position = findSpawnPosition(productId, products, room)
    if (!position) {
      setActionNotice('내부 벽을 피해서 제품을 놓을 자리가 없어요. 공간을 정리해 주세요.')
      return
    }
    const instance = { id: `${productId}-${nextId.current++}`, productId, position, rotation: 0, angleDegrees: 0 }
    setProducts((items) => [...items, instance]); selectProduct(instance.id)
  }
  const moveProduct = (id, position) => {
    if (!canMoveGroupWithoutCrossingPartitions(productsRef.current, id, position, room)) {
      setActionNotice('내부 벽은 통과할 수 없어요. 출입구를 통해 이동해 주세요.')
      return
    }
    setActionNotice('')
    setProducts((items) => canMoveGroupWithoutCrossingPartitions(items, id, position, room) ? moveStackGroup(items, id, position) : items)
  }
  const setSelectedAngle = (angle) => {
    if (!canRotateGroupWithoutCrossingPartitions(productsRef.current, selectedId, angle, room)) {
      setActionNotice('내부 벽과 겹치지 않도록 제품을 옮긴 뒤 회전해 주세요.')
      return
    }
    setActionNotice('')
    setProducts((items) => canRotateGroupWithoutCrossingPartitions(items, selectedId, angle, room) ? rotateStackGroup(items, selectedId, angle) : items)
  }
  const rotateSelected = () => setSelectedAngle((selectedAngle + 90) % 360)
  const deleteSelected = () => {
    if (!selectedId) return
    const next = deleteStackGroup(products, selectedId)
    setProducts(next)
    selectProduct(next[0]?.id ?? null)
  }
  const resetSpace = () => {
    setProducts(initialProductsForRoom(room))
    selectProduct(room.source === 'scan-demo' || room.layout === 'two-room' ? null : INITIAL_PRODUCTS[0].id)
    setActionNotice('')
  }
  const nudgeSelected = ({ x, z }) => {
    if (!selected) return
    const clamp = (value, size) => Math.max(-size / 2 - PRESENTATION_MARGIN, Math.min(size / 2 + PRESENTATION_MARGIN, value))
    moveProduct(selected.id, { x: clamp(selected.position.x + x, room.width), z: clamp(selected.position.z + z, room.depth) })
  }
  const addSelectedToCart = () => {
    if (selectedProduct?.purchasable) setCart((items) => addCartItem(items, selectedProduct.id))
  }
  const addStackToCart = () => setCart((items) => selectedStack.reduce((cartItems, member) => addCartItem(cartItems, member.productId), items))
  const toggleStack = () => {
    if (!selected || !stackable) return
    if (selected.stackId) {
      const result = unstackWasherDryer(products, selectedId, room)
      if (result.reason === 'no-space') {
        setActionNotice('직렬 배치를 해제할 자리가 없어요. 주변을 비운 뒤 다시 시도해 주세요.')
        return
      }
      setProducts(result.products)
      setActionNotice('직렬 배치를 해제했어요. 두 제품을 각각 움직일 수 있습니다.')
      return
    }
    const result = stackWasherDryer(products, selectedId)
    const members = result.stackId ? getStackMembers(result.products, selectedId) : []
    const existingPartner = members.find((member) => member.id !== selectedId && products.some((item) => item.id === member.id))
    if (existingPartner && !canMoveGroupWithoutCrossingPartitions(products, existingPartner.id, selected.position, room)) {
      setActionNotice('다른 제품이 내부 벽 건너편에 있어요. 출입구를 통해 가까이 옮겨 주세요.')
      return
    }
    if (members.some((member) => hasInteriorPartitionCollision(member, room))) {
      setActionNotice('내부 벽을 피해서 제품을 옮긴 뒤 직렬 배치해 주세요.')
      return
    }
    setProducts(result.products)
    setActionNotice('직렬 배치 시연입니다. 실제 설치 호환성은 LG 공식 설치 상담을 통해 확인해 주세요.')
  }

  return (
    <main className="experience">
      <ApartmentBackground />
      <Landing onStart={() => scrollToSection(setupRef.current)} />
      <div className="experience-setup" ref={setupRef}>
        <RoomSetup onCreate={createRoom} onCancel={room ? () => scrollToSection(editorRef.current) : undefined} />
        {!room && <EducationNotice />}
      </div>
      {room && <section className="experience-editor" ref={editorRef} aria-label="3D 공간 편집">
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">O</span><div><h1>My Objet Space</h1><p>나의 공간에 오브제를 놓아보세요</p></div></div>
        <div className="header-meta"><button className="change-room" type="button" onClick={() => scrollToSection(setupRef.current)}>공간 변경</button><span>{products.length}개 배치됨</span><button className="header-cart" type="button" aria-label={`장바구니 제품 ${cartQuantity}개 보기`} onClick={() => { scrollToSection(cartRef.current, 'nearest'); cartRef.current?.focus({ preventScroll: true }) }}><CartIcon /><span>장바구니</span><b aria-hidden="true">{cartQuantity}</b></button><div className="project-chip"><span className="project-chip__dot" />{room.label}</div></div>
      </header>
      <section className="workspace workspace--catalog" aria-label="3D 공간 배치 도구">
        <Catalog onAdd={addProduct} onAddCart={(id) => setCart((items) => addCartItem(items, id))} />
        <div className="scene-panel" ref={scenePanelRef}>
          <Scene room={room} cameraMode={cameraMode} products={products} collisions={collisions} selectedId={selectedId} dragging={dragging} resetToken={viewResetToken} dimensionsVisible={dimensionsVisible} onSelect={selectProduct} onMove={moveProduct} onDraggingChange={setDragging} onAnchorChange={setAnchor} />
          {selectedProduct && <FloatingToolbar anchor={anchor} product={selectedProduct} angle={selectedAngle} cartQuantity={cartQuantity} rotationOpen={rotationOpen} moveMode={moveMode} dimensionsVisible={dimensionsVisible} stackable={stackable} stacked={Boolean(selected?.stackId)} onToggleStack={toggleStack} onToggleDimensions={() => setDimensionsVisible((value) => !value)} onToggleRotation={() => { setRotationOpen((value) => !value); setMoveMode(false) }} onToggleMove={() => { setMoveMode((value) => !value); setRotationOpen(false) }} onSetAngle={setSelectedAngle} onNudge={nudgeSelected} onCart={addSelectedToCart} onDelete={deleteSelected} />}
          <div className="scene-hint" aria-hidden="true"><span>↔</span>{moveMode ? '제품을 드래그해 이동하세요' : selectedProduct ? `${selectedProduct.shortName} 선택됨` : '제품을 선택해 보세요'}</div>
          <div className="view-controls"><span><i className="mouse-icon" /> 드래그: 공간 회전</span><span><i className="wheel-icon" /> 휠: 확대 · 축소</span></div>
          <div className="camera-controls" aria-label="카메라 시점">
            {[['top', '상단뷰'], ['side', '사이드뷰'], ['free', '자유 시점']].map(([mode, label]) => <button type="button" key={mode} aria-pressed={cameraMode === mode} onClick={() => { setCameraMode(mode); setViewResetToken((value) => value + 1) }}>{label}</button>)}
          </div>
        </div>
        <aside className="control-panel">
          <p className="journey-guide">공간 선택 → 제품 배치 → 겹침 확인 → 장바구니 · 제품 상세</p>
          {room.source === 'scan-demo' && <div className="scan-room-summary" aria-label="스캔된 공간 정보"><strong>스캔된 공간</strong><span>{Number(room.width.toFixed(3))}m × {Number(room.depth.toFixed(3))}m · {roomArea(room).toFixed(1)}㎡</span><small>공간과 가구는 스캔 시연 예시입니다</small></div>}
          {actionNotice && <p className="stack-notice" role="status">{actionNotice}</p>}
          {selectedProduct ? <>
            <div className="product-heading"><span className="eyebrow">SELECTED OBJECT</span><h2>{selectedProduct.name}</h2><span className="model-name">{selectedProduct.model} · {selectedProduct.color}</span></div>
            <div className={`status-card ${selectedCollision.colliding ? 'status-card--danger' : ''}`} role="status" aria-live="polite"><span className="status-dot" /><div><strong>{selectedCollision.colliding ? overlapMessage(selectedCollision.label) : '겹침 없음'}</strong><p>{selectedCollision.colliding ? '제품을 움직이거나 회전해 보세요.' : '시각적 배치 참고용 상태입니다.'}</p></div></div>
            <div className="spec-grid"><div><span>너비</span><strong>{Math.round(selectedProduct.width * 1000)} mm</strong></div><div><span>높이</span><strong>{Math.round(selectedProduct.height * 1000)} mm</strong></div><div><span>깊이</span><strong>{Math.round(selectedProduct.depth * 1000)} mm</strong></div></div>
            {selectedStackDimensions && <section className="stack-info" aria-label="직렬 배치 시연 정보"><strong>직렬 배치 시연</strong><p>세탁기 아래 · 건조기 위</p><ul>{selectedStack.map((member) => { const product = PRODUCT_BY_ID[member.productId]; return <li key={member.id}>{product.shortName} {product.widthMm} × {product.heightMm} × {product.depthMm} mm</li> })}</ul><p className="stack-dimensions">조합 외곽 {selectedStackDimensions.widthMm} × {selectedStackDimensions.bodyHeightMm} × {selectedStackDimensions.depthMm} mm</p><p>본체 높이의 합이며 스태킹 키트·설치 부품은 포함하지 않습니다. 실제 호환성 및 설치 가능 여부는 LG 공식 설치 상담으로 확인해 주세요.</p><button type="button" className="stack-action" onClick={addStackToCart}>조합 두 제품 장바구니 담기</button></section>}
            {!selectedProduct.specVerified && <p className="demo-spec-note">가구 규격은 시연을 위한 임시 크기입니다.</p>}
            {selectedProduct.specVerified && <div className="dryer-info product-details"><strong>LG 공식 제품 정보</strong><dl><div><dt>용량</dt><dd>{selectedProduct.capacity}</dd></div><div><dt>색상</dt><dd>{selectedProduct.color}</dd></div><div><dt>도어 열림 시 깊이</dt><dd>{selectedProduct.doorOpenDepthMm == null ? '공식 정보 미확인' : `${selectedProduct.doorOpenDepthMm.toLocaleString('ko-KR')} mm`}</dd></div>{selectedProduct.doorDirection && <div><dt>도어 방향</dt><dd>{selectedProduct.doorDirection}</dd></div>}</dl><p>3D 모델은 실제 규격 비율을 적용한 단순화된 외관입니다.</p><a href={selectedProduct.officialProductUrl} target="_blank" rel="noreferrer">LG 공식 제품 상세 보기 ↗</a></div>}
            <div className="control-group"><span className="control-label">선택 제품 조작</span><button className="primary-action" type="button" onClick={rotateSelected}><RotateIcon />오른쪽으로 90° 회전<span className="rotation-value">{selectedAngle}°</span></button><button className="free-rotation-toggle" type="button" aria-expanded={rotationOpen} onClick={() => { setRotationOpen((value) => !value); setMoveMode(false) }}>자유 회전 {rotationOpen ? '닫기' : '열기'}</button><button className="free-rotation-toggle" type="button" aria-pressed={dimensionsVisible} onClick={() => setDimensionsVisible((value) => !value)}>치수 {dimensionsVisible ? '숨기기' : '보기'}</button>{stackable && <button type="button" className="stack-action" onClick={toggleStack}>{selected.stackId ? '직렬 배치 해제' : selected.productId === 'washer' ? '건조기 직렬 배치' : '세탁기 직렬 배치'}</button>}{rotationOpen && !anchor?.visible && <div className="panel-rotation-fallback"><label className="angle-control"><span>자유 회전 <strong>{selectedAngle}°</strong></span><input type="range" min="0" max="360" step="1" value={selectedAngle} aria-label="제품 자유 회전 각도" aria-valuetext={`${selectedAngle}도`} onChange={(event) => setSelectedAngle(Number(event.target.value))} /></label><div className="floating-rotation__presets">{[0, 90, 180, 270].map((value) => <button type="button" key={value} aria-pressed={selectedAngle === value} onClick={() => setSelectedAngle(value)}>{value}°</button>)}</div></div>}<div className="secondary-actions"><button type="button" onClick={deleteSelected}><TrashIcon />{selected.stackId ? '조합 배치 삭제' : '배치 삭제'}</button>{selectedProduct.purchasable ? <button type="button" onClick={addSelectedToCart}>+ 장바구니 담기</button> : <span className="placement-only-note">공간 배치 전용 가구</span>}</div></div>
          </> : <div className="empty-selection"><span>+</span><h2>제품을 선택하세요</h2><p>왼쪽 카탈로그에서 공간에 제품을 추가할 수 있습니다.</p></div>}
          <div className="space-actions"><button type="button" onClick={resetSpace}><ResetIcon />기본 공간 복원</button><button type="button" onClick={() => setViewResetToken((value) => value + 1)}>시점 초기화</button></div>
          <Cart sectionRef={cartRef} cart={cart} onQuantity={(id, delta) => setCart((items) => changeCartQuantity(items, id, delta))} onRemove={(id) => setCart((items) => removeCartItem(items, id))} />
          <p className="disclaimer">문 열림 가이드는 공식 깊이의 전방 참고 표시이며 실제 도어 궤적이나 설치 여유 공간이 아닙니다. 겹침 판정은 설치 이격 거리, 전원·배수 및 반입 경로를 확인하지 않으며 실제 설치 가능 여부를 판단하지 않습니다.</p>
        </aside>
      </section>
      <EducationNotice />
    </div>
      </section>}
    </main>
  )
}
