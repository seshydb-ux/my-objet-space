import { useLayoutEffect, useRef, useState } from 'react'

const NUDGES = {
  ArrowLeft: { x: -0.1, z: 0 },
  ArrowRight: { x: 0.1, z: 0 },
  ArrowUp: { x: 0, z: -0.1 },
  ArrowDown: { x: 0, z: 0.1 },
}

function Icon({ name }) {
  const paths = {
    cart: <><path d="M4 8h16l-1.4 10H5.4L4 8Zm4 0 2-4m6 4-2-4" /><path d="M9 12v3m6-3v3" /></>,
    rotate: <><path d="M19 8a7 7 0 1 0 .3 7M19 8V4m0 4h-4" /></>,
    move: <><path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" /></>,
    dimensions: <><path d="M4 16 16 4l4 4L8 20l-4-4Z" /><path d="m11 9 2 2m-5 1 2 2m4-8 2 2" /></>,
    delete: <><path d="M5 7h14M9 7V4h6v3m2 0-1 13H8L7 7m3 4v5m4-5v5" /></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

export default function FloatingToolbar({ anchor, product, angle, cartQuantity, rotationOpen, moveMode, dimensionsVisible, onToggleDimensions, onToggleRotation, onToggleMove, onSetAngle, onNudge, onCart, onDelete }) {
  const toolbarRef = useRef(null)
  const [box, setBox] = useState({ width: 300, height: 74 })

  useLayoutEffect(() => {
    const element = toolbarRef.current
    if (!element) return undefined
    const measure = () => {
      const rect = element.getBoundingClientRect()
      setBox((previous) => Math.abs(previous.width - rect.width) > 1 || Math.abs(previous.height - rect.height) > 1 ? { width: rect.width, height: rect.height } : previous)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [rotationOpen, moveMode, anchor?.visible])

  if (!anchor?.visible) return null
  const left = Math.max(8, Math.min(anchor.x - box.width / 2, Math.max(8, anchor.width - box.width - 8)))
  const above = anchor.y - box.height - 14
  const top = Math.max(8, Math.min(above >= 54 ? above : anchor.y + 18, Math.max(8, anchor.height - box.height - 8)))

  const handleMoveKey = (event) => {
    if (!moveMode) return
    if (NUDGES[event.key]) {
      event.preventDefault()
      onNudge(NUDGES[event.key])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onToggleMove()
    }
  }

  return (
    <div className="floating-toolbox" ref={toolbarRef} style={{ left, top }} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      {rotationOpen && <div className="floating-rotation" aria-label="제품 회전 설정">
        <div className="floating-rotation__heading"><span>제품 회전</span><strong>{angle}°</strong></div>
        <input type="range" min="0" max="360" step="1" value={angle} aria-label="제품 자유 회전 각도" aria-valuetext={`${angle}도`} onChange={(event) => onSetAngle(Number(event.target.value))} />
        <div className="floating-rotation__presets">{[0, 90, 180, 270].map((value) => <button type="button" key={value} aria-pressed={angle === value} onClick={() => onSetAngle(value)}>{value}°</button>)}</div>
      </div>}
      <div className="floating-actions" role="toolbar" aria-label={`${product.shortName} 조작 도구`}>
        <button type="button" onClick={onCart} disabled={!product.purchasable} title={product.purchasable ? '장바구니에 담기' : '시연용 가구는 장바구니에 담을 수 없습니다'} aria-label={`${product.shortName} 장바구니 담기`}>
          <span className="floating-icon"><Icon name="cart" />{product.purchasable && cartQuantity > 0 && <i aria-hidden="true">{cartQuantity}</i>}</span><span>담기</span>
        </button>
        <button type="button" onClick={onToggleRotation} aria-pressed={rotationOpen} aria-expanded={rotationOpen} aria-label="회전 도구"><Icon name="rotate" /><span>회전</span></button>
        <button type="button" onClick={onToggleMove} onKeyDown={handleMoveKey} aria-pressed={moveMode} aria-label="이동 도구"><Icon name="move" /><span>이동</span></button>
        <button type="button" onClick={onToggleDimensions} aria-pressed={dimensionsVisible} aria-label="치수 보기"><Icon name="dimensions" /><span>치수 보기</span></button>
        <button type="button" onClick={onDelete} aria-label={`${product.shortName} 배치 삭제`}><Icon name="delete" /><span>삭제</span></button>
      </div>
      {moveMode && <p className="floating-move-hint">제품을 드래그하거나 이동 버튼에서 방향키로 옮기세요.</p>}
    </div>
  )
}
