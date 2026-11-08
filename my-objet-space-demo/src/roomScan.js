import { roomArea } from './roomGeometry.js'

export const SCAN_DURATION_MS = 4000

export const SCAN_STAGES = Object.freeze([
  '바닥을 확인하고 있어요',
  '벽의 위치를 찾고 있어요',
  '방의 구조를 분석하고 있어요',
  '문과 창문을 확인하고 있어요',
  '공간 크기를 계산하고 있어요',
  '3D 공간을 만들고 있어요',
])

export const DEFAULT_SCAN_FORM = Object.freeze({
  shape: 'rectangle', width: '6200', depth: '5200', height: '2400',
})

export function stopMediaStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop())
}

export function cameraErrorMessage(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return '카메라 권한이 허용되지 않았어요. 데모 모드로 계속 체험할 수 있습니다.'
  }
  if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') {
    return '사용 가능한 카메라를 찾지 못했어요. 데모 모드로 계속 체험할 수 있습니다.'
  }
  return '카메라를 시작할 수 없어요. 데모 모드로 계속 체험해 주세요.'
}

export async function acquireCameraStream(getUserMedia, requestIsCurrent) {
  try {
    const stream = await getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' } },
    })
    if (!requestIsCurrent()) {
      stopMediaStream(stream)
      return { status: 'stale' }
    }
    return { status: 'active', stream }
  } catch (error) {
    return requestIsCurrent() ? { status: 'error', error } : { status: 'stale' }
  }
}

export function scanStageIndex(progress) {
  const normalized = Math.max(0, Math.min(100, Number(progress) || 0))
  return Math.min(SCAN_STAGES.length - 1, Math.floor(normalized / (100 / SCAN_STAGES.length)))
}

export function scanStageLabel(progress) {
  return SCAN_STAGES[scanStageIndex(progress)]
}

export function makeScannedRoom(form = DEFAULT_SCAN_FORM) {
  const shape = form.shape === 'l' ? 'l' : 'rectangle'
  const width = Number(form.width) / 1000
  const depth = Number(form.depth) / 1000
  const partitionX = -width * 0.089
  const gapWidth = Math.min(0.95, depth * 0.2)
  return {
    shape,
    layout: 'two-room',
    width,
    depth,
    height: Number(form.height) / 1000,
    door: { wall: 'front', offset: 0.84 },
    window: { wall: 'back', offset: shape === 'l' ? 0.32 : 0.72 },
    windows: [{ wall: 'left', offset: 0.28 }],
    showFurniture: false,
    label: '스캔된 투룸',
    source: 'scan-demo',
    scanDemo: true,
    zones: { bedroomSide: 'left', appliance: { x: width * 0.363, z: shape === 'l' ? depth * 0.18 : -depth * 0.337 } },
    partitions: [{
      x: partitionX,
      startZ: -depth / 2,
      endZ: depth / 2,
      gapCenterZ: depth * 0.26,
      gapWidth,
      label: '침실 벽',
      hasDoor: true,
    }],
  }
}

export function scanAreaLabel(form) {
  const room = makeScannedRoom(form)
  return Number.isFinite(room.width) && Number.isFinite(room.depth)
    ? `${roomArea(room).toFixed(1)}㎡`
    : '—'
}
