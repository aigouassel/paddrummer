import { useState } from 'react'
import { RUDIMENTS_BY_ID } from '../domain/rudiments'
import { CALIBRATION_BEATS } from '../audio/engine'
import { usePractice } from './usePractice'
import { RudimentPicker } from './RudimentPicker'
import { Transport } from './Transport'
import { Score } from './Score'
import { ScorePanel } from './ScorePanel'
import { InputPanel } from './InputPanel'

/** Free practice: one rudiment, your tempo, for as long as you like. */
export function PracticePage() {
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
    <>
      <aside className="col col-left">
        <RudimentPicker rudiment={rudiment} onSelect={setRudimentId} />
      </aside>

      <main className="col col-center">
        {/* Stave and transport travel together: the controls belong to the
            music directly above them, not to the bottom of the column. */}
        <div className="stage">
          <Score strokes={strokes} activeIndex={activeStroke} />
          <Transport
            isPlaying={isPlaying}
            disabled={calibrating}
            bpm={bpm}
            onToggle={toggle}
            onTempo={setTempo}
          />
        </div>

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
    </>
  )
}
