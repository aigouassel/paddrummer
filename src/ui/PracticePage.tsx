import { useRef, useState } from 'react'
import { useSpacebarToggle } from './useSpacebarToggle'
import { CATALOGUE_BY_ID, DEFAULT_PIECE_ID } from '../domain/catalogue'
import { CALIBRATION_BEATS } from '../audio/engine'
import { usePractice } from './usePractice'
import { PiecePicker } from './PiecePicker'
import { Transport } from './Transport'
import { Score, MIN_SCORE_WIDTH } from './Score'
import { ScorePanel } from './ScorePanel'
import { InputPanel } from './InputPanel'
import { useElementWidth } from './useElementWidth'

/** Free practice: one piece, your tempo, for as long as you like. */
export function PracticePage() {
  const [pieceId, setPieceId] = useState(DEFAULT_PIECE_ID)
  const entry = CATALOGUE_BY_ID.get(pieceId)!

  // The catalogue is built once at module load, so this is already a stable
  // reference and needs no memo. That matters: an unstable phrase would
  // re-engrave the whole stave on every render, including the ten-a-second
  // score refresh.
  const phrase = entry.piece.phrase
  const twoLines = phrase.lines.length > 1

  const {
    isPlaying, bpm, metronome, mode, latencyMs, calibrationTaps,
    input, micStatus, micError, sensitivity, getMeter,
    activeStroke, report,
    toggle, calibrate, setTempo, setMetronome, clearLatency,
    useKeyboard, useMicrophone, setSensitivity,
  } = usePractice(phrase)

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
        <PiecePicker entry={entry} onSelect={setPieceId} />
      </aside>

      <main className="col col-center">
        {/* Stave and transport travel together: the controls belong to the
            music directly above them, not to the bottom of the column. */}
        <div className="stage" ref={stageRef}>
          <Score phrase={phrase} activeIndex={activeStroke} width={scoreWidth} />
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
          <>
            {twoLines && input === 'microphone' ? (
              <p className="hint">
                A microphone hears one drum, so on a two-line piece it cannot tell which hand
                struck. Timing is still scored; switch to the keyboard to have the hands checked.
              </p>
            ) : null}
            <ScorePanel report={report} showSticking={input === 'keyboard'} />
          </>
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
