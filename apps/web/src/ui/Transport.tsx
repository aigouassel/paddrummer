import { TempoControl } from './TempoControl'

/** Centre column, under the stave: what drives the notes above it. */
export function Transport({
  isPlaying,
  disabled,
  bpm,
  defaultBpm,
  onToggle,
  onTempo,
  onResetTempo,
}: {
  isPlaying: boolean
  disabled: boolean
  bpm: number
  defaultBpm?: number
  onToggle: () => void
  onTempo: (bpm: number) => void
  onResetTempo: () => void
}) {
  return (
    <div className="transport-block">
      <div className="transport">
        <button type="button" className="play" onClick={onToggle} disabled={disabled}>
          {isPlaying && !disabled ? 'Stop' : 'Play'}
        </button>

        <TempoControl
          bpm={bpm}
          defaultBpm={defaultBpm}
          onTempo={onTempo}
          onReset={onResetTempo}
        />
      </div>

      <p className="shortcut-hint">
        <kbd>Space</kbd> to start and stop
      </p>
    </div>
  )
}
