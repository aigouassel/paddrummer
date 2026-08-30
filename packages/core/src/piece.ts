import { fullCycle, type Rudiment } from './pattern'
import { type Phrase, phraseOfStrokes } from './phrase'

/**
 * Something an exercise step can ask you to play.
 *
 * The 40 rudiments are one source of these; composed studies are another. An
 * exercise refers to pieces rather than to rudiments so that a routine can mix
 * a published rudiment with an independence pattern that has no PAS number and
 * never will.
 */
export type Piece = {
  id: string
  name: string
  phrase: Phrase
  /** What to listen for while playing it. */
  note?: string
  /**
   * The tempo this piece is meant to be played at, where its source names one.
   *
   * Absent for most things, and that absence is meaningful rather than a gap
   * waiting to be filled: a rudiment has no tempo of its own — you play it at
   * yours, slowly at first — whereas a transcription was played at a tempo
   * somebody actually chose, and arriving at it any other way misrepresents it.
   */
  bpm?: number
}

export const pieceOfRudiment = (rudiment: Rudiment): Piece => ({
  id: rudiment.id,
  name: rudiment.name,
  phrase: phraseOfStrokes(fullCycle(rudiment)),
  ...(rudiment.notes ? { note: rudiment.notes } : {}),
})
