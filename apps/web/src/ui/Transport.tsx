const MIN_BPM = 30
const MAX_BPM = 240

/** Centre column, under the stave: what drives the notes above it. */
export function Transport({
  isPlaying,
  disabled,
  bpm,
  onToggle,
  onTempo,
}: {
  isPlaying: boolean
  disabled: boolean
  bpm: number
  onToggle: () => void
  onTempo: (bpm: number) => void
}) {
  return (
    <div className="transport-block">
      <div className="transport">
        <button type="button" className="play" onClick={onToggle} disabled={disabled}>
          {isPlaying && !disabled ? 'Stop' : 'Play'}
        </button>

        <label className="tempo">
          <span className="tempo-value">
            <strong>{bpm}</strong> bpm
          </span>
          <input
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={(event) => onTempo(Number(event.target.value))}
            aria-label="Tempo"
          />
        </label>
      </div>

      <p className="shortcut-hint">
        <kbd>Space</kbd> to start and stop
      </p>
    </div>
  )
}
