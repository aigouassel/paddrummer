import { useRef, useState } from 'react'
import { useSpacebarToggle } from './useSpacebarToggle'
import { RUDIMENTS_BY_ID } from '../domain/rudiments'
import { CALIBRATION_BEATS } from '../audio/engine'
import { usePractice } from './usePractice'
import { RudimentPicker } from './RudimentPicker'
import { Transport } from './Transport'
import { Score, MIN_SCORE_WIDTH } from './Score'
import { ScorePanel } from './ScorePanel'
import { InputPanel } from './InputPanel'
import { useElementWidth } from './useElementWidth'

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

  // The stave is measured from the stage rather than from itself, so both
  // pages feed `Score` the same way.
  const stageRef = useRef<HTMLDivElement>(null)
  const scoreWidth = useElementWidth(stageRef, MIN_SCORE_WIDTH)

  // Not during calibration: the transport is disabled then, and the player is
  // busy tapping along to the click.
  useSpacebarToggle(toggle, !calibrating)

  return (
    <>
      <aside className="col col-left">
        <RudimentPicker rudiment={rudiment} onSelect={setRudimentId} />
      </aside>

      <main className="col col-center">
        {/* Stave and transport travel together: the controls belong to the
            music directly above them, not to the bottom of the column. */}
        <div className="stage" ref={stageRef}>
          <Score strokes={strokes} activeIndex={activeStroke} width={scoreWidth} />
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
