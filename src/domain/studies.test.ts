import { describe, expect, it } from 'vitest'
import { toNumber } from './fraction'
import { barBeats, placedStrokes } from './phrase'
import { INDEPENDENCE_IDS, STUDIES, STUDIES_BY_ID } from './studies'

const study = (id: string) => STUDIES_BY_ID.get(id)!

const beatsIn = (id: string, lineIndex: number) =>
  placedStrokes(study(id).phrase)
    .filter((p) => p.lineIndex === lineIndex)
    .map((p) => toNumber(p.atBeat))

describe('the studies catalogue', () => {
  it('has unique ids', () => {
    const ids = STUDIES.map((piece) => piece.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every study a name and something to listen for', () => {
    for (const piece of STUDIES) {
      expect(piece.name.length).toBeGreaterThan(0)
      expect(piece.note?.length ?? 0).toBeGreaterThan(0)
    }
  })

  it('never produces an empty phrase', () => {
    for (const piece of STUDIES) {
      expect(placedStrokes(piece.phrase).length).toBeGreaterThan(0)
    }
  })

  it('gives every independence study two lines and a meter', () => {
    for (const id of INDEPENDENCE_IDS) {
      const { phrase } = study(id)
      expect(phrase.lines).toHaveLength(2)
      expect(phrase.meter).not.toBeNull()
    }
  })

  it('makes every independence study a whole number of bars', () => {
    for (const id of INDEPENDENCE_IDS) {
      const { phrase } = study(id)
      const bars = toNumber(phrase.beats) / toNumber(barBeats(phrase.meter!))
      expect(Number.isInteger(bars)).toBe(true)
      expect(bars).toBeGreaterThan(0)
    }
  })

  it('puts the right hand on the upper line of every independence study', () => {
    for (const id of INDEPENDENCE_IDS) {
      const { phrase } = study(id)
      expect(phrase.lines[0]!.hand).toBe('R')
      expect(phrase.lines[1]!.hand).toBe('L')
    }
  })
})

describe('accent displacement', () => {
  it('moves one accent through the group of four', () => {
    for (const position of [0, 1, 2, 3]) {
      const strokes = placedStrokes(study(`accent-on-${position + 1}`).phrase)
      const accented = strokes
        .map((p, i) => (p.stroke.accent ? i : -1))
        .filter((i) => i >= 0)
      expect(accented).toEqual([position, position + 4, position + 8, position + 12])
    }
  })

  it('keeps the sticking strictly alternating whichever note is accented', () => {
    const strokes = placedStrokes(study('accent-on-3').phrase)
    expect(strokes.map((p) => p.stroke.hand).join('')).toBe('RLRLRLRLRLRLRLRL')
  })
})

describe('polyrhythms land exactly', () => {
  it('three against two meets only on the downbeat', () => {
    expect(beatsIn('three-against-two', 0)).toEqual([0, 1, 2])
    expect(beatsIn('three-against-two', 1)).toEqual([0, 1.5])
  })

  it('four against three shares no beat but the first', () => {
    const right = beatsIn('four-against-three', 0)
    const left = beatsIn('four-against-three', 1)
    expect(right).toEqual([0, 1, 2])
    expect(left).toEqual([0, 0.75, 1.5, 2.25])
    const shared = right.filter((beat) => left.includes(beat))
    expect(shared).toEqual([0])
  })

  it('places twelve triplets against eight eighths with no drift', () => {
    const left = beatsIn('triplet-over-straight', 1)
    expect(left).toHaveLength(12)
    // The seventh triplet is exactly two beats in, not 1.9999999999999998.
    expect(left[6]).toBe(2)
    expect(left[11]).toBeCloseTo(11 / 3, 12)
  })
})

describe('odd metres', () => {
  it('walks seven quarters against three halves and a quarter', () => {
    expect(beatsIn('seven-four-walk', 0)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(beatsIn('seven-four-walk', 1)).toEqual([0, 2, 4, 6])
  })

  it('groups seven eighths as 2 + 2 + 3', () => {
    // In quarter-note beats: group heads at 0, 1 and 2, the bar ending at 3.5.
    expect(beatsIn('seven-eight-groups', 1)).toEqual([0, 1, 2])
    expect(toNumber(study('seven-eight-groups').phrase.beats)).toBe(3.5)
  })

  it('spreads the five-four ostinato as 3 + 3 + 4 eighths', () => {
    expect(beatsIn('five-four-ostinato', 1)).toEqual([0, 1.5, 3])
  })
})

describe('two-bar studies', () => {
  it('shifts the displaced left hand one eighth later in the second bar', () => {
    const left = beatsIn('displaced-left', 1)
    expect(left).toEqual([0, 2, 4.5, 6.5])
    // Bar two is bar one plus half a beat, which is one eighth.
    expect(left[2]! - left[0]!).toBe(4.5)
    expect(left[3]! - left[1]!).toBe(4.5)
  })

  it('plays three strikes in the first clave bar and two in the second', () => {
    const left = beatsIn('clave-over-pulse', 1)
    expect(left.filter((beat) => beat < 4)).toHaveLength(3)
    expect(left.filter((beat) => beat >= 4)).toHaveLength(2)
  })
})
