import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

/**
 * A column you can drag the edge of, remembered between visits.
 *
 * The width lives in React rather than in the stylesheet because it is a
 * preference, and it reaches the grid as a custom property so the layout stays
 * one `grid-template-columns` rule instead of becoming imperative.
 *
 * Every localStorage access is wrapped. It throws outright in some privacy
 * modes, and a column that cannot remember its width is a much smaller problem
 * than an app that will not start.
 */
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function read(key: string, fallback: number, min: number, max: number): number {
  try {
    const stored = Number(localStorage.getItem(key))
    return Number.isFinite(stored) && stored > 0 ? clamp(stored, min, max) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // A preference that cannot be saved is still a preference for this session.
  }
}

export function useColumnWidth({
  key,
  fallback,
  min,
  max,
  edge = 'right',
}: {
  key: string
  fallback: number
  min: number
  /**
   * Which side of the window the column is on, which is what decides the
   * direction. Both handles move the column's *inner* edge, so the left column
   * grows as the pointer goes right and the right column as it goes left.
   */
  edge?: 'left' | 'right'
  /**
   * Read on every movement rather than fixed, because the ceiling moves: it
   * depends on the window and on how much room the music on screen needs, and
   * both change without this hook being remounted.
   */
  max: () => number
}) {
  const [width, setWidth] = useState(() => read(key, fallback, min, max()))
  const drag = useRef<{ x: number; width: number } | null>(null)

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      // Pointer capture is what makes the drag survive leaving the 6px handle;
      // without it the first quick movement drops the gesture.
      event.preventDefault()
      drag.current = { x: event.clientX, width }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [width],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const start = drag.current
      if (!start) return
      const travelled = event.clientX - start.x
      setWidth(clamp(start.width + (edge === 'left' ? travelled : -travelled), min, max()))
    },
    [min, max, edge],
  )

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!drag.current) return
      drag.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
      write(key, width)
    },
    [key, width],
  )

  // A separator is a real control, so it answers the arrow keys too — and that
  // is also the only way to move it without a pointer.
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      const step = event.shiftKey ? 48 : 12
      const grow = edge === 'left' ? 'ArrowRight' : 'ArrowLeft'
      const shrink = edge === 'left' ? 'ArrowLeft' : 'ArrowRight'
      const delta = event.key === grow ? step : event.key === shrink ? -step : 0
      if (delta === 0) return
      event.preventDefault()
      const next = clamp(width + delta, min, max())
      setWidth(next)
      write(key, next)
    },
    [key, width, min, max, edge],
  )

  return { width, min, onPointerDown, onPointerMove, onPointerUp, onKeyDown }
}
