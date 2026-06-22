import { expect, test, describe } from 'vitest'
import { reduceIntervals } from '/js/utils.js'

describe('reduceIntervals', () => {
  let fn = (c) => (c > 1 && c < 3) || (c > 4 && c < 5)
  const cases = [
    {
      input: [1, 2, 3, 4, 5, 6],
      want: [
        [1, 3],
        [4, 5],
      ],
    },
    {
      input: [1, 2, 3, 4, 5],
      want: [
        [1, 3],
        [4, 5],
      ],
    },
    {
      input: [0, 1, 2, 3, 4, 5],
      want: [
        [1, 3],
        [4, 5],
      ],
    },
    {
      input: [0, 1],
      want: [],
    },
    {
      input: [1, 1.5, 2, 2.5, 3, 4, 4.1, 4.2, 4.3, 4.5, 4.6, 5, 6, 7],
      want: [
        [1, 3],
        [4, 5],
      ],
    },
  ]

  test.each(cases)(`$input`, ({ input, want }) => {
    let result = reduceIntervals(input, fn)
    // console.log('want ', answer, 'got', result)
    expect(result).toStrictEqual(want)
  })
})
