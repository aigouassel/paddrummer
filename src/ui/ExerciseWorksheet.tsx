import { useMemo, useRef } from 'react'
import { fullCycle } from '../domain/pattern'
import { rudimentForStep, type Exercise } from '../domain/exercises'
import { Score, MIN_SCORE_WIDTH } from './Score'
import { useElementWidth } from './useElementWidth'
import { useFollowActive } from './useFollowActive'

/**
 * Lower than a single stave's cap: with several staves down the page, a
 * slightly smaller engraving buys another row on screen, and reading ahead
 * matters more here than reading big.
 */
const SHEET_ZOOM = 1.15

/**
 * The exercise as a sheet of music: one stave per step, top to bottom.
 *
 * Showing only the current step hides what an exercise *is* — a sequence. Laid
 * out this way the shape is visible before you start, the playhead travels
 * down the page as the routine advances, and any step can be started by
 * clicking its stave.
 */
export function ExerciseWorksheet({
  exercise,
  index,
  running,
  cycles,
  activeStroke,
  onJump,
}: {
  exercise: Exercise
  /** Index of the step currently playing, or cued to play. */
  index: number
  running: boolean
  /** Full cycles completed within the current step. */
  cycles: number
  activeStroke: number
  onJump: (index: number) => void
}) {
  const columnRef = useRef<HTMLDivElement>(null)
  const width = useElementWidth(columnRef, MIN_SCORE_WIDTH)
  const rows = useFollowActive<HTMLLIElement>(index, width)

  // One pass per exercise, so every `strokes` array keeps its identity across
  // renders. That is what stops `Score` re-engraving: its effect depends on
  // the array, and the page re-renders several times a second while playing.
  const steps = useMemo(
    () =>
      exercise.steps.map((step) => {
        const rudiment = rudimentForStep(step)
        return { step, rudiment, strokes: fullCycle(rudiment) }
      }),
    [exercise],
  )

  return (
    <div className="worksheet" ref={columnRef}>
      <ol className="sheet">
        {steps.map(({ step, rudiment, strokes }, i) => {
          const current = i === index
          const state = current ? 'is-current' : i < index ? 'is-done' : 'is-upcoming'
          return (
            <li
              key={`${step.rudimentId}-${i}`}
              className={`sheet-row ${state}`}
              ref={(element) => {
                rows.current[i] = element
              }}
            >
              <button
                type="button"
                className="sheet-head"
                onClick={() => onJump(i)}
                aria-current={current ? 'step' : undefined}
              >
                <span className="sheet-index">{i + 1}</span>
                <span className="sheet-name">{rudiment.name}</span>
                <span className="sheet-meta">
                  {step.bpm} bpm · {step.repeats}×
                </span>
              </button>

              <Score
                strokes={strokes}
                // Only the playing stave carries a playhead; the rest are static
                // SVG and cost nothing per frame.
                activeIndex={current && running ? activeStroke : -1}
                width={width}
                maxZoom={SHEET_ZOOM}
              />

              <div className="sheet-bar">
                <div
                  className="sheet-fill"
                  style={{ width: `${current ? (cycles / step.repeats) * 100 : i < index ? 100 : 0}%` }}
                />
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
