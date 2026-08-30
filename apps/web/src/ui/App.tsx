import { useState } from 'react'
import { EngineProvider } from './EngineContext'
import { RudimentsPage } from './RudimentsPage'
import { StickControlPage } from './StickControlPage'
import { ExperimentsPage } from './ExperimentsPage'
import { ROUTES, useRoute, type Route } from './useRoute'

const LABELS: Record<Route, string> = {
  rudiments: 'Rudiments',
  'stick-control': 'Stick Control',
  experiments: 'Experiments',
}

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
 * That is also why hiding the input panel is a class here and not a prop
 * threaded through three pages: the shell owns the grid, so it can collapse a
 * column without any page knowing it happened. The width goes to the music,
 * and the stave re-engraves itself because it measures its column rather than
 * being told how wide it is.
 */
export function App() {
  const [route, navigate] = useRoute()
  // Held above the route switch, so it survives moving between pages the way
  // the audio engine and its calibration do.
  const [panel, setPanel] = useState(true)

  return (
    <EngineProvider>
      <div className={`layout ${panel ? '' : 'is-panel-hidden'}`}>
        <header className="topbar">
          <h1>paddrummer</h1>
          <nav className="nav">
            {ROUTES.map((id) => (
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

          {/* Says what it will do rather than what is showing: a toggle
              labelled with its current state reads as a claim, not a button. */}
          <button
            type="button"
            className="panel-toggle"
            onClick={() => setPanel((on) => !on)}
            aria-expanded={panel}
          >
            {panel ? 'Hide panel' : 'Show panel'}
          </button>
        </header>

        {route === 'stick-control' ? (
          <StickControlPage />
        ) : route === 'experiments' ? (
          <ExperimentsPage />
        ) : (
          <RudimentsPage />
        )}
      </div>
    </EngineProvider>
  )
}
