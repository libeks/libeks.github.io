import { expect, test, describe } from 'vitest'

import { Random } from '/js/random.js'

import { range } from '/js/utils.js'

describe('Random seeds with 10 floats', () => {
  const cases = [
    {
      seed: 0,
      expected: [
        0.010760767618194222, 0.07081504235975444, 0.3984240819700062, 0.6267975640948862,
        0.954259000485763, 0.16246909322217107, 0.7212555108126253, 0.03538378071971238,
        0.41107764677144587, 0.17406257870607078,
      ],
    },
    {
      seed: 1,
      expected: [
        0.7671159675810486, 0.06008386518806219, 0.442305383970961, 0.554736006539315,
        0.1874751397408545, 0.9629695697221905, 0.7003439890686423, 0.9109590570442379,
        0.06464476138353348, 0.48631556052714586,
      ],
    },
  ]

  test.each(cases)(`$seed`, ({ seed, expected }) => {
    let rand = new Random(seed)

    let result = []
    for (let i = 0; i < 10; i++) {
      result.push(rand.float())
    }
    expect(result).toStrictEqual(expected)
  })
})

describe('Random seeds with 10 integers', () => {
  const cases = [
    {
      seed: 0,
      n: 100,
      expected: [1, 7, 39, 62, 95, 16, 72, 3, 41, 17],
    },
    {
      seed: 1,
      n: 20,
      expected: [15, 1, 8, 11, 3, 19, 14, 18, 1, 9],
    },
  ]

  test.each(cases)(`$seed`, ({ seed, n, expected }) => {
    let rand = new Random(seed)

    let result = []
    for (let i = 0; i < 10; i++) {
      result.push(rand.int(n))
    }
    expect(result).toStrictEqual(expected)
  })
})

describe('Random seeds with 1 float', () => {
  const cases = [
    { seed: 0, expected: 0.010760767618194222 },
    { seed: 1, expected: 0.7671159675810486 },
  ]

  test.each(cases)(`$seed`, ({ seed, expected }) => {
    let rand = new Random(seed)
    let result = rand.float()
    expect(result).toBe(expected)
  })
})
