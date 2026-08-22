import { useEffect, useRef } from 'react'

/**
 * Keeps the active item of a list in view as the list advances.
 *
 * `block: 'nearest'` rather than `'center'`: it scrolls only when the item is
 * actually outside the container, so a step that is already on screen does not
 * yank the view every time the exercise moves on.
 *
 * `layoutKey` re-runs the scroll when the geometry underneath it changes.
 * The staves engrave twice on first paint — once at the fallback width, then
 * again once the column has been measured — so a scroll computed before that
 * settles is measuring rows that are about to change height. Passing the
 * measured width re-runs it against the real layout, and keeps the active row
 * in view across a window resize for free.
 *
 * The animation is dropped in two cases. One is a reader who has asked for
 * less motion. The other is a hidden tab: a smooth scroll is driven frame by
 * frame, and a background tab gets no frames, so the scroll would simply never
 * happen — an exercise left running in another tab would come back with the
 * wrong step on screen. An instant scroll lands correctly either way.
 */
export function useFollowActive<T extends HTMLElement>(index: number, layoutKey?: unknown) {
  const items = useRef<(T | null)[]>([])

  useEffect(() => {
    const target = items.current[index]
    if (!target) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animate = !reduced && !document.hidden
    target.scrollIntoView({ block: 'nearest', behavior: animate ? 'smooth' : 'auto' })
  }, [index, layoutKey])

  return items
}
