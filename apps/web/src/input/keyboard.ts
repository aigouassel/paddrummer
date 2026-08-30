import type { Hand } from '@paddrummer/core/pattern'
import type { Hit } from '@paddrummer/core/scoring'
import type { AudioTimeMapper, HitSource } from './hitSource'

/**
 * Strikes from two keys, one per hand.
 *
 * Worth having in its own right — you can practise sticking on a laptop with
 * no pad — but it also earns its keep as the reference adapter. It is the only
 * source that knows which hand played, so it is the only way to test the
 * sticking-error path end to end, and it makes latency calibration provable
 * before the microphone is involved.
 */

export const DEFAULT_KEYMAP: Record<string, Hand> = {
  f: 'L',
  j: 'R',
  arrowleft: 'L',
  arrowright: 'R',
}

export class KeyboardHitSource implements HitSource {
  readonly name = 'keyboard'
  private listeners = new Set<(hit: Hit) => void>()
  private attached = false

  constructor(
    private readonly toAudioTime: AudioTimeMapper,
    private readonly keymap: Record<string, Hand> = DEFAULT_KEYMAP,
    private readonly target: EventTarget = window,
  ) {}

  start(): void {
    if (this.attached) return
    this.target.addEventListener('keydown', this.onKeyDown)
    this.attached = true
  }

  stop(): void {
    if (!this.attached) return
    this.target.removeEventListener('keydown', this.onKeyDown)
    this.attached = false
  }

  subscribe(listener: (hit: Hit) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private onKeyDown = (event: Event): void => {
    const keyEvent = event as KeyboardEvent

    // Held keys repeat at the OS key-repeat rate, which would read as a
    // spectacular buzz roll. Only the initial press is a strike.
    if (keyEvent.repeat) return

    const hand = this.keymap[keyEvent.key.toLowerCase()]
    if (!hand) return
    keyEvent.preventDefault()

    // event.timeStamp is when the browser received the press, not when this
    // handler ran, so it survives a busy main thread that delays dispatch.
    const hit: Hit = { timeSec: this.toAudioTime(keyEvent.timeStamp), hand }
    for (const listener of this.listeners) listener(hit)
  }
}
