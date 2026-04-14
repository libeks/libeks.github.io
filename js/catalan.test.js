import { expect, test } from 'vitest'
import { numericalToHex, hexToNumerical } from '/js/catalan.js'

test('numerical to hex conversion', () => {
  for (let i = 0; i < 48; i++) {
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
