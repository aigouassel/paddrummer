/**
 * What the words mean, for someone reading a stave in this app.
 *
 * Data rather than prose in a component, for the same reason the rudiments
 * are: it can be tested, and a term can be pointed at from anywhere later.
 *
 * The entries lean towards what the app itself does with a word. "Shoulder"
 * has a general meaning on a drum kit, but the fact that matters here is that
 * the pad grooves use it for the snare voice — so the definition says both,
 * and the second half is what makes the notation readable.
 */

export type TermGroup =
  | 'stick'
  | 'voices'
  | 'sticking'
  | 'rudiments'
  | 'rhythm'
  | 'drums'
  | 'app'

export const GROUPS: readonly TermGroup[] = [
  'stick',
  'voices',
  'sticking',
  'rudiments',
  'rhythm',
  'drums',
  'app',
]

export const GROUP_NAMES: Record<TermGroup, string> = {
  stick: 'Parts of the stick',
  voices: 'One pad, several voices',
  sticking: 'Which hand, and how',
  rudiments: 'The rudiment families',
  rhythm: 'Rhythm and notation',
  drums: 'Drums and what stands in for them',
  app: 'Words this app uses',
}

export type Term = {
  term: string
  group: TermGroup
  definition: string
  /** Other terms worth reading next. Every one must itself be defined. */
  see?: readonly string[]
}

export const TERMS: readonly Term[] = [
  // ── Holding the stick ────────────────────────────────────────────
  {
    term: 'Tip',
    group: 'stick',
    definition:
      'The bead at the playing end of the stick. Nearly everything is played with it: it is the lightest part, so it is the part that can move fastest.',
    see: ['Tip stroke', 'Shoulder', 'Butt'],
  },
  {
    term: 'Shoulder',
    group: 'stick',
    definition:
      'The taper just behind the tip, where the stick begins to thicken. Heavier than the tip and less controllable, so it is used for what it sounds like rather than for speed.',
    see: ['Shoulder stroke', 'Tip'],
  },
  {
    term: 'Butt',
    group: 'stick',
    definition:
      'The thick end, opposite the tip. Turning the stick round puts the heaviest part of it on the head.',
    see: ['Butt stroke', 'Tip'],
  },
  {
    term: 'Rebound',
    group: 'stick',
    definition:
      'The stick coming back off the head by itself. Most speed comes from letting it rebound rather than lifting it, which is why a double is easier than two separate strokes.',
    see: ['Diddle', 'Multiple bounce'],
  },

  // ── One pad, several voices ──────────────────────────────────────
  {
    term: 'Tip stroke',
    group: 'voices',
    definition:
      'The ordinary stroke: the bead of the stick on the middle of the pad. It is the one this app does not name on a note, because it is what a stroke is unless something says otherwise.',
    see: ['Tip', 'Shoulder stroke', 'Butt stroke'],
  },
  {
    term: 'Shoulder stroke',
    group: 'voices',
    definition:
      'The stick laid across the pad so the taper behind the tip lands on it, giving a flatter, harder sound. In the pad grooves this is the snare voice — the backbeat you hear on 2 and 4.',
    see: ['Shoulder', 'Snare drum', 'Backbeat'],
  },
  {
    term: 'Butt stroke',
    group: 'voices',
    definition:
      'The stick turned round so the thick end strikes, giving a duller and lower sound. In the pad grooves this is the bass drum. The player holds one stick inverted for the whole clip, which is why the left hand is always the bass voice there.',
    see: ['Butt', 'Bass drum'],
  },
  {
    term: 'Stick-to-stick',
    group: 'voices',
    definition:
      'Striking one stick against the other for a dry click, a common way to get a fourth sound out of a pad. Nothing transcribed here uses it: the app names only the shoulder and the butt, because those are the two that stand in for another drum, and every other stroke is an ordinary tip stroke.',
    see: ['Tip stroke', 'Practice pad'],
  },

  // ── Which hand, and how ──────────────────────────────────────────
  {
    term: 'Sticking',
    group: 'sticking',
    definition:
      'Which hand plays which note, written as R and L under the stave. Two patterns can have the same rhythm and different stickings, and they will not feel the same.',
    see: ['Lead hand', 'Diddle'],
  },
  {
    term: 'Lead hand',
    group: 'sticking',
    definition:
      'The hand a pattern starts on. Many rudiments are practised leading with each hand in turn, which is what "alternates" means where the app says it.',
    see: ['Sticking'],
  },
  {
    term: 'Diddle',
    group: 'sticking',
    definition:
      'Two strokes in a row with the same hand — RR or LL. The unit the paradiddle family is built from.',
    see: ['Paradiddle', 'Rebound'],
  },
  {
    term: 'Accent',
    group: 'sticking',
    definition:
      'A stroke played louder than those around it, written with a > above the note. Accents are what give a stream of even notes a shape.',
    see: ['Backbeat'],
  },
  {
    term: 'Hand independence',
    group: 'sticking',
    definition:
      'The hands playing different rhythms at the same time rather than taking turns. Written on two lines in this app, because two strokes can then fall on the same beat.',
    see: ['Phrase'],
  },

  // ── The rudiment families ────────────────────────────────────────
  {
    term: 'Rudiment',
    group: 'rudiments',
    definition:
      'One of the forty standard patterns published by the Percussive Arts Society. They are the vocabulary: longer pieces are mostly rudiments joined together.',
    see: ['Roll', 'Flam', 'Drag', 'Paradiddle'],
  },
  {
    term: 'Roll',
    group: 'rudiments',
    definition:
      'A sustained sound made from strokes fast enough to blur together. Counted rolls — five, seven, nine stroke — are a fixed number of strokes closing onto a longer accented note.',
    see: ['Multiple bounce', 'Diddle'],
  },
  {
    term: 'Multiple bounce',
    group: 'rudiments',
    definition:
      'A stroke pressed into the head so it bounces several times, giving a buzz rather than distinct notes. Also called a buzz or press stroke; drawn here with three slashes through the stem.',
    see: ['Roll', 'Rebound'],
  },
  {
    term: 'Paradiddle',
    group: 'rudiments',
    definition:
      'RLRR, then LRLL. Two alternating strokes and a diddle, which flips the lead hand each time through — so it never has to be started over.',
    see: ['Diddle', 'Lead hand'],
  },
  {
    term: 'Flam',
    group: 'rudiments',
    definition:
      'A main stroke with a single quieter grace note just before it, played by the other hand. The two are meant to be heard as one thickened note, not as two.',
    see: ['Grace note', 'Drag'],
  },
  {
    term: 'Drag',
    group: 'rudiments',
    definition:
      'Two quiet grace notes from the other hand before the main stroke, rather than the flam’s one. Also called a ruff.',
    see: ['Flam', 'Grace note'],
  },

  // ── Rhythm and notation ──────────────────────────────────────────
  {
    term: 'Beat',
    group: 'rhythm',
    definition:
      'The pulse you count and tap your foot to. What note value gets one beat is set by the metre.',
    see: ['Metre', 'Bpm'],
  },
  {
    term: 'Bar',
    group: 'rhythm',
    definition:
      'A group of beats, marked off by barlines. Also called a measure. The metre says how many beats go in one.',
    see: ['Metre', 'Beat'],
  },
  {
    term: 'Metre',
    group: 'rhythm',
    definition:
      'The time signature: how many beats to a bar, over which note value counts as the beat. 4/4 is four quarter notes; 6/8 is six eighths.',
    see: ['Bar', 'Beat'],
  },
  {
    term: 'Bpm',
    group: 'rhythm',
    definition:
      'Beats per minute — how fast the pulse goes. The same pattern at 60 and at 160 is the same music and a completely different exercise.',
    see: ['Beat'],
  },
  {
    term: 'Subdivision',
    group: 'rhythm',
    definition:
      'How a beat is split. Two eighths, four sixteenths, three triplets — the subdivision is what you count between the beats.',
    see: ['Triplet', 'Beat'],
  },
  {
    term: 'Triplet',
    group: 'rhythm',
    definition:
      'Three notes in the time normally taken by two of the same value. An eighth-note triplet is three notes to one quarter-note beat, drawn with a bracket and a 3.',
    see: ['Sextuplet', 'Tuplet', 'Subdivision'],
  },
  {
    term: 'Sextuplet',
    group: 'rhythm',
    definition:
      'Six notes to the beat — in practice two triplets, or three strokes to a hand at triple-stroke speed. Each one lasts a sixth of a beat.',
    see: ['Triplet'],
  },
  {
    term: 'Tuplet',
    group: 'rhythm',
    definition:
      'The general case: any number of notes squeezed into the time of a different number. Triplets are the common one; the bracket and figure over the notes say the ratio.',
    see: ['Triplet', 'Sextuplet'],
  },
  {
    term: 'Dotted note',
    group: 'rhythm',
    definition:
      'A note with a dot after it lasts half as long again. A dotted eighth followed by a sixteenth is a long-short pair — and is not the same as a triplet, however easily it turns into one.',
    see: ['Subdivision'],
  },
  {
    term: 'Rest',
    group: 'rhythm',
    definition:
      'A measured silence. Written rather than left as a gap, because a silence has a length and the notes after it depend on knowing it.',
    see: ['Bar'],
  },
  {
    term: 'Grace note',
    group: 'rhythm',
    definition:
      'A small note played just before the beat, taking its time from the note it decorates rather than from the bar. Flams and drags are made of them.',
    see: ['Flam', 'Drag'],
  },
  {
    term: 'Backbeat',
    group: 'rhythm',
    definition:
      'The accent on beats 2 and 4 in 4/4 — the snare hit that makes a groove feel like one. It is the figure the pad grooves are built around.',
    see: ['Accent', 'Snare drum'],
  },

  // ── Drums and what stands in for them ────────────────────────────
  {
    term: 'Snare drum',
    group: 'drums',
    definition:
      'The drum rudiments are written for. Wires stretched under the lower head buzz when it is struck, which is where the crack comes from.',
    see: ['Backbeat', 'Practice pad'],
  },
  {
    term: 'Bass drum',
    group: 'drums',
    definition:
      'The largest drum of a kit, played with a foot pedal. On a pad there is no foot to use, so the pad grooves play it with the butt of an inverted stick.',
    see: ['Butt'],
  },
  {
    term: 'Practice pad',
    group: 'drums',
    definition:
      'A rubber or silicone surface on a base, quiet enough to practise on anywhere. It has one sound, which is why a groove played on one has to fake its voices with different parts of the stick.',
    see: ['Shoulder stroke', 'Butt stroke'],
  },

  // ── Words this app uses ──────────────────────────────────────────
  {
    term: 'Phrase',
    group: 'app',
    definition:
      'What the app actually plays, draws and scores: one line of music for a rudiment, two where the hands are independent. Everything on a stave here is one.',
    see: ['Hand independence'],
  },
  {
    term: 'Section',
    group: 'app',
    definition:
      'A named stretch of a longer piece, printed above the bar it starts on. In a video transcription they are the player’s own words as the clip goes along.',
    see: ['Transcription'],
  },
  {
    term: 'Transcription',
    group: 'app',
    definition:
      'Music written down from a source that was not notation — a photographed book page, or a video. Everything transcribed here carries where it came from, so it can be checked rather than believed.',
    see: ['Section', 'Grid'],
  },
  {
    term: 'Grid',
    group: 'app',
    definition:
      'The beat map fitted to a video’s audio: the tempo, where beat one falls, and how strong the onset is at every sixteenth. It is the evidence a video transcription is read off, and it is committed so the reading stays checkable without the clip.',
    see: ['Transcription', 'Bpm'],
  },
  {
    term: 'Latency',
    group: 'app',
    definition:
      'The delay between a note sounding and the app noticing your strike — from the microphone, the audio hardware and the browser together. Calibrating measures it so your timing is scored fairly rather than as late.',
    see: ['Bpm'],
  },
]

export const TERMS_BY_GROUP = (group: TermGroup): Term[] =>
  TERMS.filter((entry) => entry.group === group)

/**
 * A term as a URL fragment.
 *
 * Terms are prose — "Multiple bounce", "Stick-to-stick" — and an `id` may not
 * contain a space, so linking to one straight would produce an anchor that
 * silently goes nowhere. Everything that links to a term goes through here so
 * the two ends cannot disagree.
 */
export const slug = (term: string): string =>
  term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
