import assert from 'node:assert/strict'
import test from 'node:test'
import {
  POINTER_DRAG_THRESHOLD,
  hasExceededDragThreshold,
  pointerCoordinates,
} from './pointerGesture.js'

test('pointer drag begins at the five pixel threshold', () => {
  const start = { x: 10, y: 10 }
  assert.equal(hasExceededDragThreshold(start, { x: 13, y: 13 }), false)
  assert.equal(hasExceededDragThreshold(start, { x: 13, y: 14 }), true)
  assert.equal(hasExceededDragThreshold(start, { x: 10 + POINTER_DRAG_THRESHOLD, y: 10 }), true)
})

test('pointerup displacement is classified without an intermediate pointermove', () => {
  const pointerDown = pointerCoordinates({ clientX: 100, clientY: 200 })
  const shortRelease = pointerCoordinates({ clientX: 103, clientY: 203 })
  const thresholdRelease = pointerCoordinates({ clientX: 103, clientY: 204 })

  assert.equal(hasExceededDragThreshold(pointerDown, shortRelease), false)
  assert.equal(hasExceededDragThreshold(pointerDown, thresholdRelease), true)
})

test('pointer coordinate extraction supports R3F and native events', () => {
  assert.deepEqual(pointerCoordinates({ clientX: 21, clientY: 34 }), { x: 21, y: 34 })
  assert.deepEqual(pointerCoordinates({ nativeEvent: { clientX: 55, clientY: 89 } }), { x: 55, y: 89 })
})

test('missing gesture coordinates do not accidentally start a drag', () => {
  assert.equal(hasExceededDragThreshold(null, { x: 10, y: 10 }), false)
  assert.equal(hasExceededDragThreshold({ x: 10, y: 10 }, null), false)
})
