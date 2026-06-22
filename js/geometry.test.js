import { expect, test, describe } from 'vitest'
import { Point2DOrigin, Point, Vector, Line } from '/js/geometry.js'

describe('Line.pointProjectionTValue', () => {
  const cases = [
    {
      input: 0.5,
      length: 1,
      want: 0.5,
    },
    {
      input: 1,
      length: 1,
      want: 1,
    },
    {
      input: 0,
      length: 1,
      want: 0,
    },
    {
      input: 10000,
      length: 1,
      want: 10000,
    },
    {
      input: 0.5,
      length: -1,
      want: 0.5,
    },
    {
      input: 1,
      length: -1,
      want: 1,
    },
    {
      input: 0,
      length: -1,
      want: 0,
    },
    {
      input: 10000,
      length: -1,
      want: 10000,
    },
    {
      input: 0.5,
      length: 1000,
      want: 0.5,
    },
    {
      input: 1,
      length: 1000,
      want: 1,
    },
    {
      input: 0,
      length: 1000,
      want: 0,
    },
    {
      input: 10000,
      length: 100,
      want: 10000,
    },
  ]

  test.each(cases)(`$input, $length`, ({ input, length, want }) => {
    let line = new Line(Point2DOrigin, new Vector(length, length))
    let point = line.at(input)
    let result = line.pointProjectionTValue(point)
    // console.log('want ', answer, 'got', result)
    expect(result).toBeCloseTo(want)
  })
})
