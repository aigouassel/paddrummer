import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useEngine } from './EngineContext'
import type { Phrase } from '@paddrummer/core/phrase'
import type { ScoreReport } from '@paddrummer/core/scoring'

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
export function usePractice(phrase: Phrase, defaultBpm?: number) {
  const engine = useEngine()

  const state = useSyncExternalStore(engine.subscribe, engine.getState)
  const [activeStroke, setActiveStroke] = useState(-1)
  const [report, setReport] = useState<ScoreReport | null>(null)

  // The phrase arrives already memoised by the caller, because identity
  // matters downstream: Score re-engraves the whole stave whenever it changes,
  // and a fresh object every render would mean a full VexFlow layout pass on
  // every score update.
  useEffect(() => {
    engine.setPattern(phrase)
    setActiveStroke(-1)
    setReport(null)
  }, [engine, phrase])

  // A piece that knows its own tempo sets it on arrival, and again whenever
  // you come back to it — so the reset below is just "select me again".
  //
  // A piece that names no tempo leaves the tempo alone rather than snapping to
  // some app-wide number nobody chose. The engine is shared across pages on
  // purpose, and where you had the tempo is part of what survives navigating.
  // The alternative — every unlabelled piece resetting to 100 — is easy to
  // swap in here if it turns out to read better in use.
  useEffect(() => {
    if (defaultBpm !== undefined) engine.setTempo(defaultBpm)
  }, [engine, phrase, defaultBpm])

  // Leaving a page stops its audio. The engine outlives the page, so without
  // this the metronome carries on from a page that has no Stop button on it.
  useEffect(() => () => engine.stop(), [engine])

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
    phrase,
    activeStroke,
    report,
    toggle,
    calibrate,
    /** The tempo the piece asks for, or undefined where it asks for none. */
    defaultBpm,
    setTempo: useCallback((bpm: number) => engine.setTempo(bpm), [engine]),
    resetTempo: useCallback(() => {
      if (defaultBpm !== undefined) engine.setTempo(defaultBpm)
    }, [engine, defaultBpm]),
    setMetronome: useCallback((on: boolean) => engine.setMetronome(on), [engine]),
    clearLatency: useCallback(() => engine.setLatency(0), [engine]),
    useKeyboard: useCallback(() => engine.useKeyboard(), [engine]),
    useMicrophone: useCallback(() => void engine.useMicrophone(), [engine]),
    setSensitivity: useCallback((v: number) => engine.setSensitivity(v), [engine]),
    getMeter: engine.getMeter,
  }
}
