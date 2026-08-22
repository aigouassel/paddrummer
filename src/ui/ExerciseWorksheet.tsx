import { useMemo, useRef } from 'react'
import { meterText } from '../domain/phrase'
import {
  exerciseDurationSec,
  formatDuration,
  pieceForStep,
  type Exercise,
} from '../domain/exercises'
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

  // One pass per exercise, so every phrase keeps its identity across renders.
  // That is what stops `Score` re-engraving: its effect depends on the phrase,
  // and the page re-renders several times a second while playing.
  const steps = useMemo(
    () => exercise.steps.map((step) => ({ step, piece: pieceForStep(step) })),
    [exercise],
  )

  return (
    <div className="worksheet" ref={columnRef}>
      <header className="sheet-header">
        <p className="eyebrow">
          {exercise.steps.length} steps · {formatDuration(exerciseDurationSec(exercise))}
        </p>
        <h2>{exercise.name}</h2>
        <p className="note">{exercise.goal}</p>
      </header>

      <ol className="sheet">
        {steps.map(({ step, piece }, i) => {
          const current = i === index
          const state = current ? 'is-current' : i < index ? 'is-done' : 'is-upcoming'
          const twoLines = piece.phrase.lines.length > 1
          return (
            <li
              key={`${step.pieceId}-${i}`}
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
                <span className="sheet-name">{piece.name}</span>
                {piece.phrase.meter ? (
                  <span className="sheet-meter">{meterText(piece.phrase.meter)}</span>
                ) : null}
                <span className="sheet-meta">
                  {step.bpm} bpm · {step.repeats}×
                </span>
              </button>

              <Score
                phrase={piece.phrase}
                // Only the playing stave carries a playhead; the rest are static
                // SVG and cost nothing per frame.
                activeIndex={current && running ? activeStroke : -1}
                width={width}
                maxZoom={SHEET_ZOOM}
              />

              {/* The note only earns its space on the current step, and on a
                  two-line piece, where the convention needs stating once. */}
              {current && (piece.note || twoLines) ? (
                <p className="sheet-note">
                  {twoLines ? <strong>Right hand above, left below. </strong> : null}
                  {piece.note}
                </p>
              ) : null}

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
