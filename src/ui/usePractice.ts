import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { PracticeEngine } from '../audio/engine'
import { fullCycle, type Rudiment } from '../domain/pattern'
import type { ScoreReport } from '../domain/scoring'

/** How often the score read-out refreshes. Fast enough to feel live, slow
 *  enough not to re-render React on every animation frame. */
const REPORT_MS = 100

/**
 * Bridges the audio engine into React without letting React own it.
 *
 * `useSyncExternalStore` is the right primitive here: the engine is an
 * external mutable source of truth, and this hook subscribes to it rather than
 * mirroring its state. Holding bpm or isPlaying in `useState` as the primary
 * copy would mean the metronome's timing depended on React's render schedule.
 *
 * The playhead is polled on an animation frame instead of being pushed,
 * because notes are scheduled up to 120ms *before* they sound. The engine
 * knows what will play; only the audio clock knows what is playing now.
 */
export function usePractice(rudiment: Rudiment) {
  const engineRef = useRef<PracticeEngine>(null)
  engineRef.current ??= new PracticeEngine()
  const engine = engineRef.current

  const state = useSyncExternalStore(engine.subscribe, engine.getState)
  const [activeStroke, setActiveStroke] = useState(-1)
  const [report, setReport] = useState<ScoreReport | null>(null)

  const strokes = fullCycle(rudiment)

  useEffect(() => {
    engine.setPattern(fullCycle(rudiment))
    setActiveStroke(-1)
    setReport(null)
  }, [engine, rudiment])

  useEffect(() => {
    // Timing bugs are invisible in a screenshot, so expose the engine in dev:
    // `__engine.report()` in the console shows what the scorer sees.
    if (import.meta.env.DEV) Reflect.set(window, '__engine', engine)
    return () => engine.dispose()
  }, [engine])

  useEffect(() => {
    if (!state.isPlaying) {
      setActiveStroke(-1)
      return
    }
    let frame = requestAnimationFrame(function poll() {
      setActiveStroke(engine.activeStrokeIndex())
      frame = requestAnimationFrame(poll)
    })
    return () => cancelAnimationFrame(frame)
  }, [engine, state.isPlaying])

  useEffect(() => {
    if (!state.isPlaying || state.mode !== 'practice') return
    const id = setInterval(() => setReport(engine.report()), REPORT_MS)
    return () => clearInterval(id)
  }, [engine, state.isPlaying, state.mode])

  const toggle = useCallback(() => {
    if (state.isPlaying) engine.stop()
    else void engine.start()
  }, [engine, state.isPlaying])

  const calibrate = useCallback(() => {
    if (state.mode === 'calibrating') engine.stop()
    else void engine.startCalibration()
  }, [engine, state.mode])

  return {
    ...state,
    strokes,
    activeStroke,
    report,
    toggle,
    calibrate,
    setTempo: useCallback((bpm: number) => engine.setTempo(bpm), [engine]),
    setMetronome: useCallback((on: boolean) => engine.setMetronome(on), [engine]),
    clearLatency: useCallback(() => engine.setLatency(0), [engine]),
    useKeyboard: useCallback(() => engine.useKeyboard(), [engine]),
    useMicrophone: useCallback(() => void engine.useMicrophone(), [engine]),
    setSensitivity: useCallback((v: number) => engine.setSensitivity(v), [engine]),
    getMeter: engine.getMeter,
  }
}
