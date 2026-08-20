import { useState } from 'react'
import { RUDIMENTS_BY_ID } from '../domain/rudiments'
import { CALIBRATION_BEATS } from '../audio/engine'
import { usePractice } from './usePractice'
import { RudimentPicker } from './RudimentPicker'
import { Transport } from './Transport'
import { Score } from './Score'
import { ScorePanel } from './ScorePanel'
import { InputPanel } from './InputPanel'

/**
 * Three columns: what to play, the music itself, and how you are playing it.
 *
 * The stave takes the whole middle column because it is the thing being read
 * while both hands are busy — everything else is set once and then left alone,
 * so it belongs at the edges rather than between the player and the notes.
 */
export function App() {
  const [rudimentId, setRudimentId] = useState('single-paradiddle')
  const rudiment = RUDIMENTS_BY_ID.get(rudimentId)!

  const {
    isPlaying, bpm, metronome, mode, latencyMs, calibrationTaps,
    input, micStatus, micError, sensitivity, getMeter,
    strokes, activeStroke, report,
    toggle, calibrate, setTempo, setMetronome, clearLatency,
    useKeyboard, useMicrophone, setSensitivity,
  } = usePractice(rudiment)

  const calibrating = mode === 'calibrating'

  return (
    <div className="layout">
      <header className="topbar">
        <h1>paddrummer</h1>
        <p>The 40 international drum rudiments</p>
      </header>

      <aside className="col col-left">
        <RudimentPicker rudiment={rudiment} onSelect={setRudimentId} />
      </aside>

      <main className="col col-center">
        <div className="stage">
          <Score strokes={strokes} activeIndex={activeStroke} />
        </div>

        <Transport
          isPlaying={isPlaying}
          disabled={calibrating}
          bpm={bpm}
          onToggle={toggle}
          onTempo={setTempo}
        />

        {calibrating ? (
          <p className="hint centered">
            Play along with the click. {CALIBRATION_BEATS} strikes measures the delay between
            what you hear and what the app sees, so your timing is scored fairly.
          </p>
        ) : (
          <ScorePanel report={report} showSticking={input === 'keyboard'} />
        )}
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
    </div>
  )
}
