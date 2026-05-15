// ============================================================================
// MayorSim — Seeded RNG (mulberry32)
// Deterministic pseudo-random helpers used across the simulation so that
// a given seed always produces the same game evolution.
// ============================================================================

export type RNG = () => number // returns [0, 1)

// Create a mulberry32 RNG from a 32-bit integer seed.
export function createRNG(seed: number): RNG {
  let a = seed >>> 0
  return function (): number {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Deterministic integer in inclusive range [min, max].
export function rngInt(rng: RNG, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

// Deterministic float in half-open range [min, max).
export function rngFloat(rng: RNG, min: number, max: number): number {
  return rng() * (max - min) + min
}

// Pick one item uniformly from an array.
export function rngPick<T>(rng: RNG, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

// Gaussian-ish sample via Box-Muller transform.
export function rngGauss(rng: RNG, mean = 0, stddev = 1): number {
  const u1 = Math.max(rng(), Number.EPSILON)
  const u2 = rng()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return z * stddev + mean
}

// Derive a 32-bit seed from a string via a simple FNV-1a-style hash.
export function seedFromString(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
