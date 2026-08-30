import { useCallback, useMemo, useRef, useState } from 'react'
import { BOOK_PAGES, BOOK_PAGES_BY_NUMBER } from '../domain/stickControl'
import { meterText } from '../domain/phrase'
import { usePractice } from './usePractice'
import { useSpacebarToggle } from './useSpacebarToggle'
import { useElementWidth } from './useElementWidth'
import { useFollowActive } from './useFollowActive'
import { Score, MIN_SCORE_WIDTH } from './Score'
import { InputPanel } from './InputPanel'
import { ScorePanel } from './ScorePanel'

/** These exercises are short; drawn any larger they waste the column. */
const SHEET_ZOOM = 1.2

/**
 * Exercises transcribed from a practice book, read a page at a time.
 *
 * A book page is a long list of near-identical patterns, which is exactly the
 * material a screen is worse at than paper — so the page is the unit you pick,
 * and one exercise at a time is armed for playing. The whole page stays
 * visible above the transport so you can see where you are in it.
 */
export function StickControlPage() {
  const [pageNumber, setPageNumber] = useState(BOOK_PAGES[0]!.page)
  const [selected, setSelected] = useState(0)

  const bookPage = BOOK_PAGES_BY_NUMBER.get(pageNumber)!
  const exercise = bookPage.exercises[Math.min(selected, bookPage.exercises.length - 1)]!

  const columnRef = useRef<HTMLDivElement>(null)
  const width = useElementWidth(columnRef, MIN_SCORE_WIDTH)
  const rows = useFollowActive<HTMLLIElement>(selected, width)

  const phrase = useMemo(() => exercise.phrase, [exercise])

  const {
    isPlaying, bpm, metronome, mode, latencyMs, calibrationTaps,
    input, micStatus, micError, sensitivity, getMeter,
    activeStroke, report,
    toggle, calibrate, setTempo, setMetronome, clearLatency,
    useKeyboard, useMicrophone, setSensitivity,
  } = usePractice(phrase)

  const calibrating = mode === 'calibrating'
  useSpacebarToggle(toggle, !calibrating)

  const choose = useCallback((index: number) => setSelected(index), [])

  return (
    <>
      <aside className="col col-left">
        <div className="panel-stack">
          <p className="eyebrow">Stick Control</p>
          <p className="note">
            George Lawrence Stone. Transcribed from the printed pages; the numbers are the
            book’s, and each exercise carries the image and staff line it was read from, so
            any of them can be checked against the page rather than taken on trust.
          </p>

          <ul className="catalogue">
            {BOOK_PAGES.map((item) => (
              <li key={item.page} className={item.page === pageNumber ? 'is-selected' : ''}>
                <button
                  type="button"
                  onClick={() => {
                    setPageNumber(item.page)
                    setSelected(0)
                  }}
                >
                  <span className="book-page-no">p.{item.page}</span> {item.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="col col-center col-sheet">
        <div className="worksheet" ref={columnRef}>
          <header className="sheet-header">
            <p className="eyebrow">
              Page {bookPage.page} · {bookPage.exercises.length} exercises
            </p>
            <h2>{bookPage.title}</h2>
            <p className="note">{bookPage.shape}</p>
          </header>

          <ol className="sheet">
            {bookPage.exercises.map((item, i) => {
              const current = i === selected
              return (
                <li
                  key={item.n}
                  className={`sheet-row ${current ? 'is-current' : ''}`}
                  ref={(element) => {
                    rows.current[i] = element
                  }}
                >
                  <button
                    type="button"
                    className="sheet-head"
                    onClick={() => choose(i)}
                    aria-current={current ? 'true' : undefined}
                  >
                    <span className="sheet-index">{item.n}</span>
                    {item.phrase.meter ? (
                      <span className="sheet-meter">{meterText(item.phrase.meter)}</span>
                    ) : null}
                    <span className="sheet-meta">
                      {current ? (isPlaying ? 'playing' : 'selected') : 'play this'}
                    </span>
                  </button>

                  <Score
                    phrase={item.phrase}
                    activeIndex={current && isPlaying ? activeStroke : -1}
                    width={width}
                    maxZoom={SHEET_ZOOM}
                  />

                  {current ? (
                    <p className="sheet-note">
                      {item.note ? <>{item.note} </> : null}
                      {/* Where this was read from, so it can be checked against
                          the page rather than taken on trust. */}
                      <span className="provenance">
                        {item.at.file.split('/').pop()} ·{' '}
                        {bookPage.columns > 1 && (item.at.columns ?? 1) === 1
                          ? `${item.at.column === 0 ? 'left' : 'right'} column, `
                          : ''}
                        {bookPage.columns > 1 && (item.at.columns ?? 1) > 1 ? 'full width, ' : ''}
                        line {item.at.row + 1}
                        {item.at.rows > 1 ? `–${item.at.row + item.at.rows}` : ''}
                      </span>
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </div>

        <div className="sheet-transport">
          <button type="button" className="play" onClick={toggle} disabled={calibrating}>
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          <label className="tempo">
            <strong>{bpm}</strong> bpm
            <input
              type="range"
              min={40}
              max={200}
              value={bpm}
              onChange={(event) => setTempo(Number(event.target.value))}
            />
          </label>
          <p className="step-caption">
            Page {bookPage.page}, no. <strong>{exercise.n}</strong>
          </p>
          <p className="shortcut-hint">
            <kbd>Space</kbd> to start and stop
          </p>
        </div>
      </main>

      <aside className="col col-right">
        <div className="panel-stack">
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
          <section className="panel-stack">
            <p className="eyebrow">Your timing</p>
            <ScorePanel report={report} showSticking={input === 'keyboard'} />
          </section>
        </div>
      </aside>
    </>
  )
}
