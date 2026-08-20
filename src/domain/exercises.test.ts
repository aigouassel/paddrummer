import { describe, expect, it } from 'vitest'
import {
  EXERCISES,
  EXERCISES_BY_ID,
  exerciseDurationSec,
  formatDuration,
  rudimentForStep,
  stepDurationSec,
} from './exercises'
import { RUDIMENTS_BY_ID } from './rudiments'

describe('exercise catalogue', () => {
  it('has unique ids', () => {
    expect(EXERCISES_BY_ID.size).toBe(EXERCISES.length)
  })

  it('only references rudiments that exist', () => {
    for (const exercise of EXERCISES) {
      for (const step of exercise.steps) {
        expect(RUDIMENTS_BY_ID.has(step.rudimentId), `${exercise.id}: ${step.rudimentId}`).toBe(
          true,
        )
      }
    }
  })

  it('keeps every tempo inside the range the app offers', () => {
    for (const exercise of EXERCISES) {
      for (const step of exercise.steps) {
        expect(step.bpm, exercise.id).toBeGreaterThanOrEqual(30)
        expect(step.bpm, exercise.id).toBeLessThanOrEqual(240)
      }
    }
  })

  it('asks for at least one repeat of every step', () => {
    for (const exercise of EXERCISES) {
      for (const step of exercise.steps) expect(step.repeats).toBeGreaterThan(0)
    }
  })

  it('is short enough to actually finish', () => {
    for (const exercise of EXERCISES) {
      const seconds = exerciseDurationSec(exercise)
      expect(seconds, exercise.id).toBeGreaterThan(20)
      expect(seconds, exercise.id).toBeLessThan(15 * 60)
    }
  })
})

describe('stepDurationSec', () => {
  it('halves when the tempo doubles', () => {
    const slow = { rudimentId: 'single-paradiddle', bpm: 60, repeats: 4 }
    const fast = { ...slow, bpm: 120 }
    expect(stepDurationSec(slow)).toBeCloseTo(stepDurationSec(fast) * 2, 6)
  })

  it('counts a full cycle, both lead hands included', () => {
    // A paradiddle cycle is RLRR LRLL: two beats, so four repeats at 60bpm
    // is eight seconds.
    expect(stepDurationSec({ rudimentId: 'single-paradiddle', bpm: 60, repeats: 4 })).toBeCloseTo(
      8,
      6,
    )
  })

  it('rejects a step naming a rudiment that does not exist', () => {
    expect(() => rudimentForStep({ rudimentId: 'nope', bpm: 90, repeats: 1 })).toThrow(
      /Unknown rudiment/,
    )
  })
})

describe('formatDuration', () => {
  it('reads naturally', () => {
    expect(formatDuration(20)).toBe('under a minute')
    expect(formatDuration(200)).toBe('about 3 min')
  })
})
