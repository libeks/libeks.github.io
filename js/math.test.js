import { expect, test, describe } from 'vitest'
import { distance } from '/js/math.js'

describe('distance', () => {
  test('12,0,2', () => {
    expect(distance(12, 0, 2)).toBe(2)
  })
  test('12,10,2', () => {
    expect(distance(12, 10, 2)).toBe(4)
  })
  test('12,5,2', () => {
    expect(distance(12, 5, 2)).toBe(3)
  })
})
