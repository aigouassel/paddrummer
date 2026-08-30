import { describe, expect, it } from 'vitest'
import { CATALOGUE, CATALOGUE_BY_ID, DEFAULT_PIECE_ID } from './catalogue'
import { PAD_GROOVE } from '@paddrummer/videos'
import { RUDIMENTS } from '@paddrummer/rudiments'
import { STUDIES } from '@paddrummer/exercises/studies'
import { placedStrokes } from '@paddrummer/core/phrase'

describe('practice catalogue', () => {
  it('offers every rudiment, study and groove exactly once', () => {
    const ids = CATALOGUE.flatMap((section) => section.entries.map((e) => e.piece.id))
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(RUDIMENTS.length + STUDIES.length + 1)
  })

  it('opens on a piece that exists', () => {
    expect(CATALOGUE_BY_ID.get(DEFAULT_PIECE_ID)).toBeDefined()
  })

  it('gives every entry something playable and something to read', () => {
    for (const { entries } of CATALOGUE) {
      expect(entries.length).toBeGreaterThan(0)
      for (const entry of entries) {
        expect(placedStrokes(entry.piece.phrase).length).toBeGreaterThan(0)
        expect(entry.kind).not.toBe('')
      }
    }
  })

  it('keeps a transcription checkable by naming its source', () => {
    // The same promise the Stick Control page makes by printing a page and
    // staff line: a transcription nobody can trace back is only a claim.
    for (const groove of [PAD_GROOVE]) {
      const detail = CATALOGUE_BY_ID.get(groove.id)!.detail.join(' ')
      expect(detail).toContain(groove.at.title)
      expect(detail).toContain(groove.at.author)
    }
  })
})
