export const POINTER_DRAG_THRESHOLD = 5

export function pointerCoordinates(event) {
  const source = event?.nativeEvent ?? event
  return {
    x: Number(source?.clientX ?? 0),
    y: Number(source?.clientY ?? 0),
  }
}

export function hasExceededDragThreshold(start, current, threshold = POINTER_DRAG_THRESHOLD) {
  if (!start || !current) return false
  return Math.hypot(current.x - start.x, current.y - start.y) >= threshold
}
