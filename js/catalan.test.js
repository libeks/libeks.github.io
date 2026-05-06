import { expect, test } from 'vitest'
import {
  numericalToHex,
  hexToNumerical,
  parenthesesToNumerical,
  generateIterativeCatalanNumerical,
  genIterCatalanNumericalExpensive,
  genIterNumber,
} from '/js/catalan.js'
import { randomInt } from '/js/math.js'

test('numerical to hex conversion', () => {
  for (let i = 0; i < 62; i++) {
    let hex = numericalToHex(i)
    let num = hexToNumerical(hex)
    // console.log('debug', i, hex, num)
    expect(num).toBe(i)
  }
})

const hexLetters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

test('check hex sequece matches', () => {
  let list = []
  for (let i = 0; i < 62; i++) {
    list.push(numericalToHex(i))
  }
  expect(list.join('')).toBe(hexLetters)
})

test('parenthesesToNumerical', () => {
  let input = '()()()'
  let output = '123456'
  expect(parenthesesToNumerical(input).join('')).toBe(output)
})

test('large parentheses vs numerical calculation', () => {
  for (let i = 0; i < 10; i++) {
    let val = randomInt(10000000000)
    let left = generateIterativeCatalanNumerical(24, val)
    let right = genIterNumber(24, val)
    console.log('left ', left)
    console.log('right', right)
    expect(left).toBe(right)
  }
})
