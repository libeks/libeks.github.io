import { memoize } from './memoize.js'

function catNum(n) {
  // console.log(`computing C${n}`)
  if (n == 0 || n == 1) {
    return 1
  }
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += catalanNumber(i) * catalanNumber(n - i - 1)
  }
  return sum
}

const catalanNumber = memoize(catNum)

// Return a balanced-parenthesis representation of the Catalan Structure Cn with index i
const generateIterativeCatalanExpensive = function (n, i) {
  // console.log("iterative", n, i)
  if (n == 0) {
    return ''
  }
  if (n == 1) {
    return '()'
  }
  let cn = catalanNumber(n)
  if (i >= cn) {
    i = i % cn
  }
  let iter = 0
  for (let a1 = 0; a1 <= n - 1; a1++) {
    let ca1 = catalanNumber(a1)
    let a2 = n - a1 - 1
    let ca2 = catalanNumber(a2)
    for (let j = 0; j < ca1; j++) {
      if (i < ca2) {
        const result = `(${generateIterativeCatalan(a1, j)})${generateIterativeCatalan(a2, i)}`
        return result
      }
      i -= ca2
    }
  }
  return 'unknown'
}

const generateIterativeCatalan = memoize(generateIterativeCatalanExpensive)

function generateCatalanParenthesisSet(n) {
  if (n == 0) {
    return [[]]
  }
  if (n == 1) {
    return [['(', ')']]
  }
  let retList = []
  for (let i = 0; i <= n - 1; i++) {
    let left = generateCatalanParenthesisSet(i)
    let right = generateCatalanParenthesisSet(n - i - 1)
    for (let [i, l] of left.entries()) {
      for (let [j, r] of right.entries()) {
        // console.log("AAA",retList.length, i,j)
        retList.push(['(', ...l, ')', ...r])
      }
    }
  }
  return retList
}

function offsetArrayVals(a, val) {
  return a.map((v) => v + val)
}

function hexConversion(char) {
  if (char < 10) {
    return char
  }
  return String.fromCharCode(65 + (char - 10))
}

function arrayOfArrayToArrayOfNumStrings(a) {
  console.log(a)
  return a.map((entry) => entry.map((char) => hexConversion(char)).join(''))
}

function arrayToNumStrings(a) {
  return a.map((char) => hexConversion(char)).join('')
}

// given a parenthetical representation of a Catalan structure, return the correspoding numerical string
function parenthesesToNumerical(st) {
  let ret = []
  let stack = []
  for (let i = st.length - 1; i >= 0; i--) {
    const char = st[i]
    if (char == ')') {
      stack.push(i + 1)
    } else if (char == '(') {
      const last = stack.pop()
      ret.push([i + 1, last])
    } else {
      throw 'Unknown character'
    }
  }
  return ret.reverse().flat(Infinity) // flatten nested list
}

function generateCatalanNumberSet(n) {
  if (n == 0) {
    return [[]]
  }
  if (n == 1) {
    return [[1, 2]]
  }
  let retList = []
  for (let i = 0; i <= n - 1; i++) {
    let left = generateCatalanNumberSet(i)
    let right = generateCatalanNumberSet(n - i - 1)
    for (let [leftID, l] of left.entries()) {
      for (let [rightID, r] of right.entries()) {
        const gen = generateIterativeCatalan(n, retList.length)
        console.log(
          'generative',
          gen,
          parenthesesToNumerical(gen),
          arrayToNumStrings(parenthesesToNumerical(gen)),
        )
        const val = [1, l.length + 2, ...offsetArrayVals(l, 1), ...offsetArrayVals(r, l.length + 2)]
        retList.push(val)
        // console.log("iterative", val)
      }
    }
  }
  return retList
}

export { catalanNumber, generateCatalanNumberSet }
