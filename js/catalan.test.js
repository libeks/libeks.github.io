import { expect, test, describe } from 'vitest'
import {
  numericalToHex,
  hexToNumerical,
  parenthesesToNumerical,
  generateIterativeCatalanNumerical,
  genIterCatalanNumericalExpensive,
  genIterNumber,
  generateIterativeCatalanParentheses,
} from '/js/catalan.js'
import { randomInt } from '/js/math.js'

describe('catalan parentheses', () => {
  const cases = [
    { n: 10, i: 10000, answer: '((()())()(()()))()()' },
    { n: 12, i: 10000, answer: '()()((()())()(()()))()()' },
    { n: 10, i: 1111111, answer: '()(()(()()()))()(())' },
    { n: 10, i: 9111111, answer: '(((())))()()()()(())' },
    { n: 10, i: 8111111, answer: '((()()((()()))(())))' },
    { n: 10, i: 7111111, answer: '(()())()(((()))()())' },
    { n: 10, i: 6111111, answer: '(((())())((()))(()))' },
    { n: 10, i: 5111111, answer: '(())()(()(()(())))()' },
    { n: 10, i: 4111111, answer: '(()((((()))())())())' },
    { n: 10, i: 3111111, answer: '()(()(((()((()))))))' },
    { n: 10, i: 2111111, answer: '((()((())(())())))()' },
  ]

  test.each(cases)(`$n:$i`, ({ n, i, answer }) => {
    let result = generateIterativeCatalanParentheses(n, i)
    // console.log('want ', answer, 'got', result)
    expect(result).toBe(answer)
  })
})

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

// test('large parentheses vs numerical calculation', () => {
//   for (let i = 0; i < 10; i++) {
//     let val = randomInt(10000000000)
//     let left = generateIterativeCatalanNumerical(24, val)
//     let right = genIterNumber(24, val)
//     console.log('left ', left)
//     console.log('right', right)
//     expect(left).toBe(right)
//   }
// })
