import { useLayoutEffect, useState, type RefObject } from 'react'

/**
 * Tracks an element's content width.
 *
 * Split out of `Score` so a column of staves measures once rather than once
 * per stave: five observers firing on a window resize would schedule five
 * independent re-engravings, where one measurement lifted to the container
 * gives a single state update that React commits in one pass.
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>, min: number): number {
  const [width, setWidth] = useState(min)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const next = entry?.contentRect.width ?? min
      setWidth(Math.max(min, Math.floor(next)))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, min])

  return width
}
