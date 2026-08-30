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
 */
export function App() {
  const [route, navigate] = useRoute()

  return (
    <EngineProvider>
      <div className="layout">
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
