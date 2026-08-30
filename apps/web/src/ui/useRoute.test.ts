import { describe, expect, it } from 'vitest'
import { parseHash } from './useRoute'

/**
 * Routing on the hash means the hash is not available for anything else, and
 * that is exactly the sort of thing that breaks silently: a fragment link
 * still *looks* right, it just quietly lands you on the default page. These
 * are the cases that go wrong.
 */
describe('parseHash', () => {
  it('reads a plain route', () => {
    expect(parseHash('#/glossary')).toEqual({ route: 'glossary', tail: '' })
  })

  it('reads a place on a page', () => {
    expect(parseHash('#/glossary/multiple-bounce')).toEqual({
      route: 'glossary',
      tail: 'multiple-bounce',
    })
  })

  it('falls back to home for anything that is not a route', () => {
    // This is what a bare `href="#multiple-bounce"` produced: no route at all,
    // so every contents link went to the landing page instead of the term.
    expect(parseHash('#multiple-bounce')).toEqual({ route: 'home', tail: '' })
    expect(parseHash('#/nonsense')).toEqual({ route: 'home', tail: '' })
  })

  it('survives an empty or absent hash', () => {
    expect(parseHash('')).toEqual({ route: 'home', tail: '' })
    expect(parseHash('#')).toEqual({ route: 'home', tail: '' })
    expect(parseHash('#/')).toEqual({ route: 'home', tail: '' })
  })

  it('tolerates a route written without the slash', () => {
    expect(parseHash('#glossary')).toEqual({ route: 'glossary', tail: '' })
  })
})
