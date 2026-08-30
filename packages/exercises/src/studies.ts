import { EIGHTH, EIGHTH_TRIPLET, SIXTEENTH } from '@paddrummer/core/duration'
import { type Hand, sticking } from '@paddrummer/core/pattern'
import { line, phraseOfLines, phraseOfStrokes } from '@paddrummer/core/phrase'
import type { Piece } from '@paddrummer/core/piece'

/**
 * Practice patterns that are not rudiments.
 *
 * Two kinds live here. Single-line studies are ordinary stickings that no
 * rudiment book numbers — moving an accent through a run of sixteenths, or the
 * eights-fours-twos-ones pyramid every drummer warms up with. Two-line studies
 * are the independence work: the hands stop taking turns and play against each
 * other, which is a different skill from any rudiment and needs its own
 * notation.
 *
 * Nothing here invents rudiment theory. The single-line studies are accent and
 * grouping exercises whose content is self-evident from the sticking, and the
 * two-line studies are pure rhythm, checkable by arithmetic.
 */

// ── Single-line studies ─────────────────────────────────────────────

/** Alternating sixteenths with one accent moved through the group of four. */
function accentAt(position: number, name: string, note: string): Piece {
  const spec = Array.from({ length: 16 }, (_, i) => {
    const hand: Hand = i % 2 === 0 ? 'R' : 'L'
    return `${i % 4 === position ? '>' : ''}${hand}`
  }).join(' ')

  return {
    id: `accent-on-${position + 1}`,
    name,
    phrase: phraseOfStrokes(sticking(spec, SIXTEENTH)),
    note,
  }
}

/** Repeats a token: `run('R', 8)` is eight right hands, `run('x', 12)` twelve strokes. */
const run = (token: string, count: number): string => Array(count).fill(token).join(' ')

const SINGLE_LINE: Piece[] = [
  {
    id: 'eights-fours-twos-ones',
    name: 'Eights, Fours, Twos, Ones',
    phrase: phraseOfStrokes(
      sticking(
        [
          run('R', 8), run('L', 8),
          run('R', 4), run('L', 4),
          run('R', 2), run('L', 2),
          'R', 'L',
        ].join(' '),
        SIXTEENTH,
      ),
    ),
    note: 'The hand-off is the exercise. Every switch should be invisible — no gap, no bump in volume.',
  },
  {
    id: 'sixteenth-singles',
    name: 'Straight Sixteenths',
    phrase: phraseOfStrokes(sticking(run('R L', 8), SIXTEENTH)),
    note: 'The plainest thing there is, and the one that shows every flaw. Listen for one hand sitting louder than the other.',
  },
  {
    id: 'triplet-singles',
    name: 'Triplet Singles',
    phrase: phraseOfStrokes(sticking(run('R L', 6), EIGHTH_TRIPLET)),
    note: 'Twelve notes, so the lead hand swaps every triplet. If it starts feeling like four groups of three, you have lost the pulse.',
  },
  accentAt(0, 'Accent on One', 'The comfortable one: the accent lands where the pulse already is.'),
  accentAt(1, 'Accent on Two', 'The first genuinely awkward one. The accented note is now on the weak hand.'),
  accentAt(2, 'Accent on Three', 'Halfway round. This one tends to pull the pulse with it — keep your foot honest.'),
  accentAt(3, 'Accent on Four', 'The accent leans into the next beat, which is what makes it sound like a pickup rather than a downbeat.'),
]

// ── Two-line studies: hand independence ─────────────────────────────

/**
 * The hands play separate parts, written on separate lines.
 *
 * These are ordered roughly by difficulty. The early ones keep one hand on a
 * plain pulse so there is something to hold on to; the later ones move both.
 */
const INDEPENDENCE: Piece[] = [
  {
    id: 'hands-apart-3-4',
    name: 'Hands Apart',
    phrase: phraseOfLines(
      [3, 4],
      [line('R', 'x x x', 'q'), line('L', 'x - -', 'q')],
    ),
    note: 'The gentlest possible split: the right hand keeps the bar, the left plays only the downbeat. Get used to reading two lines before the rhythms start disagreeing.',
  },
  {
    id: 'offbeat-left',
    name: 'Offbeat Left',
    phrase: phraseOfLines(
      [4, 4],
      [line('R', 'x x x x', 'q'), line('L', '- x - x - x - x', EIGHTH)],
    ),
    note: 'The left hand never lands with the right. If the two start locking together, slow down until they come apart again.',
  },
  {
    id: 'three-four-lean',
    name: 'Two and Three',
    phrase: phraseOfLines(
      [3, 4],
      [line('R', 'x x x', 'q'), line('L', '- x x', 'q')],
    ),
    note: 'Only the downbeat is played alone. A small change that makes the bar feel like it leans forward.',
  },
  {
    id: 'three-against-two',
    name: 'Three Against Two',
    phrase: phraseOfLines(
      [3, 4],
      [line('R', 'x x x', 'q'), line('L', 'x x', 'q.')],
    ),
    note: 'The first real polyrhythm. The hands meet on the downbeat and nowhere else. Do not count it — learn the sound of the two-note gap.',
  },
  {
    id: 'four-against-three',
    name: 'Four Against Three',
    phrase: phraseOfLines(
      [3, 4],
      [line('R', 'x x x', 'q'), line('L', 'x x x x', '8.')],
    ),
    note: 'Four in the left against three in the right. Harder than three-against-two because neither hand can be treated as the odd one out.',
  },
  {
    id: 'triplet-over-straight',
    name: 'Triplets Over Eighths',
    phrase: phraseOfLines(
      [4, 4],
      [line('R', run('x', 8), EIGHTH), line('L', run('x', 12), EIGHTH_TRIPLET)],
    ),
    note: 'Three against two, stretched over a whole bar. The hands coincide on every beat, so you get four checkpoints per bar.',
  },
  {
    id: 'seven-four-walk',
    name: 'Seven Four Walk',
    phrase: phraseOfLines(
      [7, 4],
      [line('R', 'x x x x x x x', 'q'), line('L', 'x x x x', ['h', 'h', 'h', 'q'])],
    ),
    note: 'Seven quarters against three halves and a quarter. The left hand drifts onto and off the beat and only resolves at the bar line.',
  },
  {
    id: 'five-four-ostinato',
    name: 'Five Four Ostinato',
    phrase: phraseOfLines(
      [5, 4],
      [line('R', 'x x x x x', 'q'), line('L', 'x x x', ['q.', 'q.', 'h'])],
    ),
    note: 'A three-part left hand over a five-beat bar. Count the bar in 3+3+4 eighths and the left hand stops feeling random.',
  },
  {
    id: 'seven-eight-groups',
    name: 'Seven Eight, Grouped',
    phrase: phraseOfLines(
      [7, 8],
      [line('R', 'x x x x x x x', EIGHTH), line('L', 'x - x - x - -', EIGHTH)],
    ),
    note: 'Seven eighths grouped 2 + 2 + 3, the left hand marking each group. The long group at the end is what makes the bar turn over.',
  },
  {
    id: 'displaced-left',
    name: 'Displaced Left',
    phrase: phraseOfLines(
      [4, 4],
      [
        line('R', run('x', 8), 'q'),
        line('L', 'x - - - x - - - | - x - - - x - -', EIGHTH),
      ],
    ),
    note: 'Two bars. The left hand plays the same shape in each, moved one eighth later the second time. The right hand never changes, which is what makes the shift audible.',
  },
  {
    id: 'clave-over-pulse',
    name: 'Clave Over Pulse',
    phrase: phraseOfLines(
      [4, 4],
      [
        line('R', run('x', 8), 'q'),
        line('L', 'x - - x - - x - | - - x - x - - -', EIGHTH),
      ],
    ),
    note: 'A two-bar left-hand figure over a steady pulse. Three strikes in the first bar, two in the second, and the pattern only makes sense across both.',
  },
]

export const STUDIES: readonly Piece[] = [...SINGLE_LINE, ...INDEPENDENCE]

export const STUDIES_BY_ID: ReadonlyMap<string, Piece> = new Map(
  STUDIES.map((piece) => [piece.id, piece]),
)

/** The two-line ones, for callers that want to describe the category. */
export const INDEPENDENCE_IDS: readonly string[] = INDEPENDENCE.map((piece) => piece.id)
