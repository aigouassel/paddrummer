import { useCallback, useSyncExternalStore } from 'react'

export const ROUTES = ['home', 'rudiments', 'stick-control', 'experiments', 'glossary'] as const

/** The ones the nav offers. Home is reached by the title, glossary by name. */
export const PAGE_ROUTES = ROUTES.filter((route) => route !== 'home')
export type Route = (typeof ROUTES)[number]

const DEFAULT: Route = 'home'

const isRoute = (value: string): value is Route => (ROUTES as readonly string[]).includes(value)

/** Where in the app a hash points: a page, and optionally a place on it. */
export type Location = { route: Route; tail: string }

/**
 * Reads `#/route/tail`.
 *
 * The tail exists because the hash cannot be shared. Routing on it means an
 * ordinary `href="#some-id"` fragment link does not scroll the page — it
 * replaces the route with something that is not one, and the app falls back to
 * home. So anything that wants to link *within* a page addresses it through
 * here instead, and the page scrolls to the tail itself.
 */
export function parseHash(hash: string): Location {
  const [head = '', ...rest] = hash.replace(/^#\/?/, '').split('/')
  return { route: isRoute(head) ? head : DEFAULT, tail: rest.join('/') }
}

const readRoute = (): Route => parseHash(window.location.hash).route
const readTail = (): string => parseHash(window.location.hash).tail

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
  const route = useSyncExternalStore(subscribe, readRoute, () => DEFAULT)
  const navigate = useCallback((next: Route) => {
    window.location.hash = `#/${next}`
  }, [])
  return [route, navigate]
}

/** The part of the hash after the page: which entry on it to go to. */
export function useHashTail(): string {
  return useSyncExternalStore(subscribe, readTail, () => '')
}
