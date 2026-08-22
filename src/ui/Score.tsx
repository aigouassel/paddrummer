import { useEffect, useRef } from 'react'
import { renderScore } from '../notation/score'
import type { Stroke } from '../domain/pattern'

/** Narrowest stave worth drawing; below this the column scrolls instead. */
export const MIN_SCORE_WIDTH = 320

/**
 * Renders a rudiment as notation and moves a playhead across it.
 *
 * Two separate effects on purpose. Engraving is expensive — VexFlow lays out
 * beams, tuplets and ornaments, then writes a fresh SVG tree — so it runs only
 * when the music, the width or the zoom cap changes. The playhead runs up to
 * 60 times a second, so it only toggles a class on an SVG group that already
 * exists. Redrawing the stave per frame would burn a layout pass per note.
 *
 * Width arrives as a prop rather than being measured here: a page may stack
 * several staves, and they all share one measurement of the column they sit in.
 */
export function Score({
  strokes,
  activeIndex,
  width,
  maxZoom,
}: {
  strokes: readonly Stroke[]
  /** -1 for a stave nothing is playing on. */
  activeIndex: number
  width: number
  maxZoom?: number
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const notesRef = useRef<(SVGElement | undefined)[]>([])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    notesRef.current = renderScore(host, strokes, width, maxZoom).noteElements
  }, [strokes, width, maxZoom])

  useEffect(() => {
    notesRef.current.forEach((element, index) => {
      element?.classList.toggle('is-active', index === activeIndex)
    })
  }, [activeIndex, strokes, width, maxZoom])

  return <div className="score" ref={hostRef} />
}
