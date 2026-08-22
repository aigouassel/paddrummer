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
}

export const pieceOfRudiment = (rudiment: Rudiment): Piece => ({
  id: rudiment.id,
  name: rudiment.name,
  phrase: phraseOfStrokes(fullCycle(rudiment)),
  ...(rudiment.notes ? { note: rudiment.notes } : {}),
})
