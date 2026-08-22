import { useCallback, useState } from 'react'
import { useSpacebarToggle } from './useSpacebarToggle'
import {
  EXERCISES,
  EXERCISES_BY_ID,
  exerciseDurationSec,
  formatDuration,
  rudimentForStep,
} from '../domain/exercises'
import { usePractice } from './usePractice'
import { useExerciseRun } from './useExerciseRun'
import { Score } from './Score'
import { InputPanel } from './InputPanel'
import { ScorePanel } from './ScorePanel'

/** Guided routines: the app picks the rudiment and the tempo, and moves on. */
export function ExercisesPage() {
  const [exerciseId, setExerciseId] = useState('first-four')
  const exercise = EXERCISES_BY_ID.get(exerciseId)!

  const run = useExerciseRun(exercise)

  // The input side of the engine is shared, so the same panel serves both
  // pages; only the transport differs, because an exercise drives its own.
  const {
    metronome, latencyMs, calibrationTaps, mode,
    input, micStatus, micError, sensitivity, getMeter,
    activeStroke, report,
    calibrate, setMetronome, clearLatency,
    useKeyboard, useMicrophone, setSensitivity,
  } = usePractice(run.rudiment)

  const calibrating = mode === 'calibrating'

  const toggleExercise = useCallback(
    () => (run.running ? run.stop() : run.start()),
    [run.running, run.stop, run.start],
  )
  useSpacebarToggle(toggleExercise, !calibrating)

  return (
    <>
      <aside className="col col-left">
        <div className="panel-stack">
          <label className="field">
            <span>Exercise</span>
            <select value={exerciseId} onChange={(event) => setExerciseId(event.target.value)}>
              {EXERCISES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <div className="rudiment-card">
            <p className="eyebrow">
              {exercise.steps.length} steps · {formatDuration(exerciseDurationSec(exercise))}
            </p>
            <h2>{exercise.name}</h2>
            <p className="note">{exercise.goal}</p>
          </div>

          <ol className="steps">
            {exercise.steps.map((step, i) => {
              const rudiment = rudimentForStep(step)
              const state = i === run.index ? 'is-current' : i < run.index ? 'is-done' : ''
              return (
                <li key={`${step.rudimentId}-${i}`} className={state}>
                  <button type="button" onClick={() => run.jumpTo(i)}>
                    <span className="step-name">{rudiment.name}</span>
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
        </div>
      </aside>

      <main className="col col-center">
        <div className="stage">
          <Score strokes={run.strokes} activeIndex={activeStroke} />

          <div className="transport transport-stacked">
            <button
              type="button"
              className="play"
              onClick={toggleExercise}
              disabled={calibrating}
            >
              {run.running ? 'Stop' : 'Start exercise'}
            </button>
            <p className="step-caption">
              Step {run.index + 1} of {exercise.steps.length} ·{' '}
              <strong>{run.rudiment.name}</strong> at <strong>{run.step.bpm}</strong> bpm ·{' '}
              {run.running ? `${run.cycles}/${run.step.repeats}` : `${run.step.repeats}×`}
            </p>
            <p className="shortcut-hint">
              <kbd>Space</kbd> to start and stop
            </p>
          </div>
        </div>

        <ScorePanel report={report} showSticking={input === 'keyboard'} />
      </main>

      <aside className="col col-right">
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
      </aside>
    </>
  )
}
