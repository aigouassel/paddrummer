import detectorSource from './onsetDetector.js?raw'

/**
 * The AudioWorklet processor, assembled at runtime.
 *
 * A worklet runs in its own global scope with no module graph, so it cannot
 * import the detector. Rather than keep a second copy of the algorithm — which
 * would drift from the tested one the first time either changed — the detector's
 * own source text is pulled in with Vite's `?raw` and inlined verbatim. What
 * runs on the audio thread is byte-for-byte what the unit tests exercise.
 *
 * Detection has to live here rather than on the main thread. `ScriptProcessor`
 * ran audio callbacks on the event loop, where a React render or a layout pass
 * would delay or drop them; an AudioWorklet runs on the audio rendering thread,
 * so it sees every sample on time regardless of what the page is doing.
 */
const PROCESSOR_SOURCE = `
${detectorSource.replace(/^export /gm, '')}

class OnsetProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this.detector = createOnsetDetector(options.processorOptions ?? {})
    this.blocks = 0
    this.port.onmessage = (event) => {
      if (event.data && event.data.type === 'threshold') {
        this.detector.setThreshold(event.data.value)
      }
    }
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (!channel) return true

    // \`currentTime\` is the audio-clock time of this render quantum's first
    // sample, so onsets come back already on the same timebase as the notes.
    const onsets = this.detector.process(channel, currentTime, sampleRate)
    for (let i = 0; i < onsets.length; i += 1) {
      this.port.postMessage({ type: 'onset', timeSec: onsets[i].timeSec, velocity: onsets[i].velocity })
    }

    // The meter is for a human eye; 128 samples is far finer than needed.
    this.blocks += 1
    if (this.blocks % 8 === 0) {
      this.port.postMessage({
        type: 'meter',
        level: this.detector.getLevel(),
        baseline: this.detector.getBaseline(),
        ready: this.detector.isReady(),
      })
    }
    return true
  }
}

registerProcessor('onset-processor', OnsetProcessor)
`

export const ONSET_PROCESSOR = 'onset-processor'

let cachedUrl: string | null = null

/** A blob URL for the processor, built once per page. */
export function onsetWorkletUrl(): string {
  cachedUrl ??= URL.createObjectURL(new Blob([PROCESSOR_SOURCE], { type: 'application/javascript' }))
  return cachedUrl
}
