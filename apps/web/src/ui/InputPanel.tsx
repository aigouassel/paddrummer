import { useEffect, useRef } from 'react'
import type { InputKind, MicStatus } from '../audio/engine'
import type { MicMeter } from '../input/microphone'

const STATUS_TEXT: Record<MicStatus, string> = {
  off: '',
  starting: 'Asking for microphone access…',
  listening: 'Listening. Hit the pad.',
  denied: 'Microphone permission was refused.',
  unsupported: 'Microphone unavailable.',
}

/**
 * Input selection, sensitivity and a live level meter.
 *
 * The meter is driven straight from the engine on an animation frame rather
 * than through React state. It updates about fifty times a second, and putting
 * that in a store would re-render the whole page at the same rate for the sake
 * of one bar's width.
 */
export function InputPanel({
  input,
  micStatus,
  micError,
  sensitivity,
  getMeter,
  onUseKeyboard,
  onUseMicrophone,
  onSensitivity,
  metronome,
  onMetronome,
  calibrating,
  calibrationTaps,
  onCalibrate,
  latencyMs,
  onClearLatency,
}: {
  input: InputKind
  micStatus: MicStatus
  micError: string | null
  sensitivity: number
  getMeter: () => MicMeter
  onUseKeyboard: () => void
  onUseMicrophone: () => void
  onSensitivity: (value: number) => void
  metronome: boolean
  onMetronome: (on: boolean) => void
  calibrating: boolean
  calibrationTaps: number
  onCalibrate: () => void
  latencyMs: number
  onClearLatency: () => void
}) {
  const levelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const listening = input === 'microphone' && micStatus === 'listening'

  useEffect(() => {
    if (!listening) return
    let frame = requestAnimationFrame(function paint() {
      const { level, baseline } = getMeter()
      // Log scale: a pad hit is orders of magnitude above room tone, and a
      // linear meter would sit invisibly near zero and then slam to full.
      const toPercent = (value: number) =>
        Math.max(0, Math.min(100, ((Math.log10(Math.max(value, 1e-5)) + 5) / 5) * 100))
      if (levelRef.current) levelRef.current.style.width = `${toPercent(level)}%`
      if (triggerRef.current) {
        triggerRef.current.style.left = `${toPercent(Math.max(0.01, baseline * sensitivity))}%`
      }
      frame = requestAnimationFrame(paint)
    })
    return () => cancelAnimationFrame(frame)
  }, [listening, getMeter, sensitivity])

  return (
    <section className="panel-stack">
      <p className="eyebrow">Input</p>

      <div className="segmented" role="group" aria-label="Input source">
        <button
          type="button"
          className={input === 'keyboard' ? 'is-selected' : ''}
          onClick={onUseKeyboard}
        >
          Keyboard
        </button>
        <button
          type="button"
          className={input === 'microphone' ? 'is-selected' : ''}
          onClick={onUseMicrophone}
        >
          Microphone
        </button>
      </div>

      {input === 'keyboard' ? (
        <p className="hint">
          <kbd>F</kbd> left hand, <kbd>J</kbd> right hand. The keyboard is the only input that
          knows which hand you played, so it is the only one that can check your sticking.
        </p>
      ) : (
        <div className="mic">
          <p className="hint">
            {micError ?? STATUS_TEXT[micStatus]}
            {micStatus === 'listening' ? (
              <>
                {' '}
                Wear headphones — otherwise the microphone hears the metronome and counts it as
                your playing.
              </>
            ) : null}
          </p>

          {listening ? (
            <>
              <div className="meter" aria-hidden>
                <div className="meter-level" ref={levelRef} />
                <div className="meter-trigger" ref={triggerRef} />
              </div>
              <label className="field">
                <span>
                  Sensitivity <strong>{sensitivity.toFixed(1)}×</strong> above the noise floor
                </span>
                <input
                  type="range"
                  min={1.5}
                  max={12}
                  step={0.5}
                  value={sensitivity}
                  onChange={(event) => onSensitivity(Number(event.target.value))}
                />
              </label>
            </>
          ) : null}
        </div>
      )}

      <hr />

      <p className="eyebrow">Metronome &amp; timing</p>

      <label className="toggle">
        <input
          type="checkbox"
          checked={metronome}
          onChange={(event) => onMetronome(event.target.checked)}
        />
        <span>Click on every beat</span>
      </label>

      <button type="button" className="ghost wide" onClick={onCalibrate}>
        {calibrating ? `Tap along… ${calibrationTaps}/8` : 'Calibrate latency'}
      </button>

      {latencyMs !== 0 && !calibrating ? (
        <p className="note">
          Correcting by {latencyMs > 0 ? '+' : ''}
          {latencyMs}ms.{' '}
          <button type="button" className="link" onClick={onClearLatency}>
            Reset
          </button>
        </p>
      ) : (
        <p className="note">
          Measures the delay between a note sounding and the app seeing your strike. Run it once
          per setup.
        </p>
      )}
    </section>
  )
}
