import { describe, expect, it } from 'vitest'
import { createOnsetDetector } from './onsetDetector.js'

const RATE = 48000
const BLOCK = 128

/** White noise at a given amplitude: a room tone. */
const noise = (amplitude: number, length: number, seed = 1) => {
  const out = new Float32Array(length)
  let state = seed
  for (let i = 0; i < length; i += 1) {
    // Deterministic pseudo-random so failures are reproducible.
    state = (state * 1103515245 + 12345) % 2147483648
    out[i] = ((state / 2147483648) * 2 - 1) * amplitude
  }
  return out
}

/** A stick hit: a sharp transient with an exponential tail. */
const addHit = (buffer: Float32Array, atSample: number, peak = 0.6, decaySec = 0.03) => {
  for (let i = 0; i < decaySec * RATE && atSample + i < buffer.length; i += 1) {
    const envelope = Math.exp(-i / (decaySec * RATE * 0.25))
    const wave = Math.sin((i / RATE) * 2 * Math.PI * 900)
    const index = atSample + i
    buffer[index] = (buffer[index] ?? 0) + peak * envelope * wave
  }
  return buffer
}

/** Feeds a signal through in 128-sample blocks, as an AudioWorklet would. */
const run = (signal: Float32Array, detector = createOnsetDetector()) => {
  const onsets: { timeSec: number; velocity: number }[] = []
  for (let offset = 0; offset < signal.length; offset += BLOCK) {
    const block = signal.subarray(offset, Math.min(offset + BLOCK, signal.length))
    onsets.push(...detector.process(block, offset / RATE, RATE))
  }
  return onsets
}

/** Lets the baseline settle on room tone before the interesting part. */
const withLeadIn = (length: number, amplitude = 0.002) => noise(amplitude, length)

describe('createOnsetDetector', () => {
  it('finds nothing in silence', () => {
    expect(run(new Float32Array(RATE))).toHaveLength(0)
  })

  it('finds nothing in steady room noise', () => {
    expect(run(noise(0.02, RATE))).toHaveLength(0)
  })

  it('detects a single hit once, not once per sample of its tail', () => {
    const signal = withLeadIn(RATE)
    addHit(signal, RATE / 2)
    expect(run(signal)).toHaveLength(1)
  })

  it('places the onset within a few milliseconds of the strike', () => {
    const signal = withLeadIn(RATE)
    const at = 24000
    addHit(signal, at)
    const [onset] = run(signal)
    const errorSec = onset!.timeSec - at / RATE
    // The envelope needs a moment to rise past the trigger level, so the
    // report always lags the transient slightly. What matters is that the lag
    // is small and constant: latency calibration removes a constant offset.
    expect(errorSec).toBeGreaterThanOrEqual(0)
    expect(errorSec).toBeLessThan(0.004)
  })

  it('reports a constant lag, so calibration can remove it', () => {
    const lagFor = (peak: number) => {
      const signal = withLeadIn(RATE)
      addHit(signal, 24000, peak)
      return run(signal)[0]!.timeSec - 24000 / RATE
    }
    expect(Math.abs(lagFor(0.9) - lagFor(0.3))).toBeLessThan(0.002)
  })

  it('reports nothing during the warm-up while the floor settles', () => {
    const detector = createOnsetDetector({ warmupSec: 0.2 })
    const signal = new Float32Array(Math.round(0.1 * RATE))
    addHit(signal, 100, 0.9)
    expect(run(signal, detector)).toHaveLength(0)
    expect(detector.isReady()).toBe(false)
  })

  it('detects a hit that straddles two processing blocks', () => {
    const signal = withLeadIn(RATE)
    // Deliberately not aligned to a 128-sample boundary.
    addHit(signal, 12000 + 63)
    expect(run(signal)).toHaveLength(1)
  })

  it('separates hits played a sixteenth apart at 200bpm', () => {
    const signal = withLeadIn(RATE * 2)
    const spacing = Math.round(0.075 * RATE)
    for (let i = 0; i < 8; i += 1) addHit(signal, RATE / 2 + i * spacing)
    expect(run(signal)).toHaveLength(8)
  })

  it('reports a double-bounce within the refractory window as one stroke', () => {
    const signal = withLeadIn(RATE)
    addHit(signal, RATE / 2)
    addHit(signal, RATE / 2 + Math.round(0.015 * RATE), 0.3)
    expect(run(signal)).toHaveLength(1)
  })

  it('scales velocity with how hard the hit was', () => {
    const at = (peak: number) => {
      const signal = withLeadIn(RATE)
      addHit(signal, RATE / 2, peak)
      return run(signal)[0]!.velocity
    }
    expect(at(0.6)).toBeGreaterThan(at(0.2) * 2)
    // Velocity is a 0..1 scale, so a very hard hit saturates rather than
    // running away — anything above the reference level reads as full.
    expect(at(0.9)).toBeLessThanOrEqual(1)
  })

  it('measures the strike, not the threshold it crossed', () => {
    // Four identical hits must read back as four identical velocities. Sampling
    // the envelope at the trigger instant instead reports the trigger level,
    // which drifts upward as the baseline settles.
    const signal = withLeadIn(RATE * 2)
    for (let i = 0; i < 4; i += 1) addHit(signal, RATE / 2 + i * Math.round(0.3 * RATE), 0.6)
    const velocities = run(signal).map((onset) => onset.velocity)
    expect(velocities).toHaveLength(4)
    const spread = Math.max(...velocities) - Math.min(...velocities)
    expect(spread).toBeLessThan(0.1)
  })

  it('still triggers on a quiet hit in a quiet room', () => {
    // The point of a ratio detector: absolute level is not what matters.
    const signal = withLeadIn(RATE, 0.0005)
    addHit(signal, RATE / 2, 0.05)
    expect(run(signal)).toHaveLength(1)
  })

  it('a higher threshold rejects hits a lower one accepts', () => {
    const build = () => {
      const signal = withLeadIn(RATE)
      addHit(signal, RATE / 2, 0.05)
      return signal
    }
    expect(run(build(), createOnsetDetector({ threshold: 3 }))).toHaveLength(1)
    expect(run(build(), createOnsetDetector({ threshold: 60 }))).toHaveLength(0)
  })

  it('does not let a loud hit raise the baseline enough to mask the next', () => {
    const signal = withLeadIn(RATE * 2)
    addHit(signal, RATE / 2, 0.95)
    addHit(signal, RATE / 2 + Math.round(0.12 * RATE), 0.2)
    expect(run(signal)).toHaveLength(2)
  })

  it('exposes the noise floor it settled on', () => {
    const detector = createOnsetDetector()
    run(noise(0.05, RATE * 2), detector)
    expect(detector.getBaseline()).toBeGreaterThan(0)
    expect(detector.getBaseline()).toBeLessThan(0.05)
  })
})
