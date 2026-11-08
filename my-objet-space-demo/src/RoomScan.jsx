import { useEffect, useMemo, useRef, useState } from 'react'
import { roomValidationErrors } from './roomGeometry.js'
import {
  acquireCameraStream,
  cameraErrorMessage,
  DEFAULT_SCAN_FORM,
  makeScannedRoom,
  SCAN_DURATION_MS,
  scanAreaLabel,
  scanStageLabel,
  stopMediaStream,
} from './roomScan.js'
import './roomScan.css'

const INITIAL_FORM = { ...DEFAULT_SCAN_FORM }

function ScanVisual({ cameraActive, videoRef }) {
  return (
    <div className={`room-scan-viewport ${cameraActive ? 'is-camera' : 'is-demo'}`} aria-label="공간 스캔 시뮬레이션 화면">
      {cameraActive ? (
        <video ref={videoRef} className="room-scan-video" muted playsInline autoPlay aria-label="카메라 미리보기" />
      ) : (
        <div className="room-scan-demo-room" aria-hidden="true">
          <span className="demo-wall demo-wall-left" />
          <span className="demo-wall demo-wall-right" />
          <span className="demo-floor" />
        </div>
      )}
      <div className="room-scan-frame" aria-hidden="true">
        <i className="scan-corner top-left" />
        <i className="scan-corner top-right" />
        <i className="scan-corner bottom-left" />
        <i className="scan-corner bottom-right" />
        <i className="scan-point point-one" />
        <i className="scan-point point-two" />
        <i className="scan-point point-three" />
        <i className="scan-point point-four" />
        <span className="room-scan-line" />
      </div>
    </div>
  )
}

export default function RoomScan({ onCreate, onBack }) {
  const [phase, setPhase] = useState('choice')
  const [scanMode, setScanMode] = useState('demo')
  const [progress, setProgress] = useState(0)
  const [scanSession, setScanSession] = useState(0)
  const [cameraStatus, setCameraStatus] = useState('idle')
  const [cameraMessage, setCameraMessage] = useState('')
  const [form, setForm] = useState(INITIAL_FORM)
  const videoRef = useRef(null)
  const pageRef = useRef(null)
  const streamRef = useRef(null)
  const mountedRef = useRef(true)
  const cameraRequestRef = useRef(0)

  const room = useMemo(() => makeScannedRoom(form), [form])
  const validationErrors = useMemo(() => {
    const errors = roomValidationErrors(room)
    if (room.width < 4.8 || room.depth < 4.2) errors.unshift('투룸 시연 공간은 가로 4,800mm, 세로 4,200mm 이상으로 입력해 주세요.')
    return errors
  }, [room])
  const isValid = validationErrors.length === 0

  function stopCamera() {
    cameraRequestRef.current += 1
    stopMediaStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    if (mountedRef.current) setCameraStatus('idle')
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      cameraRequestRef.current += 1
      stopMediaStream(streamRef.current)
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => {
    if (phase !== 'scanning') return undefined
    const startedAt = Date.now()
    const interval = window.setInterval(() => {
      const nextProgress = Math.min(100, Math.round(((Date.now() - startedAt) / SCAN_DURATION_MS) * 100))
      setProgress(nextProgress)
      if (nextProgress >= 100) {
        window.clearInterval(interval)
        stopCamera()
        setPhase('result')
      }
    }, 80)
    return () => window.clearInterval(interval)
  }, [phase, scanSession])

  useEffect(() => {
    if (cameraStatus !== 'active' || !streamRef.current || !videoRef.current) return undefined
    const video = videoRef.current
    video.srcObject = streamRef.current
    const playResult = video.play()
    playResult?.catch?.(() => {
      if (mountedRef.current) setCameraMessage('카메라 미리보기를 자동 재생하지 못했지만 스캔 데모는 계속 진행됩니다.')
    })
    return () => {
      if (video.srcObject === streamRef.current) video.srcObject = null
    }
  }, [cameraStatus, phase])

  useEffect(() => {
    if (cameraStatus === 'idle' || !pageRef.current) return undefined
    const stopWhenAway = () => {
      stopCamera()
      setPhase('choice')
      setCameraMessage('스캔 화면을 벗어나 카메라를 종료했어요.')
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) stopWhenAway()
    })
    const onVisibilityChange = () => {
      if (document.hidden) stopWhenAway()
    }
    observer.observe(pageRef.current)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [cameraStatus, phase])

  function beginScan(mode) {
    if (mode === 'demo') stopCamera()
    setScanMode(mode)
    setProgress(0)
    setScanSession((value) => value + 1)
    setPhase('scanning')
  }

  async function beginCameraScan() {
    setCameraMessage('')
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraMessage('이 브라우저에서는 카메라를 사용할 수 없어요. 데모 모드로 체험해 주세요.')
      return
    }
    stopCamera()
    const requestId = cameraRequestRef.current
    setCameraStatus('requesting')
    const result = await acquireCameraStream(
      navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices),
      () => mountedRef.current && cameraRequestRef.current === requestId,
    )
    if (!mountedRef.current || result.status === 'stale') return
    if (result.status === 'error') {
      setCameraStatus('idle')
      setCameraMessage(cameraErrorMessage(result.error))
      return
    }
    streamRef.current = result.stream
    setCameraStatus('active')
    beginScan('camera')
  }

  function finishScan() {
    stopCamera()
    setProgress(100)
    setPhase('result')
  }

  function restartScan() {
    stopCamera()
    setProgress(0)
    setForm({ ...DEFAULT_SCAN_FORM })
    setCameraMessage('')
    setPhase('choice')
  }

  function goBack() {
    stopCamera()
    onBack?.()
  }

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function createRoom() {
    if (!isValid) return
    stopCamera()
    onCreate?.(room)
  }

  if (phase === 'choice') {
    return (
      <div className="room-scan-page" ref={pageRef}>
        <header className="room-scan-header">
          <button type="button" className="room-scan-back" onClick={goBack} aria-label="이전 화면으로 이동">←</button>
          <span>내 공간 스캔하기</span>
        </header>
        <section className="room-scan-intro">
          <span className="room-scan-kicker">MY OBJET SPACE</span>
          <h1>공간을 둘러보고<br />3D 룸을 만들어 보세요.</h1>
          <p>카메라 화면 위에 스캔 과정을 시뮬레이션하거나, 카메라 없이 데모를 체험할 수 있어요.</p>
          <div className="room-scan-notice" role="note">
            <strong>공간 스캔 시연 기능</strong>
            <span>실제 센서 측정이나 설치 가능 판정이 아니며, 결과에는 시연용 추정값이 사용됩니다.</span>
          </div>
          <div className="room-scan-actions">
            <button type="button" className="scan-button primary" onClick={beginCameraScan} disabled={cameraStatus === 'requesting'}>
              <span className="button-icon">⌾</span>
              {cameraStatus === 'requesting' ? '카메라 연결 중…' : '카메라로 스캔'}
            </button>
            <button type="button" className="scan-button secondary" onClick={() => beginScan('demo')}>데모 모드로 체험</button>
          </div>
          {cameraMessage && <p className="room-scan-camera-message" role="status">{cameraMessage}</p>}
          <p className="room-scan-permission">카메라는 버튼을 누른 경우에만 요청하며, 스캔 화면을 나가면 즉시 종료됩니다.</p>
        </section>
      </div>
    )
  }

  if (phase === 'scanning') {
    return (
      <div className="room-scan-page scanning-page" ref={pageRef}>
        <header className="room-scan-header overlay-header">
          <button type="button" className="room-scan-back" onClick={restartScan} aria-label="스캔 취소">×</button>
          <span>{scanMode === 'camera' ? '카메라 스캔' : '데모 스캔'}</span>
        </header>
        <section className="room-scan-progress-screen">
          <ScanVisual cameraActive={cameraStatus === 'active'} videoRef={videoRef} />
          <div className="scan-progress-card">
            <div className="scan-progress-heading">
              <div><span>공간 분석 중</span><strong aria-live="polite">{scanStageLabel(progress)}</strong></div>
              <b>{progress}%</b>
            </div>
            <div className="scan-progress-track" role="progressbar" aria-label="스캔 시뮬레이션 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
            <p>{scanMode === 'camera' ? '휴대폰을 천천히 움직이며 바닥과 벽을 비춰주세요.' : '카메라 없이 예시 공간을 분석하는 과정을 보여드려요.'}</p>
            {cameraMessage && <p className="room-scan-camera-message" role="status">{cameraMessage}</p>}
            <button type="button" className="scan-skip" onClick={finishScan}>건너뛰기</button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="room-scan-page result-page" ref={pageRef}>
      <header className="room-scan-header">
        <button type="button" className="room-scan-back" onClick={restartScan} aria-label="다시 스캔하기">←</button>
        <span>공간 분석 결과</span>
      </header>
      <section className="room-scan-result">
        <div className="scan-result-title">
          <span className="result-check" aria-hidden="true">✓</span>
          <div><span className="room-scan-kicker">스캔 완료</span><h1>공간 정보를 확인해 주세요.</h1></div>
        </div>
        <p className="result-disclaimer">공간 스캔 데모 데이터 · 시연용 추정값이며 실제 측정값이 아닙니다.</p>

        <fieldset className="scan-shape-fieldset">
          <legend>외곽 형태</legend>
          <label><input type="radio" name="shape" value="rectangle" checked={form.shape === 'rectangle'} onChange={updateField} /><span>직사각형</span></label>
          <label><input type="radio" name="shape" value="l" checked={form.shape === 'l'} onChange={updateField} /><span>L자형</span></label>
        </fieldset>

        <div className="scan-result-layout">
          <div className={`scan-floorplan ${form.shape === 'l' ? 'scan-floorplan--l' : ''}`} role="img" aria-label="침실과 거실 주방, 현관, 가전 배치 공간으로 나뉜 투룸 평면도 예시">
            <div className="scan-floorplan__bedroom"><strong>침실</strong><span>창문</span></div>
            <div className="scan-floorplan__living"><strong>거실 · 주방</strong><span className="scan-floorplan__window">창문</span><span className="scan-floorplan__appliance">가전 배치 공간</span><span className="scan-floorplan__entry">현관</span></div>
            <i className="scan-floorplan__inner-door" aria-hidden="true" />
          </div>
          <div className="scan-layout-copy">
            <span>공간 유형</span>
            <strong>투룸</strong>
            <p>내부 벽과 침실 출입문이 있는 발표용 예시 구조입니다.</p>
            <ul><li>거실·주방</li><li>침실 1개</li><li>가전 배치 공간</li></ul>
          </div>
        </div>

        <div className="scan-dimension-grid">
          <label><span>가로</span><span className="dimension-input"><input name="width" type="number" min="4800" max="12000" step="10" value={form.width} onChange={updateField} inputMode="numeric" /><i>mm</i></span></label>
          <label><span>세로</span><span className="dimension-input"><input name="depth" type="number" min="4200" max="12000" step="10" value={form.depth} onChange={updateField} inputMode="numeric" /><i>mm</i></span></label>
          <label><span>높이</span><span className="dimension-input"><input name="height" type="number" min="2000" max="5000" step="10" value={form.height} onChange={updateField} inputMode="numeric" /><i>mm</i></span></label>
        </div>

        <div className="scan-summary-card">
          <div><span>예상 면적</span><strong>{scanAreaLabel(form)}</strong></div>
          <div><span>시연 구성</span><strong>문 2개 · 창문 2개 · 내부 벽</strong></div>
        </div>
        {!isValid && <p className="scan-validation" role="alert">{validationErrors[0]}</p>}
        <div className="room-scan-actions result-actions">
          <button type="button" className="scan-button primary" disabled={!isValid} onClick={createRoom}>이 공간으로 3D 만들기</button>
          <button type="button" className="scan-button secondary" onClick={restartScan}>다시 스캔하기</button>
        </div>
      </section>
    </div>
  )
}
