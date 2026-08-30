/**
 * Detects stick hits in a stream of audio samples.
 *
 * Deliberately plain JavaScript with no imports, because this exact source
 * text is inlined into an AudioWorklet at runtime (see `micWorklet.ts`) as
 * well as imported directly by the tests. One implementation, tested on
 * synthetic signals, running on the audio thread.
 *
 * The method compares two smoothed envelopes of the signal: a short one that
 * follows a transient within a couple of milliseconds, and a long one that
 * settles at the room's noise floor. A hit is declared when the short envelope
 * jumps to a multiple of the long one.
 *
 * Two details matter and both were found by testing rather than reasoning:
 *
 * 1. Both envelopes must be *averages*, not peaks. White noise has a high
 *    crest factor — its instantaneous peaks run several times its mean — so a
 *    peak-versus-floor comparison fires continuously in a noisy room, at any
 *    threshold low enough to detect a real hit. Averaging both sides removes
 *    the crest factor from the ratio entirely.
 *
 * 2. A refractory timer alone does not stop one stroke reporting as several.
 *    The tail of a loud hit can still be above the trigger level when the
 *    timer expires. The envelope must also fall back — re-arming — before
 *    another onset can be declared.
 *
 * @typedef {{ timeSec: number, velocity: number }} Onset
 */

/**
 * @param {Partial<{
 *   threshold: number, floor: number, refractorySec: number, rearmRatio: number,
 *   shortSec: number, baselineSec: number, warmupSec: number, velocityReference: number
 * }>} [options]
 */
export function createOnsetDetector(options) {
  const config = {
    /** How far above the noise floor counts as a hit. */
    threshold: 4,
    /** Absolute minimum, so near-silence cannot produce a huge ratio. */
    floor: 0.01,
    /** Hold-off after a hit: a physical double-bounce is still one stroke. */
    refractorySec: 0.05,
    /** How far the envelope must fall, relative to the trigger level, to re-arm. */
    rearmRatio: 0.5,
    /** Transient window. Short enough to be prompt, long enough to average. */
    shortSec: 0.002,
    /** Noise-floor window. Long enough that a hit barely moves it. */
    baselineSec: 0.3,
    /** Silence at the start while the baseline settles on the room. */
    warmupSec: 0.2,
    /**
     * How long to keep watching after an onset to find how hard it really was.
     * Sampling the envelope at the moment it crosses the trigger level measures
     * the *threshold*, not the strike: every hit reads back at almost exactly
     * the level that triggered it. The peak arrives a few milliseconds later.
     */
    peakWindowSec: 0.012,
    /**
     * Short-envelope peak treated as full velocity. Set high enough that
     * ordinary playing spans the range rather than saturating at 1.
     */
    velocityReference: 0.35,
    ...options,
  }

  let short = 0
  let baseline = 0
  let armed = true
  let lastOnsetSec = -Infinity
  let samplesSeen = 0
  /** @type {{ timeSec: number, peak: number } | null} */
  let pending = null
  let rate = 0
  let alphaShort = 0
  let alphaBaseline = 0

  /** One-pole smoothing coefficient for a given time constant. */
  const alphaFor = (seconds) => 1 - Math.exp(-1 / (seconds * rate))

  return {
    /**
     * @param {Float32Array} samples
     * @param {number} blockStartSec time of sample 0 on the audio clock
     * @param {number} sampleRate
     * @returns {Onset[]}
     */
    process(samples, blockStartSec, sampleRate) {
      if (sampleRate !== rate) {
        rate = sampleRate
        alphaShort = alphaFor(config.shortSec)
        alphaBaseline = alphaFor(config.baselineSec)
      }

      const onsets = []
      const warmupSamples = config.warmupSec * rate

      for (let i = 0; i < samples.length; i += 1) {
        const magnitude = Math.abs(samples[i])

        short += (magnitude - short) * alphaShort
        baseline += (magnitude - baseline) * alphaBaseline
        samplesSeen += 1

        if (samplesSeen < warmupSamples) continue

        // Clear the noise floor by the threshold ratio AND clear an absolute
        // minimum, so near-silence cannot produce a huge ratio from nothing.
        const triggerLevel = Math.max(config.floor, baseline * config.threshold)
        const timeSec = blockStartSec + i / sampleRate

        // An onset's time is fixed at the trigger, but its strength is only
        // known once the envelope has peaked, a few milliseconds later.
        if (pending !== null) {
          if (short > pending.peak) pending.peak = short
          if (timeSec - pending.timeSec >= config.peakWindowSec) {
            onsets.push({
              timeSec: pending.timeSec,
              velocity: Math.min(1, pending.peak / config.velocityReference),
            })
            pending = null
          }
        }

        if (armed) {
          if (short > triggerLevel) {
            armed = false
            lastOnsetSec = timeSec
            pending = { timeSec, peak: short }
          }
        } else if (
          short < triggerLevel * config.rearmRatio &&
          timeSec - lastOnsetSec >= config.refractorySec
        ) {
          armed = true
        }
      }

      return onsets
    },

    /** Current short envelope, for an input meter. */
    getLevel() {
      return short
    },

    /** Estimated noise floor, for showing the user why nothing is triggering. */
    getBaseline() {
      return baseline
    },

    /** True once the baseline has settled and hits can be reported. */
    isReady() {
      return samplesSeen >= config.warmupSec * rate
    },

    /** @param {number} value */
    setThreshold(value) {
      config.threshold = value
    },
  }
}
