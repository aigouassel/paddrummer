import { ONSET_PROCESSOR, onsetWorkletUrl } from '../audio/micWorklet'
import type { Hit } from '@paddrummer/core/scoring'
import type { HitSource } from './hitSource'

export type MicMeter = {
  level: number
  baseline: number
  ready: boolean
}

/**
 * Strikes heard through the microphone.
 *
 * Implements the same three-method port as the keyboard, so scoring, the
 * playhead, calibration and the UI needed no changes to accept it. What it
 * cannot do is say which hand played — a microphone hears one drum, not two
 * sticks — so `hand` is left undefined and the scorer reports `handCorrect`
 * as null rather than guessing.
 */
export class MicrophoneHitSource implements HitSource {
  readonly name = 'microphone'
  private stream: MediaStream | null = null
  private node: AudioWorkletNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private sink: GainNode | null = null
  private listeners = new Set<(hit: Hit) => void>()
  private threshold: number

  constructor(
    private readonly ctx: AudioContext,
    private readonly onMeter: (meter: MicMeter) => void,
    threshold = 4,
  ) {
    this.threshold = threshold
  }

  async start(): Promise<void> {
    if (this.node) return

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // All three of these are actively harmful here. Echo cancellation and
        // noise suppression are built to remove exactly what a stick hit looks
        // like — a short, loud, broadband transient — and automatic gain
        // control rewrites the dynamics that velocity is read from.
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })

    await this.ctx.audioWorklet.addModule(onsetWorkletUrl())

    this.node = new AudioWorkletNode(this.ctx, ONSET_PROCESSOR, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { threshold: this.threshold },
    })

    this.node.port.onmessage = (event: MessageEvent) => {
      const data = event.data as
        | { type: 'onset'; timeSec: number; velocity: number }
        | ({ type: 'meter' } & MicMeter)

      if (data.type === 'onset') {
        const hit: Hit = { timeSec: data.timeSec, velocity: data.velocity }
        for (const listener of this.listeners) listener(hit)
      } else {
        this.onMeter({ level: data.level, baseline: data.baseline, ready: data.ready })
      }
    }

    // A node whose output goes nowhere is not guaranteed to be pulled by the
    // rendering graph, so the worklet is routed to the destination through a
    // silent gain stage. It writes nothing to its output, so this carries no
    // audio — it only keeps the node alive — and there is no path from the
    // microphone back to the speakers.
    this.sink = this.ctx.createGain()
    this.sink.gain.value = 0
    this.sink.connect(this.ctx.destination)

    this.source = this.ctx.createMediaStreamSource(this.stream)
    this.source.connect(this.node)
    this.node.connect(this.sink)
  }

  stop(): void {
    this.source?.disconnect()
    this.node?.port.close()
    this.node?.disconnect()
    this.sink?.disconnect()
    for (const track of this.stream?.getTracks() ?? []) track.stop()
    this.source = null
    this.node = null
    this.sink = null
    this.stream = null
  }

  setThreshold(value: number): void {
    this.threshold = value
    this.node?.port.postMessage({ type: 'threshold', value })
  }

  subscribe(listener: (hit: Hit) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
