/**
 * Exact rational arithmetic.
 *
 * Rhythm is fundamentally rational: a 16th note is 1/4 of a beat, a 16th-note
 * triplet is exactly 1/6. Floats do not survive that second one. A bar of 24
 * 16th-note triplets summed as `1/6` lands on 3.9999999999999982 rather than
 * 4, so the bar line drifts and any "does this stroke fall on beat 3?" test
 * silently fails. Integers keep every duration exact; we convert to a float
 * exactly once, at the boundary where a time in seconds is actually needed.
 */

export type Fraction = readonly [numerator: number, denominator: number]

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))

/** Builds a fraction in lowest terms, with the sign carried by the numerator. */
export function fraction(numerator: number, denominator: number): Fraction {
  if (denominator === 0) throw new Error('fraction: denominator must not be zero')
  const sign = denominator < 0 ? -1 : 1
  const divisor = gcd(numerator, denominator) || 1
  return [(sign * numerator) / divisor, (sign * denominator) / divisor]
}

export const ZERO: Fraction = [0, 1]

export const add = (a: Fraction, b: Fraction): Fraction =>
  fraction(a[0] * b[1] + b[0] * a[1], a[1] * b[1])

export const times = (f: Fraction, factor: number): Fraction => fraction(f[0] * factor, f[1])

export const sum = (fractions: readonly Fraction[]): Fraction => fractions.reduce(add, ZERO)

/** Cross-multiplied, so 2/4 and 1/2 compare equal without normalising first. */
export const equals = (a: Fraction, b: Fraction): boolean => a[0] * b[1] === b[0] * a[1]

/** The one lossy operation. Call it as late as possible. */
export const toNumber = (f: Fraction): number => f[0] / f[1]

/**
 * Orders two fractions. Cross-multiplied rather than compared as floats:
 * sorting two hands onto one timeline must put 1/3 and 2/6 in a stable order,
 * and float division can make equal values compare unequal.
 */
export const compare = (a: Fraction, b: Fraction): number => a[0] * b[1] - b[0] * a[1]
