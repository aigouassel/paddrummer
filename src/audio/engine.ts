import { QUARTER } from '../domain/duration'
import { type Stroke, sticking } from '../domain/pattern'
import {
  DEFAULT_WINDOWS,
  type Hit,
  type LatencyEstimate,
  type ScoreReport,
  estimateLatency,
  judge,
} from '../domain/scoring'
import type { ExpectedHit, TimedNote } from '../domain/timeline'
import type { HitSource } from '../input/hitSource'
import { Kit } from './kit'
import { Sequencer } from './sequencer'

/**
 * Ties the sequencer to real audio, and to the player.
 *
 * Deliberately a plain class, not React state. React re-renders when the
 * browser schedules them; a metronome cannot wait for that. The engine runs on
 * its own timer against `AudioContext.currentTime`, and the UI merely observes
 * it — see `usePractice` for the subscription side.
 */

/** How often the coarse timer wakes up. Must be well under the lookahead. */
const TICK_MS = 25

/** How much recent history to keep for scoring and the playhead. */
const MEMORY_SEC = 6

/** Beats to collect before a latency estimate is worth trusting. */
export const CALIBRATION_BEATS = 8

export type EngineMode = 'practice' | 'calibrating'

export type EngineState = {
  isPlaying: boolean
  bpm: number
  metronome: boolean
  mode: EngineMode
  latencyMs: number
  calibrationTaps: number
}

export class PracticeEngine {
  private ctx: AudioContext | null = null
  private kit: Kit | null = null
  private readonly notes = new Sequencer()
  private readonly beats = new Sequencer()
  private timer: ReturnType<typeof setInterval> | null = null
  private strokes: readonly Stroke[] = []
  private metronomeOn = true
  private beatCount = 0
  private mode: EngineMode = 'practice'

  /** Notes that have been scheduled, as scoring targets and playhead marks. */
  private expected: ExpectedHit[] = []
  /** Strikes as reported, with no latency correction applied yet. */
  private rawHits: Hit[] = []
  /** Click times gathered during calibration. */
  private clickTimes: number[] = []
  private latencySec = 0

  private detachInput: (() => void) | null = null
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
  private snapshot: EngineState = {
    isPlaying: false,
    bpm: 100,
    metronome: true,
    mode: 'practice',
    latencyMs: 0,
    calibrationTaps: 0,
  }

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

  /**
   * Puts a `performance.now()` timestamp onto the audio clock.
   *
   * The two clocks share no origin, so they have to be correlated.
   * `getOutputTimestamp()` is the right tool: it reports a context time and
   * the performance time *of the same instant*, and specifically of the audio
   * currently reaching the speakers rather than the audio being computed. That
   * is the instant the player actually heard, which is what their strike was
   * answering.
   */
  audioTimeFromPerformance = (performanceMs: number): number => {
    const ctx = this.ctx
    if (!ctx) return 0

    const stamp = ctx.getOutputTimestamp?.()
    if (stamp && stamp.performanceTime !== undefined && stamp.contextTime !== undefined) {
      return stamp.contextTime + (performanceMs - stamp.performanceTime) / 1000
    }
    // Safari has historically omitted getOutputTimestamp; sampling both clocks
    // back to back is less precise but the same idea.
    return ctx.currentTime + (performanceMs - performance.now()) / 1000
  }

  attachInput(source: HitSource): void {
    this.detachInput?.()
    const unsubscribe = source.subscribe((hit) => this.recordHit(hit))
    source.start()
    this.detachInput = () => {
      unsubscribe()
      source.stop()
    }
  }

  recordHit(hit: Hit): void {
    this.rawHits.push(hit)
    if (this.mode === 'calibrating' && this.calibrationComplete()) this.finishCalibration()
    this.emit()
  }

  setPattern(strokes: readonly Stroke[]): void {
    this.strokes = strokes
    this.notes.setPattern(strokes)
    this.clearHistory()
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

  get latencyOffsetSec(): number {
    return this.latencySec
  }

  setLatency(offsetSec: number): void {
    this.latencySec = offsetSec
    this.emit()
  }

  /**
   * Must be called from a user gesture: browsers start an AudioContext
   * suspended and only let a click resume it, so a metronome that "just plays"
   * on page load is not something the platform allows.
   */
  async start(mode: EngineMode = 'practice'): Promise<void> {
    if (mode === 'practice' && this.strokes.length === 0) return

    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'interactive' })
      this.kit = new Kit(this.ctx)
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume()

    this.mode = mode
    this.clearHistory()
    this.beatCount = 0

    // Start slightly ahead so the first note is scheduled, never chased.
    const startAt = this.ctx.currentTime + 0.15
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
    this.mode = 'practice'
    this.emit()
  }

  startCalibration(): Promise<void> {
    return this.start('calibrating')
  }

  private calibrationComplete(): boolean {
    return this.rawHits.length >= CALIBRATION_BEATS
  }

  private finishCalibration(): void {
    const estimate = this.estimate()
    this.stop()
    if (estimate.samples > 0) this.latencySec = estimate.offsetSec
    this.emit()
  }

  /** The latency estimate from the calibration taps collected so far. */
  estimate(): LatencyEstimate {
    return estimateLatency(this.clickTimes, this.rawHits.map((hit) => hit.timeSec))
  }

  /**
   * Scores what has been played so far.
   *
   * Only notes far enough in the past to have been answered are judged: a note
   * that is still inside the timing window has not been missed yet, it just
   * has not been played yet, and grading it now would report a miss that
   * corrects itself a frame later.
   */
  report(): ScoreReport {
    const settledBefore = this.currentTimeSec - DEFAULT_WINDOWS.closeSec
    const settled = this.expected.filter((note) => note.timeSec < settledBefore)
    const corrected = this.rawHits.map((hit) => ({
      ...hit,
      timeSec: hit.timeSec - this.latencySec,
    }))
    return judge(settled, corrected)
  }

  /** Which stroke is sounding right now, or -1. Drives the visual playhead. */
  activeStrokeIndex(): number {
    const now = this.currentTimeSec
    let active = -1
    for (const note of this.expected) {
      if (note.timeSec <= now) active = note.strokeIndex
      else break
    }
    return active
  }

  dispose(): void {
    this.stop()
    this.detachInput?.()
    this.detachInput = null
    void this.ctx?.close()
    this.ctx = null
    this.kit = null
    this.listeners.clear()
  }

  private clearHistory(): void {
    this.expected = []
    this.rawHits = []
    this.clickTimes = []
  }

  private tick(): void {
    const { ctx, kit } = this
    if (!ctx || !kit) return
    const now = ctx.currentTime

    if (this.mode === 'practice') {
      this.notes.tick(now, (note: TimedNote) => {
        kit.strike(note)
        if (note.kind === 'main') {
          this.expected.push({
            strokeIndex: note.strokeIndex,
            timeSec: note.timeSec,
            hand: note.hand,
            accent: note.accent,
          })
        }
      })
    }

    this.beats.tick(now, (beat) => {
      // During calibration the click is the reference, so it always sounds.
      if (this.metronomeOn || this.mode === 'calibrating') {
        kit.click(beat.timeSec, this.beatCount % 4 === 0)
      }
      if (this.mode === 'calibrating') this.clickTimes.push(beat.timeSec)
      this.beatCount += 1
    })

    // Calibration taps must survive until the run completes — a slow tempo
    // takes longer than the practice history window.
    if (this.mode === 'practice') this.forget(now - MEMORY_SEC)
  }

  private forget(before: number): void {
    while (this.expected.length > 1 && this.expected[0]!.timeSec < before) this.expected.shift()
    while (this.rawHits.length > 0 && this.rawHits[0]!.timeSec < before) this.rawHits.shift()
  }

  private emit(): void {
    this.snapshot = {
      isPlaying: this.notes.isPlaying || this.beats.isPlaying,
      bpm: this.notes.bpm,
      metronome: this.metronomeOn,
      mode: this.mode,
      latencyMs: Math.round(this.latencySec * 1000),
      calibrationTaps: this.mode === 'calibrating' ? this.rawHits.length : 0,
    }
    for (const listener of this.listeners) listener()
  }
}
