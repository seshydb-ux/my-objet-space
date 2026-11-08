import { useRef, useState } from 'react'
import { cloneRoom, isValidRoom, roomArea, roomValidationErrors, ROOM_LIMITS_MM, ROOM_TEMPLATES } from './roomGeometry.js'
import RoomScan from './RoomScan.jsx'
import './roomSetup.css'

const WALLS = [
  ['front', '앞쪽'], ['back', '뒤쪽'], ['left', '왼쪽'], ['right', '오른쪽'],
]

function formatArea(room) {
  return `${roomArea(room).toFixed(1)}㎡`
}

function MenuIcon({ type }) {
  return <span className={`room-setup__icon room-setup__icon--${type}`} aria-hidden="true" />
}

export default function RoomSetup({ onCreate, onCancel }) {
  const [mode, setMode] = useState('home')
  const homeRef = useRef(null)
  const detailRef = useRef(null)
  const [form, setForm] = useState({
    shape: 'rectangle', width: '5500', depth: '3600', height: '2650',
    doorWall: 'front', doorOffset: '72', windowWall: 'back', windowOffset: '22',
  })

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const room = {
    shape: form.shape,
    width: Number(form.width) / 1000,
    depth: Number(form.depth) / 1000,
    height: Number(form.height) / 1000,
    door: { wall: form.doorWall, offset: Number(form.doorOffset) / 100 },
    window: { wall: form.windowWall, offset: Number(form.windowOffset) / 100 },
    showFurniture: false,
    label: `직접 만든 ${form.shape === 'l' ? 'L자형' : '직사각형'} 공간`,
    partitions: [],
  }
  const valid = isValidRoom(room)
  const validationMessage = roomValidationErrors(room)[0]

  const chooseTemplate = (template) => onCreate(cloneRoom(template))
  const submit = (event) => {
    event.preventDefault()
    if (valid) onCreate(room)
  }

  const scrollTo = (ref) => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
    }))
  }
  const openMode = (nextMode) => {
    setMode(nextMode)
    scrollTo(detailRef)
  }
  const returnHome = () => {
    setMode('home')
    scrollTo(homeRef)
  }

  return (
    <div className="room-setup">
      <section className="room-setup__stage room-setup__stage--home" ref={homeRef}>
        <header className="room-setup__header">
          <div className="room-setup__brand"><span>O</span><strong>My Objet Space</strong></div>
          {onCancel ? <button className="room-setup__cancel" type="button" onClick={onCancel}>편집으로 돌아가기</button> : <p>공간을 먼저 정하면, 실제 비율에 맞춰 오브제를 배치할 수 있어요.</p>}
        </header>

        <div className="room-setup__hero">
          <span className="room-setup__eyebrow">START YOUR SPACE</span>
          <h1>내 공간에 건조기를<br />먼저 놓아보세요</h1>
          <p>방을 선택하고 LG 제품과 가구를 배치해 겹침을 확인한 뒤, 장바구니와 제품 상세에서 구매를 이어가세요.</p>
        </div>

        <p className="room-setup__journey">① 공간 선택 <span>→</span> ② 제품 배치 <span>→</span> ③ 겹침 확인 <span>→</span> ④ 장바구니 · 제품 상세</p>

        <section className="room-setup__menu" aria-label="공간 시작 방법">
          <button type="button" onClick={() => openMode('templates')}>
            <MenuIcon type="template" /><span><b>공간 선택하기</b><small>원룸 · 1.5룸 · 투룸 템플릿</small></span><i>→</i>
          </button>
          <button type="button" onClick={() => openMode('custom')}>
            <MenuIcon type="measure" /><span><b>직접 공간 만들기</b><small>방 형태와 실측 크기 입력</small></span><i>→</i>
          </button>
          <button type="button" onClick={() => openMode('scan')}>
            <MenuIcon type="scan" /><span><b>내 공간 스캔하기</b><small>카메라 또는 데모로 체험하는 스캔 시뮬레이션</small></span><i>→</i>
          </button>
        </section>
      </section>

      {mode === 'templates' && (
        <section className="room-setup__stage room-setup__stage--detail room-setup__section" ref={detailRef}>
          <button className="room-setup__back" type="button" onClick={returnHome}>← 시작 메뉴</button>
          <div className="room-setup__section-title"><h2>공간 템플릿</h2><p>발표용 개략 평면으로, 현장 실측 구조와는 다를 수 있습니다.</p></div>
          <div className="room-setup__templates">
            {ROOM_TEMPLATES.map((template, index) => (
              <button type="button" key={template.label} onClick={() => chooseTemplate(template)}>
                <span className={`room-setup__floorplan room-setup__floorplan--${template.shape} ${template.layout === 'two-room' ? 'room-setup__floorplan--two-room' : ''}`} aria-hidden="true" />
                {template.recommended && <span className="room-setup__recommend">가전 배치 시연 추천</span>}
                <small>{index === 0 ? 'ORIGINAL' : 'CONCEPT'}</small>
                <b>{template.label}</b>
                <p>{template.description ?? '기존 가구가 배치된 6평 원룸'}</p>
                <em>{Math.round(template.width * 1000)} × {Math.round(template.depth * 1000)} mm · {formatArea(template)}</em>
              </button>
            ))}
          </div>
        </section>
      )}

      {mode === 'custom' && (
        <section className="room-setup__stage room-setup__stage--detail room-setup__section room-setup__section--form" ref={detailRef}>
          <button className="room-setup__back" type="button" onClick={returnHome}>← 시작 메뉴</button>
          <div className="room-setup__section-title"><h2>직접 공간 만들기</h2><p>실측값을 mm 단위로 입력해 주세요.</p></div>
          <form className="room-setup__form" onSubmit={submit}>
            <fieldset><legend>방 형태</legend><div className="room-setup__shape-options">
              <label><input type="radio" name="shape" value="rectangle" checked={form.shape === 'rectangle'} onChange={update('shape')} /><span className="room-setup__shape-preview" />직사각형</label>
              <label><input type="radio" name="shape" value="l" checked={form.shape === 'l'} onChange={update('shape')} /><span className="room-setup__shape-preview room-setup__shape-preview--l" />L자형</label>
            </div></fieldset>
            <fieldset><legend>실측 크기</legend><div className="room-setup__dimensions">
              {['width', 'depth', 'height'].map((key) => <label key={key}><span>{{ width: '가로', depth: '세로', height: '높이' }[key]}</span><div><input type="number" value={form[key]} onChange={update(key)} min={ROOM_LIMITS_MM[key].min} max={ROOM_LIMITS_MM[key].max} step="10" required /><b>mm</b></div></label>)}
            </div>{form.shape === 'l' && <p className="room-setup__field-note">L자형은 우측 뒤쪽 40%가 비어 있는 형태로 생성됩니다. 가로·세로 3,600mm 이상이 필요합니다.</p>}</fieldset>
            <fieldset><legend>문과 창문</legend><div className="room-setup__openings">
              <label><span>문 위치</span><select value={form.doorWall} onChange={update('doorWall')}>{WALLS.map(([value, label]) => <option key={value} value={value}>{label} 벽</option>)}</select><input aria-label="문 위치 비율" type="range" min="12" max="88" value={form.doorOffset} onChange={update('doorOffset')} /><small>{form.doorOffset}%</small></label>
              <label><span>창문 위치</span><select value={form.windowWall} onChange={update('windowWall')}>{WALLS.map(([value, label]) => <option key={value} value={value}>{label} 벽</option>)}</select><input aria-label="창문 위치 비율" type="range" min="12" max="88" value={form.windowOffset} onChange={update('windowOffset')} /><small>{form.windowOffset}%</small></label>
            </div><p className="room-setup__field-note">위치 비율은 앞·뒤 벽은 왼쪽부터, 좌·우 벽은 뒤쪽부터 측정합니다. 문·창 크기는 시연용 기본값입니다.</p></fieldset>
            <div className="room-setup__form-footer"><span>{valid ? `${formatArea(room)} · 실제 비율로 생성` : validationMessage}</span><button type="submit" disabled={!valid}>3D 공간 만들기 →</button></div>
          </form>
        </section>
      )}

      {mode === 'scan' && (
        <section className="room-setup__stage room-setup__stage--detail room-setup__scan" ref={detailRef}>
          <RoomScan onCreate={onCreate} onBack={returnHome} />
        </section>
      )}

    </div>
  )
}
