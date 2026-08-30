import { useCallback, useSyncExternalStore } from 'react'

export const ROUTES = ['home', 'rudiments', 'stick-control', 'experiments', 'glossary'] as const

/** The ones the nav offers. Home is reached by the title, glossary by name. */
export const PAGE_ROUTES = ROUTES.filter((route) => route !== 'home')
export type Route = (typeof ROUTES)[number]

const DEFAULT: Route = 'home'

const isRoute = (value: string): value is Route => (ROUTES as readonly string[]).includes(value)

const read = (): Route => {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return isRoute(hash) ? hash : DEFAULT
}

const subscribe = (listener: () => void) => {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}

/**
 * Routing on the URL hash rather than in component state.
 *
 * Twenty lines instead of a router dependency, and unlike `useState` it makes
 * the back button work and survives a reload — which matters more than it
 * sounds when a page holds a running metronome you would rather not restart.
 */
export function useRoute(): [Route, (route: Route) => void] {
  const route = useSyncExternalStore(subscribe, read, () => DEFAULT)
  const navigate = useCallback((next: Route) => {
    window.location.hash = `#/${next}`
  }, [])
  return [route, navigate]
}
