import type { Hit } from '../domain/scoring'

/**
 * Where strikes come from.
 *
 * This is the port that keeps scoring testable. A keyboard adapter and a
 * microphone adapter both produce the same stream of timestamped hits, so the
 * judging logic depends on this interface and never on hardware — and a bug in
 * onset detection can never take the scoring tests down with it.
 *
 * The contract that matters: `timeSec` must be on the *audio* clock, already
 * corrected for the source's own latency. Every adapter is responsible for
 * getting itself onto that timebase, because only the adapter knows what its
 * own delay looks like.
 */
export interface HitSource {
  readonly name: string
  start(): Promise<void> | void
  stop(): void
  subscribe(listener: (hit: Hit) => void): () => void
}

/** Converts a `performance.now()`-style timestamp into audio-clock seconds. */
export type AudioTimeMapper = (performanceMs: number) => number
