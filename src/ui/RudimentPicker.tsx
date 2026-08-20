import { useMemo } from 'react'
import { RUDIMENTS } from '../domain/rudiments'
import type { Rudiment, RudimentCategory } from '../domain/pattern'

const CATEGORY_LABELS: Record<RudimentCategory, string> = {
  roll: 'I. Roll Rudiments',
  diddle: 'II. Diddle Rudiments',
  flam: 'III. Flam Rudiments',
  drag: 'IV. Drag Rudiments',
}

const ORDER: RudimentCategory[] = ['roll', 'diddle', 'flam', 'drag']

/** Left column: which rudiment, and what it is. */
export function RudimentPicker({
  rudiment,
  onSelect,
}: {
  rudiment: Rudiment
  onSelect: (id: string) => void
}) {
  const grouped = useMemo(
    () =>
      ORDER.map((category) => ({
        category,
        items: RUDIMENTS.filter((r) => r.category === category),
      })),
    [],
  )

  return (
    <div className="panel-stack">
      <label className="field">
        <span>Rudiment</span>
        <select value={rudiment.id} onChange={(event) => onSelect(event.target.value)}>
          {grouped.map(({ category, items }) => (
            <optgroup key={category} label={CATEGORY_LABELS[category]}>
              {items.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.number}. {r.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="rudiment-card">
        <p className="eyebrow">
          No. {rudiment.number} · {CATEGORY_LABELS[rudiment.category].replace(/^[IV]+\. /, '')}
        </p>
        <h2>{rudiment.name}</h2>
        {rudiment.notes ? <p className="note">{rudiment.notes}</p> : null}
        <p className="note">
          {rudiment.alternates
            ? 'Repeats mirrored, so the pattern leads with each hand in turn.'
            : 'Repeats on the same lead hand.'}
        </p>
      </div>
    </div>
  )
}
