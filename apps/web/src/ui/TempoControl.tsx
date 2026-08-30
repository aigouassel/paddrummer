/**
 * The tempo readout, its slider, and the way back to the piece's own tempo.
 *
 * One component for all three pages. It used to be three copies that had
 * quietly drifted apart — the stave transport allowed 30–240 and the two sheet
 * transports 40–200 — which is the kind of difference nobody chooses and
 * everybody inherits.
 *
 * A fragment rather than a wrapper: both transports are flex rows that place
 * the readout and the reset button themselves, and interposing a div would
 * make this component responsible for a layout that is not its business.
 */
export const MIN_BPM = 30
export const MAX_BPM = 240

export function TempoControl({
  bpm,
  defaultBpm,
  onTempo,
  onReset,
}: {
  bpm: number
  /** undefined where the piece names no tempo of its own. */
  defaultBpm?: number
  onTempo: (bpm: number) => void
  onReset: () => void
}) {
  // Shown only once there is something to go back to. A button that is always
  // there but does nothing most of the time teaches you to stop reading it.
  const changed = defaultBpm !== undefined && bpm !== defaultBpm

  return (
    <>
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

      {changed ? (
        <button
          type="button"
          className="tempo-reset"
          onClick={onReset}
          title={`Back to ${defaultBpm} bpm, the tempo this was played at`}
        >
          ↺ {defaultBpm}
        </button>
      ) : null}
    </>
  )
}
