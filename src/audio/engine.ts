import { QUARTER } from '../domain/duration'
import type { Fraction } from '../domain/fraction'
import { type Phrase, phraseOfStrokes, placedStrokes } from '../domain/phrase'
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
import { KeyboardHitSource } from '../input/keyboard'
import { MicrophoneHitSource, type MicMeter } from '../input/microphone'
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
export type InputKind = 'keyboard' | 'microphone'
export type MicStatus = 'off' | 'starting' | 'listening' | 'denied' | 'unsupported'

export type EngineState = {
  isPlaying: boolean
  bpm: number
  metronome: boolean
  mode: EngineMode
  latencyMs: number
  calibrationTaps: number
  input: InputKind
  micStatus: MicStatus
  micError: string | null
  sensitivity: number
}

export class PracticeEngine {
  private ctx: AudioContext | null = null
  private kit: Kit | null = null
  private readonly notes = new Sequencer()
  private readonly beats = new Sequencer()
  private timer: ReturnType<typeof setInterval> | null = null
  private phrase: Phrase = phraseOfStrokes([])
  /**
   * Metronome beats in a bar, so the click can mark the downbeat. Four unless
   * the phrase says otherwise — an odd-metre pattern is unlearnable against a
   * click that accents every fourth beat while the bar is seven long.
   */
  private beatsPerBar = 4
  private metronomeOn = true
  private beatCount = 0
  private startedAtSec = 0
  private mode: EngineMode = 'practice'

  /** Notes that have been scheduled, as scoring targets and playhead marks. */
  private expected: ExpectedHit[] = []
  /** Strikes as reported, with no latency correction applied yet. */
  private rawHits: Hit[] = []
  /** Click times gathered during calibration. */
  private clickTimes: number[] = []
  private latencySec = 0

  private detachInput: (() => void) | null = null
  private inputKind: InputKind = 'keyboard'
  private micStatus: MicStatus = 'off'
  private micError: string | null = null
  private mic: MicrophoneHitSource | null = null
  private sensitivity = 4
  /** Kept off the snapshot: it updates ~50 times a second and would thrash React. */
  private meter: MicMeter = { level: 0, baseline: 0, ready: false }
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
    input: 'keyboard',
    micStatus: 'off',
    micError: null,
    sensitivity: 4,
  }

  constructor() {
    // The metronome is just a second sequencer playing one note per beat, so
    // it stays locked to the same clock and the same tempo changes for free.
    this.setClick(null)
    this.useKeyboard()
    this.emit()
  }

  /** Live input meter, polled rather than pushed. See `meter` above. */
  getMeter = (): MicMeter => this.meter

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

  private attachInput(source: HitSource): void | Promise<void> {
    this.detachInput?.()
    const unsubscribe = source.subscribe((hit) => this.recordHit(hit))
    const started = source.start()
    this.detachInput = () => {
      unsubscribe()
      source.stop()
    }
    return started
  }

  useKeyboard(): void {
    this.mic = null
    this.inputKind = 'keyboard'
    this.micStatus = 'off'
    this.micError = null
    this.attachInput(new KeyboardHitSource(this.audioTimeFromPerformance))
    this.emit()
  }

  /**
   * Switches to listening through the microphone.
   *
   * Needs a user gesture twice over: once for the AudioContext, once for the
   * permission prompt. Both are deliberate platform behaviour, so this is only
   * ever called from a click.
   */
  async useMicrophone(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.micStatus = 'unsupported'
      this.micError = 'This browser cannot open a microphone.'
      this.emit()
      return
    }

    this.inputKind = 'microphone'
    this.micStatus = 'starting'
    this.micError = null
    this.emit()

    try {
      const ctx = await this.ensureAudio()
      const mic = new MicrophoneHitSource(
        ctx,
        (meter) => {
          this.meter = meter
        },
        this.sensitivity,
      )
      await mic.start()

      // The permission prompt can sit open indefinitely. If the player gave up
      // and switched back to the keyboard meanwhile, a late "Allow" must not
      // silently reattach the microphone underneath them.
      if (this.inputKind !== 'microphone') {
        mic.stop()
        return
      }

      this.mic = mic
      this.attachInput(mic)
      this.micStatus = 'listening'
    } catch (error) {
      this.mic = null
      this.micStatus = error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'denied'
        : 'unsupported'
      this.micError =
        this.micStatus === 'denied'
          ? 'Microphone permission was refused.'
          : error instanceof Error
            ? error.message
            : 'Could not open the microphone.'
      this.useKeyboard()
    }
    this.emit()
  }

  setSensitivity(value: number): void {
    this.sensitivity = value
    this.mic?.setThreshold(value)
    this.emit()
  }

  recordHit(hit: Hit): void {
    this.rawHits.push(hit)
    if (this.mode === 'calibrating' && this.calibrationComplete()) this.finishCalibration()
    this.emit()
  }

  setPattern(phrase: Phrase): void {
    this.phrase = phrase
    this.notes.setPattern(phrase)
    this.setClick(phrase.meter)
    this.clearHistory()
    this.emit()
  }

  /**
   * Points the metronome at the phrase's meter.
   *
   * The click counts in the meter's own unit, not always in quarters: 7/8 is
   * seven eighth notes, and a click plodding along in quarters would land on
   * the downbeat only every other bar.
   */
  private setClick(meter: Phrase['meter']): void {
    const unit: Fraction = meter ? [4, meter[1]] : QUARTER
    this.beatsPerBar = meter ? meter[0] : 4
    this.beats.setPattern(phraseOfStrokes([{ hand: 'R', duration: unit }]))
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
    if (mode === 'practice' && placedStrokes(this.phrase).length === 0) return

    await this.ensureAudio()
    this.mode = mode
    this.clearHistory()
    this.beatCount = 0

    // Start slightly ahead so the first note is scheduled, never chased.
    const startAt = this.currentTimeSec + 0.15
    this.startedAtSec = startAt
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

  private async ensureAudio(): Promise<AudioContext> {
    this.ctx ??= new AudioContext({ latencyHint: 'interactive' })
    this.kit ??= new Kit(this.ctx)
    if (this.ctx.state === 'suspended') await this.ctx.resume()
    return this.ctx
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

  /**
   * Full cycles of the pattern that have finished sounding.
   *
   * Derived from the audio clock rather than counted as notes are scheduled,
   * because scheduling runs up to 120ms ahead — counting there would advance
   * an exercise to its next step slightly before the player had finished
   * playing the current one.
   */
  get cyclesPlayed(): number {
    const cycleSec = this.notes.cycleDurationSec
    if (!this.notes.isPlaying || cycleSec <= 0) return 0
    return Math.max(0, Math.floor((this.currentTimeSec - this.startedAtSec) / cycleSec))
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
        kit.click(beat.timeSec, this.beatCount % this.beatsPerBar === 0)
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
      input: this.inputKind,
      micStatus: this.micStatus,
      micError: this.micError,
      sensitivity: this.sensitivity,
    }
    for (const listener of this.listeners) listener()
  }
}
