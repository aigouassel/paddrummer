import { type Duration, QUINTUPLET_EIGHTH } from '@paddrummer/core/duration'
import { type Hand } from '@paddrummer/core/pattern'
import { type Phrase, phraseOfSticking } from '@paddrummer/core/phrase'
import { type BookPage, type SourceRef, sourceFile } from '../book'
import { CUT, doublesFrom, mirrorSticking, other, repeat } from '../sticking'

// ── page 42 — Short Roll Progressions ───────────────────────────────
//
// Three blocks of eight, ruled off from one another. Every line is a bar
// played twice, and the second is the first restarted on the hand that follows
// its last stroke — which this page states outright in its third block, where
// the second bar is a repeat sign and the letters printed after it name the
// hand to start the repeat on.
//
// The roll that opens a bar is generated, since it is only doubles and the
// page labels it a 9 or 7 stroke roll. The bracketed group answering it is
// written out: it is the thing being progressed through, and follows no rule.

/** One of five eighth notes in the space of four — the page's `5` bracket. */
const FIVE: Duration = QUINTUPLET_EIGHTH
/**
 * Six in the space of four, which is an eighth-note triplet twice over and so
 * needs no bracket of its own. The page draws one `6` where this draws two
 * `3`s; the rhythm is the same and the notes fall in the same places.
 */
const SIX: Duration = '8t'

const handsOfSpec = (spec: string): Hand[] =>
  spec
    .trim()
    .split(/\s+/)
    .filter((token) => token !== '-')
    .map((token) => (token.endsWith('L') ? 'L' : 'R'))

/** A bar, then the same bar led by the hand that follows its last stroke. */
function progressionPhrase(spec: string, slots: Duration[], endsOn: Hand): Phrase {
  const second = other(endsOn) === spec[0] ? spec : mirrorSticking(spec)
  return phraseOfSticking(`${spec} ${second}`, [...slots, ...slots], CUT)
}

/** An open roll in sixteenths, then the bracketed group that answers it. */
function rolledProgression(
  lead: Hand,
  strokes: number,
  rest: boolean,
  tail: string,
  tailSlot: Duration,
): Phrase {
  const spec = `${doublesFrom(lead, strokes)}${rest ? ' -' : ''} ${tail}`
  const slots = [
    ...repeat('16', strokes + (rest ? 1 : 0)),
    ...repeat(tailSlot, tail.split(/\s+/).length),
  ]
  const hands = handsOfSpec(tail)
  return progressionPhrase(spec, slots, hands[hands.length - 1]!)
}

/** The bracketed group, then a closed roll held for a half note. */
function rolledClose(tail: string): Phrase {
  const hands = handsOfSpec(tail)
  const from = other(hands[hands.length - 1]!)
  // Four strokes are printed under the tremolo, so it ends on the other hand.
  return progressionPhrase(
    `${tail} ~${from}`,
    [...repeat(FIVE, hands.length), 'h'],
    other(from),
  )
}

/** Four lines to a block, three blocks, with a rule between each pair. */
const progressionAt = (index: number): SourceRef => ({
  file: sourceFile(42),
  column: Math.floor((index % 8) / 4),
  row: Math.floor(index / 8) * 5 + (index % 4),
  rows: 1,
})

const P42: readonly { phrase: Phrase; note?: string }[] = [
  // 1–8: a roll, then five in the space of four.
  { phrase: rolledProgression('R', 8, false, 'R L R L R', FIVE), note: '9 stroke open roll.' },
  { phrase: rolledProgression('R', 8, false, 'R R L L R', FIVE) },
  { phrase: rolledProgression('R', 8, false, 'R L R R L', FIVE) },
  { phrase: rolledProgression('L', 8, false, 'L R L L R', FIVE) },
  { phrase: rolledProgression('R', 7, true, 'R L R L R', FIVE), note: '7 stroke open roll. The roll ends on a rest.' },
  { phrase: rolledProgression('R', 7, true, 'R R L L R', FIVE), note: 'The roll ends on a rest.' },
  { phrase: rolledProgression('R', 7, true, 'R L R R L', FIVE), note: 'The roll ends on a rest.' },
  { phrase: rolledProgression('L', 7, true, 'L R L L R', FIVE), note: 'The roll ends on a rest.' },

  // 9–16: the five, then a closed roll held out instead.
  { phrase: rolledClose('R L R L R'), note: '9 stroke closed roll, tied into the next bar in the book. Ties are not modelled, so this sounds the same as the 7 stroke version opposite.' },
  { phrase: rolledClose('R R L L R'), note: 'Closed roll, tied into the next bar.' },
  { phrase: rolledClose('R L R R L'), note: 'Closed roll, tied into the next bar.' },
  { phrase: rolledClose('L R L L R'), note: 'Closed roll, tied into the next bar.' },
  { phrase: rolledClose('R L R L R'), note: '7 stroke closed roll — untied.' },
  { phrase: rolledClose('R R L L R'), note: 'Closed roll, untied.' },
  { phrase: rolledClose('R L R R L'), note: 'Closed roll, untied.' },
  { phrase: rolledClose('L R L L R'), note: 'Closed roll, untied.' },

  // 17–24: a roll, then six in the space of four.
  { phrase: rolledProgression('R', 8, false, 'R L R L R L', SIX), note: '9 stroke open roll. The book writes the second bar as a repeat sign, and brackets the six as one group where this draws two triplets.' },
  { phrase: rolledProgression('L', 8, false, 'L R L R L R', SIX), note: 'The book writes the second bar as a repeat sign, and brackets the six as one group where this draws two triplets.' },
  { phrase: rolledProgression('R', 8, false, 'R R L L R R', SIX), note: 'The book writes the second bar as a repeat sign, and brackets the six as one group where this draws two triplets.' },
  { phrase: rolledProgression('R', 8, false, 'R R R L L L', SIX), note: 'The book writes the second bar as a repeat sign, and brackets the six as one group where this draws two triplets.' },
  { phrase: rolledProgression('R', 7, true, 'R L R L R L', SIX), note: '7 stroke open roll, ending on a rest. The book writes the second bar as a repeat sign, and brackets the six as one group where this draws two triplets.' },
  { phrase: rolledProgression('L', 7, true, 'L R L R L R', SIX), note: 'The roll ends on a rest. The book writes the second bar as a repeat sign, and brackets the six as one group where this draws two triplets.' },
  { phrase: rolledProgression('R', 7, true, 'R R L L R R', SIX), note: 'The roll ends on a rest. The book writes the second bar as a repeat sign, and brackets the six as one group where this draws two triplets.' },
  { phrase: rolledProgression('R', 7, true, 'R R R L L L', SIX), note: 'The roll ends on a rest. The book writes the second bar as a repeat sign, and brackets the six as one group where this draws two triplets.' },
]

export const page42: BookPage = {
  page: 42,
  title: 'Short Roll Progressions',
  shape: 'A bar of cut time played twice: an open roll and a bracketed group, or a group and a closed roll.',
  columns: 2,
  lines: 14,
  blankRows: [4, 9],
  exercises: P42.map((line, i) => ({
    n: i + 1,
    phrase: line.phrase,
    ...(line.note ? { note: line.note } : {}),
    at: progressionAt(i),
  })),
}
