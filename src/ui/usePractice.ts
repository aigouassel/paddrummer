import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { PracticeEngine } from '../audio/engine'
import { fullCycle } from '../domain/pattern'
import type { Rudiment } from '../domain/pattern'

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

  const strokes = fullCycle(rudiment)

  useEffect(() => {
    engine.setPattern(fullCycle(rudiment))
    setActiveStroke(-1)
  }, [engine, rudiment])

  useEffect(() => {
    // Timing bugs are invisible in a screenshot, so expose the engine in dev:
    // `__engine.debug()` in the console reports the audio clock, the queued
    // notes and the active stroke.
    if (import.meta.env.DEV) Reflect.set(window, '__engine', engine)
    return () => engine.dispose()
  }, [engine])

  useEffect(() => {
    if (!state.isPlaying) {
      setActiveStroke(-1)
      return
    }
    let frame = 0
    const poll = () => {
      setActiveStroke(engine.activeStrokeIndex())
      frame = requestAnimationFrame(poll)
    }
    frame = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(frame)
  }, [engine, state.isPlaying])

  const toggle = useCallback(() => {
    if (state.isPlaying) engine.stop()
    else void engine.start()
  }, [engine, state.isPlaying])

  const setTempo = useCallback((bpm: number) => engine.setTempo(bpm), [engine])
  const setMetronome = useCallback((on: boolean) => engine.setMetronome(on), [engine])

  return { ...state, strokes, activeStroke, toggle, setTempo, setMetronome }
}
