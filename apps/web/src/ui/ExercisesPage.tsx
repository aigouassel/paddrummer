import { useCallback, useMemo, useState } from 'react'
import { useSpacebarToggle } from './useSpacebarToggle'
import { useFollowActive } from './useFollowActive'
import {
  CATEGORY_NAMES,
  EXERCISES_BY_ID,
  LEVELS,
  LEVEL_NAMES,
  exercisesByCategory,
  pieceForStep,
  type Level,
} from '@paddrummer/exercises'
import { usePractice } from './usePractice'
import { useExerciseRun } from './useExerciseRun'
import { ExerciseWorksheet } from './ExerciseWorksheet'
import { InputPanel } from './InputPanel'
import { ScorePanel } from './ScorePanel'

/** Guided routines: the app picks the piece and the tempo, and moves on. */
export function ExercisesPage() {
  const [level, setLevel] = useState<Level>('beginner')
  const [exerciseId, setExerciseId] = useState('first-four')
  const exercise = EXERCISES_BY_ID.get(exerciseId)!

  const groups = useMemo(() => exercisesByCategory(level), [level])

  const run = useExerciseRun(exercise)

  // The input side of the engine is shared, so the same panel serves both
  // pages; only the transport differs, because an exercise drives its own.
  const {
    metronome, latencyMs, calibrationTaps, mode,
    input, micStatus, micError, sensitivity, getMeter,
    activeStroke, report,
    calibrate, setMetronome, clearLatency,
    useKeyboard, useMicrophone, setSensitivity,
  } = usePractice(run.piece.phrase)

  const calibrating = mode === 'calibrating'

  const toggleExercise = useCallback(
    () => (run.running ? run.stop() : run.start()),
    [run.running, run.stop, run.start],
  )
  useSpacebarToggle(toggleExercise, !calibrating)

  // The index mirrors the worksheet, so it follows along too — otherwise the
  // highlighted step scrolls out of the left column on a long routine.
  const indexItems = useFollowActive<HTMLLIElement>(run.index)

  const twoLines = run.piece.phrase.lines.length > 1

  return (
    <>
      <aside className="col col-left">
        <div className="panel-stack">
          <div className="segmented level-picker" role="group" aria-label="Level">
            {LEVELS.map((option) => (
              <button
                key={option}
                type="button"
                className={option === level ? 'is-selected' : ''}
                onClick={() => setLevel(option)}
              >
                {LEVEL_NAMES[option]}
              </button>
            ))}
          </div>

          {groups.map((group) => (
            <section key={group.category} className="catalogue-group">
              <p className="eyebrow">{CATEGORY_NAMES[group.category]}</p>
              <ul className="catalogue">
                {group.exercises.map((item) => (
                  <li key={item.id} className={item.id === exerciseId ? 'is-selected' : ''}>
                    <button type="button" onClick={() => setExerciseId(item.id)}>
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section className="panel-stack">
            <p className="eyebrow">Steps</p>
            <ol className="steps">
              {exercise.steps.map((step, i) => {
                const piece = pieceForStep(step)
                const state = i === run.index ? 'is-current' : i < run.index ? 'is-done' : ''
                return (
                  <li
                    key={`${step.pieceId}-${i}`}
                    className={state}
                    ref={(element) => {
                      indexItems.current[i] = element
                    }}
                  >
                    <button type="button" onClick={() => run.jumpTo(i)}>
                      <span className="step-name">{piece.name}</span>
                      <span className="step-meta">
                        {step.bpm} bpm · {step.repeats}×
                      </span>
                    </button>
                    {i === run.index && run.running ? (
                      <div
                        className="step-progress"
                        style={{ width: `${(run.cycles / step.repeats) * 100}%` }}
                      />
                    ) : null}
                  </li>
                )
              })}
            </ol>
          </section>
        </div>
      </aside>

      {/* The centre column is the sheet and nothing else; the transport pins
          to its foot so Stop stays reachable however far down you have read. */}
      <main className="col col-center col-sheet">
        <ExerciseWorksheet
          exercise={exercise}
          index={run.index}
          running={run.running}
          cycles={run.cycles}
          activeStroke={activeStroke}
          onJump={run.jumpTo}
        />

        <div className="sheet-transport">
          <button type="button" className="play" onClick={toggleExercise} disabled={calibrating}>
            {run.running ? 'Stop' : 'Start exercise'}
          </button>
          <p className="step-caption">
            Step {run.index + 1} of {exercise.steps.length} · <strong>{run.piece.name}</strong>{' '}
            at <strong>{run.step.bpm}</strong> bpm ·{' '}
            {run.running ? `${run.cycles}/${run.step.repeats}` : `${run.step.repeats}×`}
          </p>
          <p className="shortcut-hint">
            <kbd>Space</kbd> to start and stop
          </p>
        </div>
      </main>

      <aside className="col col-right">
        <div className="panel-stack">
          <InputPanel
            input={input}
            micStatus={micStatus}
            micError={micError}
            sensitivity={sensitivity}
            getMeter={getMeter}
            onUseKeyboard={useKeyboard}
            onUseMicrophone={useMicrophone}
            onSensitivity={setSensitivity}
            metronome={metronome}
            onMetronome={setMetronome}
            calibrating={calibrating}
            calibrationTaps={calibrationTaps}
            onCalibrate={calibrate}
            latencyMs={latencyMs}
            onClearLatency={clearLatency}
          />

          {/* Moved out of the centre on this page: the sheet needs the whole
              column, and the read-out belongs with the other read-outs. */}
          <section className="panel-stack">
            <p className="eyebrow">Your timing</p>
            {twoLines && input === 'microphone' ? (
              <p className="hint">
                A microphone hears one drum, so on a two-line piece it cannot tell which hand
                struck. Timing is still scored; switch to the keyboard to have the hands checked.
              </p>
            ) : null}
            <ScorePanel report={report} showSticking={input === 'keyboard'} />
          </section>
        </div>
      </aside>
    </>
  )
}
