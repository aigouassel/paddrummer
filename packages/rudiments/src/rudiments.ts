import { EIGHTH, QUARTER, SIXTEENTH, SIXTEENTH_TRIPLET, type Duration } from '@paddrummer/core/duration'
import { type Rudiment, type RudimentCategory, type Stroke, sticking } from '@paddrummer/core/pattern'

/**
 * The 40 PAS International Drum Rudiments, in official order.
 *
 * `verified: false` marks a rudiment whose sticking or rhythm was not confirmed
 * against a primary source, usually because it has genuine published variants.
 * Verification is parked by decision, and the flag stays as the record of what
 * is outstanding — `UNVERIFIED` lists them. The app does not surface it.
 */

/** N strokes of one duration, then a longer closing note. Every numbered roll. */
const roll = (doubles: string, closer: string): [string, Duration[]] => {
  const spec = `${doubles} ${closer}`
  const count = doubles.trim().split(/\s+/).length
  return [spec, [...Array<Duration>(count).fill(SIXTEENTH), QUARTER]]
}

const make = (
  number: number,
  id: string,
  name: string,
  category: RudimentCategory,
  pattern: Stroke[],
  options: { alternates?: boolean; verified?: boolean; notes?: string } = {},
): Rudiment => ({
  number,
  id,
  name,
  category,
  pattern,
  alternates: options.alternates ?? true,
  verified: options.verified ?? true,
  ...(options.notes ? { notes: options.notes } : {}),
})

export const RUDIMENTS: readonly Rudiment[] = [
  // ── I. Roll Rudiments — A. Single Stroke ──────────────────────────────
  make(1, 'single-stroke-roll', 'Single Stroke Roll', 'roll',
    sticking('R L'), { alternates: false }),

  make(2, 'single-stroke-four', 'Single Stroke Four', 'roll',
    sticking('R L R >L', [SIXTEENTH_TRIPLET, SIXTEENTH_TRIPLET, SIXTEENTH_TRIPLET, EIGHTH]),
    { verified: false, notes: 'Three 16th-note triplets resolving onto a longer accent.' }),

  make(3, 'single-stroke-seven', 'Single Stroke Seven', 'roll',
    sticking('R L R L R L >R',
      [...Array<Duration>(6).fill(SIXTEENTH_TRIPLET), EIGHTH]),
    { verified: false, notes: 'Six 16th-note triplets into a longer accent.' }),

  // ── I. Roll Rudiments — B. Multiple Bounce ───────────────────────────
  make(4, 'multiple-bounce-roll', 'Multiple Bounce Roll', 'roll',
    sticking('R L').map((s) => ({ ...s, buzz: true })), { alternates: false }),

  make(5, 'triple-stroke-roll', 'Triple Stroke Roll', 'roll',
    sticking('R R R L L L', SIXTEENTH_TRIPLET), { alternates: false }),

  // ── I. Roll Rudiments — C. Double Stroke Open Roll ───────────────────
  make(6, 'double-stroke-open-roll', 'Double Stroke Open Roll', 'roll',
    sticking('R R L L'), { alternates: false }),

  make(7, 'five-stroke-roll', 'Five Stroke Roll', 'roll',
    sticking(...roll('R R L L', '>R'))),

  make(8, 'six-stroke-roll', 'Six Stroke Roll', 'roll',
    sticking('>R L L R R >L', SIXTEENTH_TRIPLET),
    { notes: 'Six even notes: accented singles on the outside, two doubles inside.' }),

  make(9, 'seven-stroke-roll', 'Seven Stroke Roll', 'roll',
    sticking(...roll('R R L L R R', '>L'))),

  make(10, 'nine-stroke-roll', 'Nine Stroke Roll', 'roll',
    sticking(...roll('R R L L R R L L', '>R'))),

  make(11, 'ten-stroke-roll', 'Ten Stroke Roll', 'roll',
    sticking('R R L L R R L L >R >L',
      [...Array<Duration>(8).fill(SIXTEENTH), QUARTER, QUARTER]),
    { verified: false, notes: 'Four doubles closing on two accented singles.' }),

  make(12, 'eleven-stroke-roll', 'Eleven Stroke Roll', 'roll',
    sticking(...roll('R R L L R R L L R R', '>L'))),

  make(13, 'thirteen-stroke-roll', 'Thirteen Stroke Roll', 'roll',
    sticking(...roll('R R L L R R L L R R L L', '>R'))),

  make(14, 'fifteen-stroke-roll', 'Fifteen Stroke Roll', 'roll',
    sticking(...roll('R R L L R R L L R R L L R R', '>L'))),

  make(15, 'seventeen-stroke-roll', 'Seventeen Stroke Roll', 'roll',
    sticking(...roll('R R L L R R L L R R L L R R L L', '>R'))),

  // ── II. Diddle Rudiments ─────────────────────────────────────────────
  make(16, 'single-paradiddle', 'Single Paradiddle', 'diddle', sticking('>R L R R')),
  make(17, 'double-paradiddle', 'Double Paradiddle', 'diddle', sticking('>R L R L R R')),
  make(18, 'triple-paradiddle', 'Triple Paradiddle', 'diddle', sticking('>R L R L R L R R')),

  make(19, 'single-paradiddle-diddle', 'Single Paradiddle-Diddle', 'diddle',
    sticking('>R L R R L L'), { alternates: false, notes: 'Repeats on the same lead hand rather than mirroring.' }),

  // ── III. Flam Rudiments ──────────────────────────────────────────────
  make(20, 'flam', 'Flam', 'flam', sticking('l>R', QUARTER)),

  make(21, 'flam-accent', 'Flam Accent', 'flam',
    sticking('l>R L R', [1, 3] as Duration)),

  make(22, 'flam-tap', 'Flam Tap', 'flam', sticking('l>R R')),

  make(23, 'flamacue', 'Flamacue', 'flam',
    sticking('l>R >L R L l>R',
      [SIXTEENTH, SIXTEENTH, SIXTEENTH, SIXTEENTH, QUARTER]),
    { verified: false, notes: 'Flams on the outer notes, accent on the second.' }),

  make(24, 'flam-paradiddle', 'Flam Paradiddle', 'flam', sticking('l>R L R R')),

  make(25, 'single-flammed-mill', 'Single Flammed Mill', 'flam', sticking('l>R R L R')),

  make(26, 'flam-paradiddle-diddle', 'Flam Paradiddle-Diddle', 'flam',
    sticking('l>R L R R L L'),
    { alternates: false, verified: false, notes: 'Played on a single lead hand.' }),

  make(27, 'pataflafla', 'Pataflafla', 'flam',
    sticking('l>R L R r>L'), { notes: 'Flams on the first and fourth notes only.' }),

  make(28, 'swiss-army-triplet', 'Swiss Army Triplet', 'flam',
    sticking('l>R R L', [1, 3] as Duration),
    { notes: 'Three notes in the space of two: durations are thirds, not powers of two.' }),

  make(29, 'inverted-flam-tap', 'Inverted Flam Tap', 'flam',
    sticking('l>R L'),
    { notes: 'Flam and tap fall on opposite hands, which is what inverts it relative to the flam tap.' }),

  make(30, 'flam-drag', 'Flam Drag', 'flam',
    sticking('l>R llR L', [1, 3] as Duration),
    { verified: false, notes: 'Flam, drag, tap as a triplet.' }),

  // ── IV. Drag Rudiments ───────────────────────────────────────────────
  make(31, 'drag', 'Drag (Ruff)', 'drag', sticking('ll>R', QUARTER)),

  make(32, 'single-drag-tap', 'Single Drag Tap', 'drag', sticking('llR >L', EIGHTH)),

  make(33, 'double-drag-tap', 'Double Drag Tap', 'drag',
    sticking('llR llR >L', EIGHTH)),

  make(34, 'lesson-25', 'Lesson 25', 'drag',
    sticking('llR >L R L', EIGHTH),
    { verified: false }),

  make(35, 'single-dragadiddle', 'Single Dragadiddle', 'drag',
    sticking('ll>R R L L'),
    { alternates: false, verified: false, notes: 'A drag replacing the first note of a diddle figure.' }),

  make(36, 'drag-paradiddle-1', 'Drag Paradiddle #1', 'drag',
    sticking('>R ll>R L R R', [QUARTER, SIXTEENTH, SIXTEENTH, SIXTEENTH, SIXTEENTH]),
    { verified: false }),

  make(37, 'drag-paradiddle-2', 'Drag Paradiddle #2', 'drag',
    sticking('>R ll>R L ll>R L R R',
      [QUARTER, SIXTEENTH, SIXTEENTH, SIXTEENTH, SIXTEENTH, SIXTEENTH, SIXTEENTH]),
    { verified: false }),

  make(38, 'single-ratamacue', 'Single Ratamacue', 'drag',
    sticking('llR L R >L', [1, 3] as Duration),
    { verified: false, notes: 'A drag into a triplet closing on an accent.' }),

  make(39, 'double-ratamacue', 'Double Ratamacue', 'drag',
    sticking('llR llR L R >L', [1, 3] as Duration),
    { verified: false }),

  make(40, 'triple-ratamacue', 'Triple Ratamacue', 'drag',
    sticking('llR llR llR L R >L', [1, 3] as Duration),
    { verified: false }),
]

export const RUDIMENTS_BY_ID: ReadonlyMap<string, Rudiment> = new Map(
  RUDIMENTS.map((r) => [r.id, r]),
)

export const rudimentsInCategory = (category: RudimentCategory): Rudiment[] =>
  RUDIMENTS.filter((r) => r.category === category)

export const UNVERIFIED = RUDIMENTS.filter((r) => !r.verified)
