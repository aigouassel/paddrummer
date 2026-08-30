import { useCallback, useSyncExternalStore } from 'react'
import { useEngine } from './EngineContext'

/**
 * The half of the engine that has nothing to do with what you are playing.
 *
 * Input source, microphone sensitivity, the metronome and latency calibration
 * are the same on every page and unaffected by the piece, which is why they
 * never really belonged to a page's column. `usePractice` needs a phrase
 * because it loads one and follows a playhead through it; this needs none, so
 * the shell can own the setup without knowing which page is showing.
 *
 * Two subscriptions to one engine is not a duplicate source of truth: both
 * read the same store, and the engine remains the only thing that mutates.
 */
export function useEngineSettings() {
  const engine = useEngine()
  const state = useSyncExternalStore(engine.subscribe, engine.getState)

  return {
    input: state.input,
    micStatus: state.micStatus,
    micError: state.micError,
    sensitivity: state.sensitivity,
    metronome: state.metronome,
    latencyMs: state.latencyMs,
    calibrationTaps: state.calibrationTaps,
    calibrating: state.mode === 'calibrating',
    getMeter: engine.getMeter,
    useKeyboard: useCallback(() => engine.useKeyboard(), [engine]),
    useMicrophone: useCallback(() => void engine.useMicrophone(), [engine]),
    setSensitivity: useCallback((v: number) => engine.setSensitivity(v), [engine]),
    setMetronome: useCallback((on: boolean) => engine.setMetronome(on), [engine]),
    clearLatency: useCallback(() => engine.setLatency(0), [engine]),
    calibrate: useCallback(() => {
      if (engine.getState().mode === 'calibrating') engine.stop()
      else void engine.startCalibration()
    }, [engine]),
  }
}
