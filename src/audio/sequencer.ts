import { toNumber } from '../domain/fraction'
import { type Stroke, totalBeats } from '../domain/pattern'
import { type TimedNote, toTimeline } from '../domain/timeline'

/**
 * The loop logic behind playback, with no audio API in sight.
 *
 * Browsers give you two clocks that disagree. `setTimeout` runs on the event
 * loop: it is clamped to ~4ms, drifts under load, and stalls completely while
 * the main thread lays out a page — audible as a stutter. `AudioContext.
 * currentTime` runs on the audio thread and is sample-accurate.
 *
 * The standard fix is not to pick one but to use both: a coarse, jittery timer
 * wakes up every so often and asks "which notes fall due in the next ~120ms?",
 * then hands those to the audio clock to play at exact times. Jitter in the
 * waking timer is absorbed by the lookahead window, so nothing is ever late as
 * long as the timer fires more often than the window is wide.
 *
 * This class owns only the "which notes fall due" half, which makes it a pure
 * function of a timestamp and therefore testable with a fake clock.
 *
 * @see https://web.dev/articles/audio-scheduling
 */

export const DEFAULT_LOOKAHEAD_SEC = 0.12

export class Sequencer {
  /** One cycle of notes, at times relative to the cycle start. */
  private cycle: TimedNote[] = []
  private cycleSec = 0
  private tempo = 100
  private strokes: readonly Stroke[] = []
  private cycleStartSec = 0
  private index = 0
  private playing = false

  constructor(private readonly lookaheadSec: number = DEFAULT_LOOKAHEAD_SEC) {}

  get bpm(): number {
    return this.tempo
  }

  get isPlaying(): boolean {
    return this.playing
  }

  /** Seconds one full pass through the pattern takes at the current tempo. */
  get cycleDurationSec(): number {
    return this.cycleSec
  }

  setPattern(strokes: readonly Stroke[]): void {
    this.strokes = strokes
    this.reanchor(() => this.rebuild())
  }

  setTempo(bpm: number): void {
    if (bpm <= 0) throw new Error(`Sequencer.setTempo: bpm must be positive, got ${bpm}`)
    this.tempo = bpm
    this.reanchor(() => this.rebuild())
  }

  /** @param atSec a time on the audio clock, normally slightly in the future. */
  start(atSec: number): void {
    this.rebuild()
    this.cycleStartSec = atSec
    this.index = 0
    this.playing = true
  }

  stop(): void {
    this.playing = false
  }

  /**
   * Emits every note falling due within the lookahead window, with absolute
   * times. Safe to call more often than needed: each note is emitted once.
   */
  tick(nowSec: number, emit: (note: TimedNote) => void): void {
    if (!this.playing || this.cycle.length === 0 || this.cycleSec <= 0) return

    const horizon = nowSec + this.lookaheadSec
    let emitted = 0

    while (this.timeOf(this.index) < horizon) {
      const note = this.cycle[this.index]!
      emit({ ...note, timeSec: this.timeOf(this.index) })
      this.advance()

      // A pattern shorter than the lookahead window would otherwise spin here.
      if (++emitted > 1000) {
        throw new Error('Sequencer.tick: runaway loop, pattern is too short for the lookahead')
      }
    }
  }

  /** Absolute time of the note the sequencer will emit next. */
  get nextNoteTimeSec(): number {
    return this.timeOf(this.index)
  }

  private timeOf(index: number): number {
    return this.cycleStartSec + (this.cycle[index]?.timeSec ?? 0)
  }

  private advance(): void {
    this.index += 1
    if (this.index >= this.cycle.length) {
      this.index = 0
      this.cycleStartSec += this.cycleSec
    }
  }

  private rebuild(): void {
    this.cycle = toTimeline(this.strokes, this.tempo)
    this.cycleSec = (toNumber(totalBeats(this.strokes)) * 60) / this.tempo
  }

  /**
   * Applies a change without moving the note that is already queued up next.
   *
   * Naively rebuilding mid-loop would recompute every note's offset from the
   * cycle start, so the next note would jump backwards or forwards and the
   * pulse would audibly hiccup. Instead the cycle start is slid so that the
   * next note keeps the time it already had — tempo takes effect from there on.
   */
  private reanchor(change: () => void): void {
    if (!this.playing) {
      change()
      return
    }
    const nextTime = this.timeOf(this.index)
    const indexBefore = this.index
    change()
    this.index = Math.min(indexBefore, Math.max(this.cycle.length - 1, 0))
    this.cycleStartSec = nextTime - (this.cycle[this.index]?.timeSec ?? 0)
  }
}
