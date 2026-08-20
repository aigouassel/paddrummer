import { QUARTER } from '../domain/duration'
import { type Stroke, sticking } from '../domain/pattern'
import type { TimedNote } from '../domain/timeline'
import { Kit } from './kit'
import { Sequencer } from './sequencer'

/**
 * Ties the sequencer to real audio.
 *
 * Deliberately a plain class, not React state. React re-renders when the
 * browser schedules them; a metronome cannot wait for that. The engine runs on
 * its own timer against `AudioContext.currentTime`, and the UI merely observes
 * it — see `usePractice` for the subscription side.
 */

/** How often the coarse timer wakes up. Must be well under the lookahead. */
const TICK_MS = 25

/** How long a played note stays queryable for the visual playhead. */
const PLAYHEAD_MEMORY_SEC = 2

export type EngineState = {
  isPlaying: boolean
  bpm: number
  metronome: boolean
}

export class PracticeEngine {
  private ctx: AudioContext | null = null
  private kit: Kit | null = null
  private readonly notes = new Sequencer()
  private readonly beats = new Sequencer()
  private timer: ReturnType<typeof setInterval> | null = null
  private played: { timeSec: number; strokeIndex: number }[] = []
  private beatCount = 0
  private strokes: readonly Stroke[] = []
  private metronomeOn = true
  private listeners = new Set<() => void>()
  /**
   * A cached snapshot, not a freshly built object.
   *
   * `useSyncExternalStore` compares snapshots with Object.is to decide whether
   * to re-render. Returning a new object literal each call means every
   * comparison fails, so React re-renders, reads the snapshot again, sees
   * another new object, and loops until it bails out with "Maximum update
   * depth exceeded". The store must hand back the *same reference* until
   * something actually changes.
   */
  private snapshot: EngineState = { isPlaying: false, bpm: 100, metronome: true }

  constructor() {
    // The metronome is just a second sequencer playing one note per beat, so
    // it stays locked to the same clock and the same tempo changes for free.
    this.beats.setPattern(sticking('R', QUARTER))
    this.emit()
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getState = (): EngineState => this.snapshot

  get currentTimeSec(): number {
    return this.ctx?.currentTime ?? 0
  }

  setPattern(strokes: readonly Stroke[]): void {
    this.strokes = strokes
    this.notes.setPattern(strokes)
    this.played = []
    this.emit()
  }

  setTempo(bpm: number): void {
    this.notes.setTempo(bpm)
    this.beats.setTempo(bpm)
    this.emit()
  }

  setMetronome(on: boolean): void {
    this.metronomeOn = on
    this.emit()
  }

  /**
   * Must be called from a user gesture: browsers start an AudioContext
   * suspended and only let a click resume it, so a metronome that "just plays"
   * on page load is not something the platform allows.
   */
  async start(): Promise<void> {
    if (this.strokes.length === 0) return

    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'interactive' })
      this.kit = new Kit(this.ctx)
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume()

    // Start slightly ahead so the first note is scheduled, never chased.
    const startAt = this.ctx.currentTime + 0.1
    this.beatCount = 0
    this.played = []
    this.notes.start(startAt)
    this.beats.start(startAt)

    this.timer ??= setInterval(() => this.tick(), TICK_MS)
    this.emit()
  }

  stop(): void {
    this.notes.stop()
    this.beats.stop()
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.emit()
  }

  /** Dev-only introspection for debugging the playhead. */
  debug(): unknown {
    return {
      ctx: this.ctx?.state ?? 'none',
      now: this.currentTimeSec,
      playedCount: this.played.length,
      played: this.played.slice(-6),
      active: this.activeStrokeIndex(),
      strokes: this.strokes.length,
    }
  }

  /** Which stroke is sounding right now, or -1. Drives the visual playhead. */
  activeStrokeIndex(): number {
    const now = this.currentTimeSec
    let active = -1
    for (const entry of this.played) {
      if (entry.timeSec <= now) active = entry.strokeIndex
      else break
    }
    return active
  }

  dispose(): void {
    this.stop()
    void this.ctx?.close()
    this.ctx = null
    this.kit = null
    this.listeners.clear()
  }

  private tick(): void {
    const { ctx, kit } = this
    if (!ctx || !kit) return
    const now = ctx.currentTime

    this.notes.tick(now, (note: TimedNote) => {
      kit.strike(note)
      if (note.kind === 'main') {
        this.played.push({ timeSec: note.timeSec, strokeIndex: note.strokeIndex })
      }
    })

    this.beats.tick(now, (beat) => {
      if (this.metronomeOn) kit.click(beat.timeSec, this.beatCount % 4 === 0)
      this.beatCount += 1
    })

    const cutoff = now - PLAYHEAD_MEMORY_SEC
    while (this.played.length > 1 && this.played[0]!.timeSec < cutoff) this.played.shift()
  }

  private emit(): void {
    this.snapshot = {
      isPlaying: this.notes.isPlaying,
      bpm: this.notes.bpm,
      metronome: this.metronomeOn,
    }
    for (const listener of this.listeners) listener()
  }
}
