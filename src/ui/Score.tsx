import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { renderScore } from '../notation/score'
import type { Stroke } from '../domain/pattern'

const MIN_WIDTH = 320

/**
 * Renders a rudiment as notation and moves a playhead across it.
 *
 * Two separate effects on purpose. Engraving is expensive — VexFlow lays out
 * beams, tuplets and ornaments, then writes a fresh SVG tree — so it runs only
 * when the music or the available width changes. The playhead runs up to 60
 * times a second, so it only toggles a class on an SVG group that already
 * exists. Redrawing the stave per frame would burn a layout pass per note.
 */
export function Score({
  strokes,
  activeIndex,
}: {
  strokes: readonly Stroke[]
  activeIndex: number
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const notesRef = useRef<(SVGElement | undefined)[]>([])
  const [width, setWidth] = useState(MIN_WIDTH)

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    const observer = new ResizeObserver(([entry]) => {
      const next = entry?.contentRect.width ?? MIN_WIDTH
      setWidth(Math.max(MIN_WIDTH, Math.floor(next)))
    })
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    notesRef.current = renderScore(host, strokes, width).noteElements
  }, [strokes, width])

  useEffect(() => {
    notesRef.current.forEach((element, index) => {
      element?.classList.toggle('is-active', index === activeIndex)
    })
  }, [activeIndex, strokes])

  return <div className="score" ref={hostRef} />
}
