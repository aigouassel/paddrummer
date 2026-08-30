import { PAD_GROOVES } from '@paddrummer/videos'
import type { RudimentCategory } from '@paddrummer/core/pattern'
import { type Piece, pieceOfRudiment } from '@paddrummer/core/piece'
import { RUDIMENTS } from '@paddrummer/rudiments'
import { INDEPENDENCE_IDS, STUDIES } from '@paddrummer/exercises/studies'

/**
 * Everything you can pick and loop at your own tempo, grouped for a picker.
 *
 * The three pages divide by how you use them rather than by subject: Practice
 * is one piece at your tempo, Exercises is a routine that drives itself, Stick
 * Control is browsing a source. This is Practice's side of that split, so it
 * gathers every piece that makes sense on its own — which is more than the 40
 * rudiments. The studies were reachable only from inside a routine, at the
 * routine's tempo, and a transcribed groove had nowhere to live at all.
 *
 * Sections carry their own descriptions so the picker does not have to know
 * what kind of thing it is showing. That keeps the branching here, where the
 * differences actually are, rather than in a component.
 */

export type CatalogueEntry = {
  piece: Piece
  /** What this piece is: 'No. 12 · Diddle Rudiments', 'Study', 'Pad groove'. */
  kind: string
  /** Anything worth reading before playing it. */
  detail: readonly string[]
}

export type CatalogueSection = {
  id: string
  label: string
  entries: readonly CatalogueEntry[]
}

const RUDIMENT_SECTIONS: readonly [RudimentCategory, string][] = [
  ['roll', 'I. Roll Rudiments'],
  ['diddle', 'II. Diddle Rudiments'],
  ['flam', 'III. Flam Rudiments'],
  ['drag', 'IV. Drag Rudiments'],
]

const rudimentSections: CatalogueSection[] = RUDIMENT_SECTIONS.map(([category, label]) => ({
  id: `rudiments-${category}`,
  label,
  entries: RUDIMENTS.filter((rudiment) => rudiment.category === category).map((rudiment) => ({
    piece: pieceOfRudiment(rudiment),
    kind: `No. ${rudiment.number} · ${label.replace(/^[IVX]+\. /, '')}`,
    detail: [
      ...(rudiment.notes ? [rudiment.notes] : []),
      rudiment.alternates
        ? 'Repeats mirrored, so the pattern leads with each hand in turn.'
        : 'Repeats on the same lead hand.',
    ],
  })),
}))

const independence = new Set(INDEPENDENCE_IDS)

const studySection = (id: string, label: string, kind: string, want: (pieceId: string) => boolean):
  CatalogueSection => ({
  id,
  label,
  entries: STUDIES.filter((piece) => want(piece.id)).map((piece) => ({
    piece,
    kind,
    detail: piece.note ? [piece.note] : [],
  })),
})

const grooveSection: CatalogueSection = {
  id: 'pad-grooves',
  label: 'VII. Pad Grooves',
  entries: PAD_GROOVES.map((groove) => ({
    piece: groove,
    kind: `Pad groove · played at ${groove.bpm} bpm`,
    detail: [
      ...(groove.note ? [groove.note] : []),
      // Provenance, for the same reason a Stick Control exercise carries its
      // page and staff line: a transcription you cannot check is a claim.
      `Transcribed from “${groove.at.title}” — ${groove.at.author}, ` +
        `${groove.at.from.toFixed(1)}–${groove.at.to.toFixed(1)}s.`,
    ],
  })),
}

export const CATALOGUE: readonly CatalogueSection[] = [
  ...rudimentSections,
  studySection('studies', 'V. Studies', 'Study', (id) => !independence.has(id)),
  studySection('independence', 'VI. Hand Independence', 'Hand independence', (id) =>
    independence.has(id)),
  grooveSection,
].filter((section) => section.entries.length > 0)

export const CATALOGUE_BY_ID: ReadonlyMap<string, CatalogueEntry> = new Map(
  CATALOGUE.flatMap((section) => section.entries.map((entry) => [entry.piece.id, entry])),
)

/** What the Practice page opens on. */
export const DEFAULT_PIECE_ID = 'single-paradiddle'
