import { useCallback, useEffect, useMemo, useState } from 'react'
import { useEngine } from './EngineContext'
import { fullCycle } from '../domain/pattern'
import { rudimentForStep, type Exercise } from '../domain/exercises'

/** How often to check whether the current step has finished. */
const POLL_MS = 120

/**
 * Runs an exercise: sets each step's rudiment and tempo, and moves on once the
 * step's repeats have actually sounded.
 *
 * Advancement is driven by the engine's audio clock, not by a timer here. A
 * `setInterval` counting seconds would drift against the metronome, so a step
 * would end a little early or late and the player would be cut off mid-pattern.
 */
export function useExerciseRun(exercise: Exercise) {
  const engine = useEngine()
  const [index, setIndex] = useState(0)
  const [running, setRunning] = useState(false)
  const [cycles, setCycles] = useState(0)

  const step = exercise.steps[Math.min(index, exercise.steps.length - 1)]!
  const rudiment = useMemo(() => rudimentForStep(step), [step])
  const strokes = useMemo(() => fullCycle(rudiment), [rudiment])

  const playStep = useCallback(
    (at: number) => {
      const next = exercise.steps[at]
      if (!next) return
      engine.setPattern(fullCycle(rudimentForStep(next)))
      engine.setTempo(next.bpm)
      void engine.start()
    },
    [engine, exercise],
  )

  /** Reset whenever the exercise itself changes. */
  useEffect(() => {
    engine.stop()
    setIndex(0)
    setRunning(false)
    setCycles(0)
  }, [engine, exercise])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const played = engine.cyclesPlayed
      setCycles(played)
      if (played < step.repeats) return

      const next = index + 1
      if (next >= exercise.steps.length) {
        engine.stop()
        setRunning(false)
        setCycles(0)
        return
      }
      setIndex(next)
      setCycles(0)
      playStep(next)
    }, POLL_MS)
    return () => clearInterval(id)
  }, [engine, running, index, step, exercise, playStep])

  const start = useCallback(() => {
    setRunning(true)
    setCycles(0)
    playStep(index)
  }, [playStep, index])

  const stop = useCallback(() => {
    engine.stop()
    setRunning(false)
    setCycles(0)
  }, [engine])

  const jumpTo = useCallback(
    (at: number) => {
      setIndex(at)
      setCycles(0)
      if (running) playStep(at)
      else engine.setPattern(fullCycle(rudimentForStep(exercise.steps[at]!)))
    },
    [running, playStep, engine, exercise],
  )

  return {
    step,
    rudiment,
    strokes,
    index,
    running,
    cycles: Math.min(cycles, step.repeats),
    start,
    stop,
    jumpTo,
  }
}
