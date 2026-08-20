import { toNoteValue } from '../domain/duration'
import type { Stroke } from '../domain/pattern'

/**
 * A provisional read-out of the sticking, standing in for real notation until
 * the VexFlow layer lands. It reads straight off the domain model — grace
 * notes come from `stroke.grace`, so a flam renders as a small `l` tucked
 * before its `R` without any special-casing.
 */
export function StickingStrip({
  strokes,
  activeIndex,
}: {
  strokes: readonly Stroke[]
  activeIndex: number
}) {
  return (
    <ol className="strip">
      {strokes.map((stroke, index) => (
        <li
          key={index}
          className={[
            'stroke',
            index === activeIndex ? 'is-active' : '',
            stroke.accent ? 'is-accent' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {stroke.grace?.length ? (
            <span className="grace">{stroke.grace.map((h) => h.toLowerCase()).join('')}</span>
          ) : null}
          <span className="hand">{stroke.hand}</span>
          <span className="value">{stroke.buzz ? 'buzz' : (toNoteValue(stroke.duration) ?? '?')}</span>
        </li>
      ))}
    </ol>
  )
}
