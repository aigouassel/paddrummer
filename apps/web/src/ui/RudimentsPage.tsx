import { useRef, useState } from 'react'
import {
  CATEGORIES,
  CATEGORY_NAMES,
  RUDIMENTS,
  RUDIMENTS_BY_ID,
  rudimentsInCategory,
} from '@paddrummer/rudiments'
import { pieceOfRudiment, type Piece } from '@paddrummer/core/piece'
import { CALIBRATION_BEATS } from '../audio/engine'
import { useSpacebarToggle } from './useSpacebarToggle'
import { useElementWidth } from './useElementWidth'
import { usePractice } from './usePractice'
import { Transport } from './Transport'
import { Score, MIN_SCORE_WIDTH } from './Score'
import { ScorePanel } from './ScorePanel'
import { InputPanel } from './InputPanel'

/**
 * Built once at module load, not per render.
 *
 * `pieceOfRudiment` builds a fresh phrase every call, and `Score` re-engraves
 * whenever the phrase identity changes — beams, tuplets and a new SVG tree.
 * With the playhead refreshing ten times a second that would be a full layout
 * pass per frame, so the forty pieces are made once and handed out by id.
 */
const PIECES: ReadonlyMap<string, Piece> = new Map(
  RUDIMENTS.map((rudiment) => [rudiment.id, pieceOfRudiment(rudiment)]),
)

const DEFAULT_ID = 'single-paradiddle'

/** The forty, at your own tempo, with the whole list in view. */
export function RudimentsPage() {
  const [id, setId] = useState(DEFAULT_ID)
  const rudiment = RUDIMENTS_BY_ID.get(id)!
  const piece = PIECES.get(id)!

  const {
    isPlaying, bpm, metronome, mode, latencyMs, calibrationTaps,
    input, micStatus, micError, sensitivity, getMeter,
    activeStroke, report,
    toggle, calibrate, setTempo, setMetronome, clearLatency,
    useKeyboard, useMicrophone, setSensitivity,
  } = usePractice(piece.phrase)

  const calibrating = mode === 'calibrating'
  const stageRef = useRef<HTMLDivElement>(null)
  const scoreWidth = useElementWidth(stageRef, MIN_SCORE_WIDTH)

  // Not during calibration: the transport is disabled then, and the player is
  // busy tapping along to the click.
  useSpacebarToggle(toggle, !calibrating)

  return (
    <>
      {/* The whole list, always. Forty is few enough to scan and the numbering
          is how drummers refer to them, so hiding it behind a dropdown costs a
          click and the sense of where a rudiment sits among its neighbours. */}
      <aside className="col col-left">
        <div className="panel-stack">
          <p className="eyebrow">The 40 Rudiments</p>
          <p className="note">
            The Percussive Arts Society’s international list, in its own numbering. Forty, no
            more and no fewer — the set is fixed, which is what makes it worth knowing by heart.
          </p>

          {CATEGORIES.map((category) => (
            <section key={category} className="catalogue-group">
              <p className="eyebrow">{CATEGORY_NAMES[category]}</p>
              <ul className="catalogue">
                {rudimentsInCategory(category).map((item) => (
                  <li key={item.id} className={item.id === id ? 'is-selected' : ''}>
                    <button type="button" onClick={() => setId(item.id)}>
                      <span className="book-page-no">{item.number}</span> {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </aside>

      <main className="col col-center">
        {/* Stave and transport travel together: the controls belong to the
            music directly above them, not to the bottom of the column. */}
        <div className="stage" ref={stageRef}>
          <div className="piece-card">
            <p className="eyebrow">
              No. {rudiment.number} · {CATEGORY_NAMES[rudiment.category].replace(/^[IVX]+\. /, '')}
            </p>
            <h2>{rudiment.name}</h2>
            <p className="note">
              {rudiment.notes ? `${rudiment.notes} ` : ''}
              {rudiment.alternates
                ? 'Repeats mirrored, so the pattern leads with each hand in turn.'
                : 'Repeats on the same lead hand.'}
            </p>
          </div>

          <Score phrase={piece.phrase} activeIndex={activeStroke} width={scoreWidth} />
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
