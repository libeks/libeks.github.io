import { bench, describe } from 'vitest'
import { generateIterativeCatalanNumerical, genIterNumber } from '/js/catalan.js'
import { randomInt } from '/js/math.js'

const iterations = 3

describe('catalan', () => {
  bench('parenthesis', () => {
    // const x = [1, 5, 4, 2, 3]
    for (let i = 0; i < iterations; i++) {
      generateIterativeCatalanNumerical(24, randomInt(10000000000))
    }
  })

  bench('numerical', () => {
    // const x = [1, 5, 4, 2, 3]
    for (let i = 0; i < iterations; i++) {
      genIterNumber(24, randomInt(10000000000))
    }
  })
})
