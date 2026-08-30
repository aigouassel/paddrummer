import { CATALOGUE, type CatalogueEntry } from '../domain/catalogue'

/** Left column: which piece, and what it is. */
export function PiecePicker({
  entry,
  onSelect,
}: {
  entry: CatalogueEntry
  onSelect: (id: string) => void
}) {
  return (
    <div className="panel-stack">
      <label className="field">
        <span>Piece</span>
        <select value={entry.piece.id} onChange={(event) => onSelect(event.target.value)}>
          {CATALOGUE.map((section) => (
            <optgroup key={section.id} label={section.label}>
              {section.entries.map(({ piece }) => (
                <option key={piece.id} value={piece.id}>
                  {piece.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="piece-card">
        <p className="eyebrow">{entry.kind}</p>
        <h2>{entry.piece.name}</h2>
        {entry.detail.map((text) => (
          <p className="note" key={text}>
            {text}
          </p>
        ))}
      </div>
    </div>
  )
}
