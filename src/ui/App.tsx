import { useMemo, useState } from 'react'
import { RUDIMENTS, RUDIMENTS_BY_ID } from '../domain/rudiments'
import type { RudimentCategory } from '../domain/pattern'
import { usePractice } from './usePractice'
import { Score } from './Score'
import { ScorePanel } from './ScorePanel'
import { InputPanel } from './InputPanel'
import { CALIBRATION_BEATS } from '../audio/engine'

const CATEGORY_LABELS: Record<RudimentCategory, string> = {
  roll: 'I. Roll Rudiments',
  diddle: 'II. Diddle Rudiments',
  flam: 'III. Flam Rudiments',
  drag: 'IV. Drag Rudiments',
}

const MIN_BPM = 30
const MAX_BPM = 240

export function App() {
  const [rudimentId, setRudimentId] = useState('single-paradiddle')
  const rudiment = RUDIMENTS_BY_ID.get(rudimentId)!

  const grouped = useMemo(() => {
    const order: RudimentCategory[] = ['roll', 'diddle', 'flam', 'drag']
    return order.map((category) => ({
      category,
      items: RUDIMENTS.filter((r) => r.category === category),
    }))
  }, [])

  const {
    isPlaying, bpm, metronome, mode, latencyMs, calibrationTaps,
    input, micStatus, micError, sensitivity, getMeter,
    strokes, activeStroke, report,
    toggle, calibrate, setTempo, setMetronome, clearLatency,
    useKeyboard, useMicrophone, setSensitivity,
  } = usePractice(rudiment)

  const calibrating = mode === 'calibrating'

  return (
    <main className="app">
      <header>
        <h1>paddrummer</h1>
        <p className="subtitle">The 40 international drum rudiments</p>
      </header>

      <section className="panel">
        <label className="field">
          <span>Rudiment</span>
          <select value={rudimentId} onChange={(e) => setRudimentId(e.target.value)}>
            {grouped.map(({ category, items }) => (
              <optgroup key={category} label={CATEGORY_LABELS[category]}>
                {items.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.number}. {r.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="field">
          <span>
            Tempo <strong>{bpm}</strong> bpm
          </span>
          <input
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={(e) => setTempo(Number(e.target.value))}
          />
        </label>

        <div className="controls">
          <button type="button" className="play" onClick={toggle} disabled={calibrating}>
            {isPlaying && !calibrating ? 'Stop' : 'Play'}
          </button>
          <label className="toggle">
            <input
              type="checkbox"
              checked={metronome}
              onChange={(e) => setMetronome(e.target.checked)}
            />
            <span>Metronome</span>
          </label>
          <button type="button" className="ghost" onClick={calibrate}>
            {calibrating ? `Tap along… ${calibrationTaps}/${CALIBRATION_BEATS}` : 'Calibrate'}
          </button>
          {latencyMs !== 0 && !calibrating ? (
            <button type="button" className="ghost" onClick={clearLatency} title="Reset to zero">
              Latency {latencyMs > 0 ? '+' : ''}
              {latencyMs}ms
            </button>
          ) : null}
        </div>
      </section>

      <Score strokes={strokes} activeIndex={activeStroke} />

      {calibrating ? (
        <p className="hint">
          Play along with the click. {CALIBRATION_BEATS} strikes measures the delay between
          what you hear and what the app sees, so your timing is scored fairly.
        </p>
      ) : (
        <ScorePanel report={report} showSticking={input === 'keyboard'} />
      )}

      <InputPanel
        input={input}
        micStatus={micStatus}
        micError={micError}
        sensitivity={sensitivity}
        getMeter={getMeter}
        onUseKeyboard={useKeyboard}
        onUseMicrophone={useMicrophone}
        onSensitivity={setSensitivity}
      />

      {rudiment.notes ? <p className="note">{rudiment.notes}</p> : null}
    </main>
  )
}
