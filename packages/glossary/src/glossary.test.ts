import { describe, expect, it } from 'vitest'
import { GROUPS, GROUP_NAMES, TERMS, TERMS_BY_GROUP } from './glossary'

describe('glossary', () => {
  it('defines every term exactly once', () => {
    const names = TERMS.map((entry) => entry.term)
    expect(new Set(names).size).toBe(names.length)
  })

  it('says something about every term', () => {
    for (const entry of TERMS) {
      expect(entry.term.length, entry.term).toBeGreaterThan(1)
      // Long enough to be an explanation rather than a synonym.
      expect(entry.definition.length, entry.term).toBeGreaterThan(40)
    }
  })

  it('never points at a term it does not define', () => {
    // A glossary whose cross-references dangle is worse than one without any:
    // it promises an entry that is not there.
    const defined = new Set(TERMS.map((entry) => entry.term))
    for (const entry of TERMS) {
      for (const other of entry.see ?? []) {
        expect(defined.has(other), `${entry.term} points at missing "${other}"`).toBe(true)
      }
    }
  })

  it('never points a term at itself', () => {
    for (const entry of TERMS) {
      expect(entry.see ?? [], entry.term).not.toContain(entry.term)
    }
  })

  it('files every term under a named group, and leaves no group empty', () => {
    const groups = new Set<string>(GROUPS)
    for (const entry of TERMS) expect(groups.has(entry.group), entry.term).toBe(true)
    for (const group of GROUPS) {
      expect(GROUP_NAMES[group]).toBeTruthy()
      expect(TERMS_BY_GROUP(group).length, group).toBeGreaterThan(0)
    }
  })
})
