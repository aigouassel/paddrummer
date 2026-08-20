import { useMemo, useState } from 'react'
import { RUDIMENTS, RUDIMENTS_BY_ID } from '../domain/rudiments'
import type { RudimentCategory } from '../domain/pattern'
import { usePractice } from './usePractice'
import { StickingStrip } from './StickingStrip'

const CATEGORY_LABELS: Record<RudimentCategory, string> = {
  roll: 'I. Roll Rudiments',
  diddle: 'II. Diddle Rudiments',
  flam: 'III. Flam Rudiments',
  drag: 'IV. Drag Rudiments',
}

const MIN_BPM = 30
const MAX_BPM = 240

export function App() {
  const [rudimentId, setRudimentId] = useState('single-paradiddle')
  const rudiment = RUDIMENTS_BY_ID.get(rudimentId)!

  const grouped = useMemo(() => {
    const order: RudimentCategory[] = ['roll', 'diddle', 'flam', 'drag']
    return order.map((category) => ({
      category,
      items: RUDIMENTS.filter((r) => r.category === category),
    }))
  }, [])

  const { isPlaying, bpm, metronome, strokes, activeStroke, toggle, setTempo, setMetronome } =
    usePractice(rudiment)

  return (
    <main className="app">
      <header>
        <h1>paddrummer</h1>
        <p className="subtitle">The 40 international drum rudiments</p>
      </header>

      <section className="panel">
        <label className="field">
          <span>Rudiment</span>
          <select value={rudimentId} onChange={(e) => setRudimentId(e.target.value)}>
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

        <label className="field">
          <span>
            Tempo <strong>{bpm}</strong> bpm
          </span>
          <input
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={(e) => setTempo(Number(e.target.value))}
          />
        </label>

        <div className="controls">
          <button type="button" className="play" onClick={toggle}>
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          <label className="toggle">
            <input
              type="checkbox"
              checked={metronome}
              onChange={(e) => setMetronome(e.target.checked)}
            />
            <span>Metronome</span>
          </label>
        </div>
      </section>

      <StickingStrip strokes={strokes} activeIndex={activeStroke} />

      {rudiment.notes ? <p className="note">{rudiment.notes}</p> : null}
    </main>
  )
}
