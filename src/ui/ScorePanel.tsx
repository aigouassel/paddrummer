import type { ScoreReport } from '../domain/scoring'

const pct = (value: number) => `${Math.round(value * 100)}%`
const ms = (seconds: number) => `${seconds >= 0 ? '+' : ''}${Math.round(seconds * 1000)}ms`

/**
 * Live feedback while practising.
 *
 * Median offset is shown separately from accuracy because they mean different
 * things to a drummer: a low accuracy says your timing is inconsistent, while
 * a large median offset says it is perfectly consistent and simply behind the
 * beat. The second is a much easier fix, and averaging them together would
 * hide it.
 */
export function ScorePanel({
  report,
  showSticking,
}: {
  report: ScoreReport | null
  /** A microphone hears one drum, not two sticks, so it cannot judge sticking. */
  showSticking: boolean
}) {
  if (!report || report.summary.total === 0) {
    return <p className="hint">Start playing and your timing will appear here.</p>
  }

  const { summary } = report

  return (
    <dl className="stats">
      <div>
        <dt>Accuracy</dt>
        <dd>{pct(summary.accuracy)}</dd>
      </div>
      <div>
        <dt>Timing</dt>
        <dd>
          {summary.medianOffsetSec === null ? '—' : ms(summary.medianOffsetSec)}
          {summary.medianOffsetSec !== null ? (
            <span className="qualifier">
              {summary.medianOffsetSec > 0.012
                ? 'behind'
                : summary.medianOffsetSec < -0.012
                  ? 'ahead'
                  : 'on the beat'}
            </span>
          ) : null}
        </dd>
      </div>
      {showSticking ? (
        <div>
          <dt>Sticking</dt>
          <dd>{summary.handErrors === 0 ? 'clean' : `${summary.handErrors} wrong`}</dd>
        </div>
      ) : null}
      <div>
        <dt>Dropped</dt>
        <dd>
          {summary.missed} missed{summary.extra > 0 ? `, ${summary.extra} extra` : ''}
        </dd>
      </div>
    </dl>
  )
}
