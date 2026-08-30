import { useCallback, useState } from 'react'
import { EngineProvider } from './EngineContext'
import { RudimentsPage } from './RudimentsPage'
import { StickControlPage } from './StickControlPage'
import { ExperimentsPage } from './ExperimentsPage'
import { SetupDialog } from './SetupDialog'
import { useColumnWidth } from './useColumnWidth'
import { MusicWidthProvider, useMusicWidth } from './MusicWidth'
import { HomePage } from './HomePage'
import { GlossaryPage } from './GlossaryPage'
import { PAGE_ROUTES, useRoute, type Route } from './useRoute'

/**
 * How wide the right column may be dragged.
 *
 * The floor is what the clip needs to stay watchable; the ceiling stops the
 * panel eating the stave, which is the one thing on the page that cannot
 * reflow.
 */
const RIGHT_COLUMN = { key: 'paddrummer.right-column', fallback: 224, min: 180, max: 560 }
const LEFT_COLUMN = { key: 'paddrummer.left-column', fallback: 224, min: 176, max: 480 }
/** The centre's own padding, which neither column may take. */
const CENTRE_PADDING = 32

const LABELS: Record<Route, string> = {
  home: 'Home',
  rudiments: 'Rudiments',
  'stick-control': 'Stick Control',
  experiments: 'Experiments',
  glossary: 'Glossary',
}

/** Read rather than played, and with nothing to pick from: one column. */
const READING: readonly Route[] = ['home']
/** Read, but with a contents list: a left column and no panel. */
const CONTENTS: readonly Route[] = ['glossary']

/**
 * The shell: a header with the nav, and three columns the current page fills.
 *
 * The three pages are the three bodies of material, each with its own source:
 * the published forty, a printed book, and whatever is still being read off a
 * recording.
 *
 * Pages render the columns themselves as a fragment rather than being handed
 * a slot each. The grid areas do the placing, so every page inherits the same
 * layout without the shell needing to know what any of them contain.
 *
 * That is also why hiding the right column is a class here and not a prop
 * threaded through three pages: the shell owns the grid, so it can collapse a
 * column without any page knowing it happened. The width goes to the music,
 * and the stave re-engraves itself because it measures its column rather than
 * being told how wide it is.
 *
 * Setup lives here too, in a dialog. Input source, sensitivity, metronome and
 * calibration are the same on every page and unaffected by the piece, so they
 * belong to the shell rather than to whichever column had room for them.
 */
export function App() {
  return (
    <EngineProvider>
      <MusicWidthProvider>
        <Shell />
      </MusicWidthProvider>
    </EngineProvider>
  )
}

function Shell() {
  const [route, navigate] = useRoute()
  // Held above the route switch, so it survives moving between pages the way
  // the audio engine and its calibration do.
  const [panel, setPanel] = useState(true)
  const [setup, setSetup] = useState(false)
  // Dragging the panel wider stops where the stave would start to scroll. The
  // page says how much room its music needs; the shell knows what else is
  // competing for it.
  const reading = READING.includes(route)
  const contents = CONTENTS.includes(route)
  const musicMin = useMusicWidth()

  // Both columns compete with the stave for the same window, so each is capped
  // assuming the other keeps at least its minimum. The music is served first;
  // what is left over is what the panels may argue over.
  const spare = useCallback(
    (otherMin: number) => window.innerWidth - CENTRE_PADDING - musicMin - otherMin,
    [musicMin],
  )
  const left = useColumnWidth({
    ...LEFT_COLUMN,
    edge: 'left',
    max: useCallback(
      () => Math.max(LEFT_COLUMN.min, Math.min(LEFT_COLUMN.max, spare(RIGHT_COLUMN.min))),
      [spare],
    ),
  })
  const right = useColumnWidth({
    ...RIGHT_COLUMN,
    max: useCallback(
      () => Math.max(RIGHT_COLUMN.min, Math.min(RIGHT_COLUMN.max, spare(left.width))),
      [spare, left.width],
    ),
  })

  return (
    <>
      <div
        className={[
          'layout',
          panel ? '' : 'is-panel-hidden',
          reading ? 'is-reading' : '',
          contents ? 'is-contents' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={
          {
            '--left-column': `${left.width}px`,
            '--right-column': `${right.width}px`,
            '--music-min': `${musicMin}px`,
          } as React.CSSProperties
        }
      >
        <header className="topbar">
          {/* The title is the way home, which is where a wordmark usually
              goes anyway — and keeps the nav about the material. */}
          <button type="button" className="wordmark" onClick={() => navigate('home')}>
            paddrummer
          </button>
          <nav className="nav">
            {PAGE_ROUTES.map((id) => (
              <button
                key={id}
                type="button"
                className={route === id ? 'is-current' : ''}
                aria-current={route === id ? 'page' : undefined}
                onClick={() => navigate(id)}
              >
                {LABELS[id]}
              </button>
            ))}
          </nav>

          <div className="topbar-actions">
            <button type="button" className="panel-toggle" onClick={() => setSetup(true)}>
              Setup
            </button>
            {/* Acts on a column the reading pages do not have. Says what it
                will do rather than what is showing: a toggle labelled with its
                current state reads as a claim, not a button. */}
            {reading || contents ? null : (
              <button
                type="button"
                className="panel-toggle"
                onClick={() => setPanel((on) => !on)}
                aria-expanded={panel}
              >
                {panel ? 'Hide panel' : 'Show panel'}
              </button>
            )}
          </div>
        </header>

        {route === 'stick-control' ? (
          <StickControlPage />
        ) : route === 'experiments' ? (
          <ExperimentsPage />
        ) : route === 'glossary' ? (
          <GlossaryPage />
        ) : route === 'rudiments' ? (
          <RudimentsPage />
        ) : (
          <HomePage navigate={navigate} />
        )}

        {/* On the boundaries rather than inside either column, so neither page
            nor panel has to know they exist. Each is placed by its column's own
            width, which keeps it on the edge at any size. */}
        {reading ? null : (
          <div
            className="col-resizer col-resizer-left"
            role="separator"
            aria-orientation="vertical"
            aria-label="List width"
            aria-valuenow={left.width}
            aria-valuemin={left.min}
            tabIndex={0}
            onPointerDown={left.onPointerDown}
            onPointerMove={left.onPointerMove}
            onPointerUp={left.onPointerUp}
            onKeyDown={left.onKeyDown}
          />
        )}

        {panel && !reading && !contents ? (
          <div
            className="col-resizer col-resizer-right"
            role="separator"
            aria-orientation="vertical"
            aria-label="Panel width"
            aria-valuenow={right.width}
            aria-valuemin={right.min}
            tabIndex={0}
            onPointerDown={right.onPointerDown}
            onPointerMove={right.onPointerMove}
            onPointerUp={right.onPointerUp}
            onKeyDown={right.onKeyDown}
          />
        ) : null}
      </div>

      <SetupDialog open={setup} onClose={() => setSetup(false)} />
    </>
  )
}
