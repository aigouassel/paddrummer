import { EngineProvider } from './EngineContext'
import { PracticePage } from './PracticePage'
import { ExercisesPage } from './ExercisesPage'
import { StickControlPage } from './StickControlPage'
import { ROUTES, useRoute, type Route } from './useRoute'

const LABELS: Record<Route, string> = {
  practice: 'Practice',
  exercises: 'Exercises',
  'stick-control': 'Stick Control',
}

/**
 * The shell: a header with the nav, and three columns the current page fills.
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

        {route === 'exercises' ? (
          <ExercisesPage />
        ) : route === 'stick-control' ? (
          <StickControlPage />
        ) : (
          <PracticePage />
        )}
      </div>
    </EngineProvider>
  )
}
