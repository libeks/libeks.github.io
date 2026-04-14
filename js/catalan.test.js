// import { expect, jest, test } from '@jest/globals'
import { expect, test } from 'vitest'
// const test = require('node:test')
import { numericalToHex, hexToNumerical } from '/js/catalan.js'

test('numerical to hex conversion', () => {
  for (let i = 0; i < 48; i++) {
    let hex = numericalToHex(i)
    let num = hexToNumerical(hex)
    console.log('debug', i, hex, num)
    expect(num).toBe(i)
  }
})

// testHexNumericals(48)

// // onst sum = require('./sum');

// test('adds 1 + 2 to equal 3', () => {
//   expect(sum(1, 2)).toBe(3)
// })
