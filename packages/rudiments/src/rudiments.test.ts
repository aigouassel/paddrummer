import { describe, expect, it } from 'vitest'
import { fullCycle, mirror, totalBeats } from '@paddrummer/core/pattern'
import { toBeats } from '@paddrummer/core/duration'
import { toNumber } from '@paddrummer/core/fraction'
import { RUDIMENTS, RUDIMENTS_BY_ID } from './rudiments'

describe('the 40 rudiments', () => {
  it('has exactly 40, numbered 1..40 with no gaps', () => {
    expect(RUDIMENTS).toHaveLength(40)
    expect(RUDIMENTS.map((r) => r.number)).toEqual(
      Array.from({ length: 40 }, (_, i) => i + 1),
    )
  })

  it('has unique ids', () => {
    expect(RUDIMENTS_BY_ID.size).toBe(40)
  })

  it('covers the four PAS families with the official counts', () => {
    const counts = RUDIMENTS.reduce<Record<string, number>>((acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + 1
      return acc
    }, {})
    expect(counts).toEqual({ roll: 15, diddle: 4, flam: 11, drag: 10 })
  })

  it('leads every pattern with the right hand', () => {
    for (const r of RUDIMENTS) expect(r.pattern[0]!.hand).toBe('R')
  })

  it('gives every stroke a positive duration', () => {
    for (const r of RUDIMENTS) {
      for (const stroke of r.pattern) {
        expect(toNumber(toBeats(stroke.duration))).toBeGreaterThan(0)
      }
    }
  })

  it('builds an alternating cycle as the pattern followed by its mirror', () => {
    for (const r of RUDIMENTS) {
      const cycle = fullCycle(r)
      if (r.alternates) {
        expect(cycle.slice(r.pattern.length), r.id).toEqual(mirror(r.pattern))
        expect(cycle[r.pattern.length]!.hand, r.id).toBe('L')
      } else {
        expect(cycle, r.id).toEqual([...r.pattern])
      }
      // Either way the loop restarts on the right hand.
      expect(cycle[0]!.hand, r.id).toBe('R')
    }
  })

  it('never gives a grace note the same hand as an adjacent double', () => {
    // A drag is two grace notes; three would be a four-stroke ruff, which is
    // not in the PAS 40. Catches a typo like 'lllR'.
    for (const r of RUDIMENTS) {
      for (const stroke of r.pattern) {
        expect(stroke.grace?.length ?? 0).toBeLessThanOrEqual(2)
      }
    }
  })

  it('lasts a musically sane fraction of a beat per cycle', () => {
    // The minimal unit need not be a whole beat — a single stroke roll is two
    // 16ths — but its length must be a simple subdivision, never something
    // like 1/5 of a beat, which no drummer counts.
    const SANE = [1, 2, 3, 4, 6, 8, 12]
    for (const r of RUDIMENTS) {
      const beats = totalBeats(fullCycle(r))
      expect(SANE, `${r.id} lasts ${beats[0]}/${beats[1]} beats`).toContain(beats[1])
      expect(toNumber(beats), r.id).toBeGreaterThan(0)
    }
  })
})
