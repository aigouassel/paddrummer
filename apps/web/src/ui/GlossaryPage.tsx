import { GROUPS, GROUP_NAMES, TERMS_BY_GROUP } from '@paddrummer/glossary'

/**
 * What the words mean.
 *
 * Grouped rather than alphabetical, because the point is to be readable
 * straight through by someone new to the vocabulary — and "shoulder" next to
 * "sextuplet" teaches nothing about either. Within a group the order is the
 * order it makes sense to learn them in.
 *
 * One column and no panel: nothing here is played, so the timing read-out and
 * the transport would only be furniture.
 */
export function GlossaryPage() {
  return (
    <main className="col col-center prose">
      <header className="page-head">
        <p className="eyebrow">Reference</p>
        <h2>What the words mean</h2>
        <p className="note">
          Enough vocabulary to read a stave in this app, and to tell what its notes are asking
          you to do with the stick. Where a term means something particular here — the shoulder
          standing in for a snare, say — the entry says so.
        </p>
      </header>

      {GROUPS.map((group) => (
        <section key={group} className="glossary-group">
          <h3>{GROUP_NAMES[group]}</h3>
          <dl className="glossary">
            {TERMS_BY_GROUP(group).map((entry) => (
              <div key={entry.term} className="glossary-entry" id={`term-${entry.term}`}>
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
                          <a href={`#term-${other}`}>{other.toLowerCase()}</a>
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
  )
}
