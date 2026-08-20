import type { TimedNote } from '../domain/timeline'

/**
 * Synthesised practice-pad sounds. No samples, so nothing to load.
 *
 * A pad hit is essentially a click: a burst of broadband noise with a very
 * fast decay. Band-pass filtering that noise at two different centre
 * frequencies gives the right and left hands audibly distinct voices, which
 * matters more than realism here — you need to *hear* your sticking to know
 * whether you played RLRR or RLRL.
 */

const NOISE_SECONDS = 0.25

function makeNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * NOISE_SECONDS)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const channel = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) channel[i] = Math.random() * 2 - 1
  return buffer
}

/** Centre frequency per hand: right sits brighter than left. */
const HAND_HZ = { R: 1900, L: 1250 } as const

export class Kit {
  private readonly noise: AudioBuffer
  private readonly master: GainNode

  constructor(private readonly ctx: AudioContext) {
    this.noise = makeNoiseBuffer(ctx)
    this.master = ctx.createGain()
    this.master.gain.value = 0.9
    this.master.connect(ctx.destination)
  }

  set volume(value: number) {
    this.master.gain.value = Math.max(0, Math.min(1, value))
  }

  /** Plays one note of a rudiment at an exact time on the audio clock. */
  strike(note: TimedNote): void {
    const { ctx } = this
    const at = Math.max(note.timeSec, ctx.currentTime)

    const source = ctx.createBufferSource()
    source.buffer = this.noise
    // A buzz is a pressed stroke: same click, dragged out and softened.
    source.playbackRate.value = note.buzz ? 0.6 : 1

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = HAND_HZ[note.hand] * (note.accent ? 1.15 : 1)
    filter.Q.value = note.buzz ? 1.2 : 2.4

    const gain = ctx.createGain()
    const peak = note.kind === 'grace' ? 0.18 : note.accent ? 1 : 0.5
    const decay = note.buzz ? 0.14 : 0.045

    // Ramp up over a millisecond rather than jumping: an instantaneous change
    // in a gain node is a discontinuity in the waveform, which is an audible
    // click on top of the click you actually wanted.
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(peak, at + 0.001)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay)

    source.connect(filter).connect(gain).connect(this.master)
    source.start(at)
    source.stop(at + decay + 0.02)
  }

  /** The metronome. A pitched blip, deliberately unlike the pad sounds. */
  click(timeSec: number, strong: boolean): void {
    const { ctx } = this
    const at = Math.max(timeSec, ctx.currentTime)

    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = strong ? 1600 : 1050

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(strong ? 0.22 : 0.13, at + 0.001)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.035)

    osc.connect(gain).connect(this.master)
    osc.start(at)
    osc.stop(at + 0.05)
  }
}
