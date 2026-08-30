import { useEffect } from 'react'
import { GROUPS, GROUP_NAMES, TERMS_BY_GROUP, slug } from '@paddrummer/glossary'
import { useHashTail } from './useRoute'

/**
 * What the words mean.
 *
 * Grouped rather than alphabetical, because the point is to be readable
 * straight through by someone new to the vocabulary — and "shoulder" next to
 * "sextuplet" teaches nothing about either. Within a group the order is the
 * order it makes sense to learn them in.
 *
 * The contents list carries every term, not just the groups. Thirty-five is
 * too many to scan in the body but few enough to list, and the reason to open
 * a glossary is usually one word you already have in mind.
 *
 * Links go to `#/glossary/<term>` rather than to a bare `#<term>`, because the
 * app routes on the hash: a plain fragment link replaces the route with
 * something that is not one, and lands you on the landing page. The page
 * therefore does its own scrolling, which the browser would otherwise have
 * done for free.
 */
export function GlossaryPage() {
  const target = useHashTail()

  useEffect(() => {
    if (!target) return
    document.getElementById(target)?.scrollIntoView({ block: 'center' })
  }, [target])

  return (
    <>
      <aside className="col col-left">
        <div className="panel-stack">
          <p className="eyebrow">Contents</p>
          {GROUPS.map((group) => (
            <section key={group} className="catalogue-group">
              <p className="eyebrow">{GROUP_NAMES[group]}</p>
              <ul className="catalogue">
                {TERMS_BY_GROUP(group).map((entry) => (
                  <li key={entry.term}>
                    <a
                      href={`#/glossary/${slug(entry.term)}`}
                      className={slug(entry.term) === target ? 'is-selected' : ''}
                    >
                      {entry.term}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </aside>

      <main className="col col-center prose">
        <header className="page-head">
          <p className="eyebrow">Reference</p>
          <h2>What the words mean</h2>
          <p className="note">
            Enough vocabulary to read a stave in this app, and to tell what its notes are asking
            you to do with the stick. Where a term means something particular here — the
            shoulder standing in for a snare, say — the entry says so.
          </p>
        </header>

        {GROUPS.map((group) => (
          <section key={group} className="glossary-group">
            <h3 id={`group-${group}`}>{GROUP_NAMES[group]}</h3>
            <dl className="glossary">
              {TERMS_BY_GROUP(group).map((entry) => (
                <div
                  key={entry.term}
                  className={`glossary-entry ${slug(entry.term) === target ? 'is-current' : ''}`}
                  id={slug(entry.term)}
                >
                  <dt>{entry.term}</dt>
                  <dd>
                    {entry.definition}
                    {entry.see?.length ? (
                      <span className="glossary-see">
                        {' '}
                        See also{' '}
                        {entry.see.map((other, i) => (
                          <span key={other}>
                            {i > 0 ? ', ' : ''}
                            <a href={`#/glossary/${slug(other)}`}>{other.toLowerCase()}</a>
                          </span>
                        ))}
                        .
                      </span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </main>
    </>
  )
}
