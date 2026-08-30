import { RUDIMENTS } from '@paddrummer/rudiments'
import { BOOK_PAGES } from '@paddrummer/stick-control'
import { TERMS } from '@paddrummer/glossary'
import type { Route } from './useRoute'

/**
 * What this is, for someone who has just arrived at the URL.
 *
 * The counts are read from the material rather than written down, so the page
 * cannot come to overstate what is here — which would be the first thing to
 * rot on a page like this.
 */
const exerciseCount = BOOK_PAGES.reduce((n, page) => n + page.exercises.length, 0)

export function HomePage({ navigate }: { navigate: (route: Route) => void }) {
  const cards: { route: Route; title: string; blurb: string; count: string }[] = [
    {
      route: 'rudiments',
      title: 'Rudiments',
      blurb:
        'The Percussive Arts Society’s international list, at whatever tempo you want, with the whole set in view.',
      count: `${RUDIMENTS.length} rudiments`,
    },
    {
      route: 'stick-control',
      title: 'Stick Control',
      blurb:
        'George Lawrence Stone’s book, read a page at a time. Every exercise names the photograph and staff line it was transcribed from.',
      count: `${exerciseCount} exercises`,
    },
    {
      route: 'experiments',
      title: 'Experiments',
      blurb:
        'Transcriptions still being worked out, beside the clips they were read off — and beside how much of each was actually seen.',
      count: 'Read off video',
    },
  ]

  return (
    <main className="col col-center prose">
      <header className="page-head">
        <h2 className="home-title">A practice pad, and something to read on it.</h2>
        <p className="lede">
          paddrummer plays a pattern, draws it, listens to you play it, and tells you how close
          you were. It works on a rubber pad and a laptop — no kit, no interface.
        </p>
      </header>

      <div className="home-cards">
        {cards.map((card) => (
          <button key={card.route} type="button" className="home-card" onClick={() => navigate(card.route)}>
            <p className="eyebrow">{card.count}</p>
            <h3>{card.title}</h3>
            <p className="note">{card.blurb}</p>
          </button>
        ))}
      </div>

      <section className="home-section">
        <h3>Playing along</h3>
        <p className="note">
          Press <kbd>Space</kbd> to start. Play on the keyboard with <kbd>F</kbd> for the left
          hand and <kbd>J</kbd> for the right — the only input that knows which hand you used,
          so the only one that can check your sticking. Or switch to the microphone in{' '}
          <strong>Setup</strong> and hit the pad. Either way, calibrate once first: it measures
          the delay between a note sounding and the app seeing your strike, so your timing is
          scored fairly rather than as consistently late.
        </p>
      </section>

      <section className="home-section">
        <h3>Nothing here asks to be believed</h3>
        <p className="note">
          The book exercises carry the photograph, column and staff line they were read from.
          The video transcriptions carry the seconds of the clip, and the measured beat grid
          they were read against — which is committed, so a reading stays checkable by someone
          who has the repository and not the video. Where a sticking was inferred rather than
          seen, it says so on the piece rather than in a footnote.
        </p>
        <p className="note">
          If a word on a stave is unfamiliar, the{' '}
          <button type="button" className="link" onClick={() => navigate('glossary')}>
            glossary
          </button>{' '}
          defines {TERMS.length} of them.
        </p>
      </section>
    </main>
  )
}
