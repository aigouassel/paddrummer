import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { PracticeEngine } from '../audio/engine'

/**
 * One engine for the whole app, above the router.
 *
 * Pages come and go; the audio context, the calibration offset and the chosen
 * input source must not. Creating the engine inside a page would mean
 * switching tabs tore down the AudioContext and threw away a latency
 * measurement the player had just taken the trouble to make.
 */
const EngineContext = createContext<PracticeEngine | null>(null)

export function EngineProvider({ children }: { children: ReactNode }) {
  const ref = useRef<PracticeEngine>(null)
  ref.current ??= new PracticeEngine()
  const engine = ref.current

  useEffect(() => {
    engine.useKeyboard()

    // Timing bugs are invisible in a screenshot, so expose the engine in dev:
    // `__engine.report()` in the console shows what the scorer sees.
    if (import.meta.env.DEV) Reflect.set(window, '__engine', engine)
    return () => engine.dispose()
  }, [engine])

  return <EngineContext.Provider value={engine}>{children}</EngineContext.Provider>
}

export function useEngine(): PracticeEngine {
  const engine = useContext(EngineContext)
  if (!engine) throw new Error('useEngine must be used inside an EngineProvider')
  return engine
}
