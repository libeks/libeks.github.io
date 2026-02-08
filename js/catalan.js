import { memoize } from './memoize.js'

function catNum(n) {
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
const generateIterativeCatalanParenthesisExpensive = function (n, i) {
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
        const result = `(${generateIterativeCatalanParentheses(a1, j)})${generateIterativeCatalanParentheses(a2, i)}`
        return result
      }
      i -= ca2
    }
  }
  return 'unknown'
}

const generateIterativeCatalanParentheses = memoize(generateIterativeCatalanParenthesisExpensive)

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

function generateIterativeCatalanNumerical(n, i) {
  const paren = generateIterativeCatalanParentheses(n, i)
  const num = parenthesesToNumerical(paren)
  const arrst = arrayToNumStrings(num)
  return arrst
}

function offsetArrayVals(a, val) {
  return a.map((v) => v + val)
}

// given a notch character, give its numeric value
function getNotchNumber(a) {
  if (!isNaN(a)) {
    return Number(a) // ensure the result is always a number
  }
  return a.charCodeAt() - 65 + 10
}

function hexConversion(char) {
  if (char < 10) {
    return char
  }
  return String.fromCharCode(65 + (char - 10))
}

function arrayOfArrayToArrayOfNumStrings(a) {
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

function numericalToParentheses(st) {
  let dict = {}
  for (let i = 0; i < st.length; i++) {
    const val = getNotchNumber(st[i]) - 1
    if (i % 2 == 0) {
      dict[val] = '('
    } else {
      dict[val] = ')'
    }
  }
  let ret = []
  for (let i = 0; i < st.length; i++) {
    ret.push(dict[i])
  }
  // console.log('numericalToParentheses', st, ret)
  return ret.join('')
}

function numericalToPartition(st) {
  return parenthesesToPartitions(numericalToParentheses(st))
}

//  (*( )*( (*( )*) )*)
// 0 1 2 1 2 3 4 3 2 1 0

//  (*) (*) (*) (*) (*)
// 0 1 0 1 0 1 0 1 0 1 0

// (())(()()()()()()())

function parenthesesToPartitions(st) {
  // compute in reverse to ensure correct order of first element of each partition
  // console.log("st", st)
  let ret = []
  let dict = {}
  let val = 0
  for (let i = st.length - 1; i >= 0; i--) {
    if (!dict[val]) {
      dict[val] = []
    }
    const char = st[i]
    if (char == ')') {
      val += 1
      if (!dict[val]) {
        dict[val] = []
      }
    } else if (char == '(') {
      if (dict[val].length > 0) {
        ret.push(dict[val].reverse())
        dict[val] = []
      }
      val -= 1
    } else {
      throw 'Unknown character'
    }
    if (i % 2 == 1) {
      dict[val].push(i / 2 + 0.5)
    }
  }
  return ret.reverse()
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
        const val = [1, l.length + 2, ...offsetArrayVals(l, 1), ...offsetArrayVals(r, l.length + 2)]
        retList.push(val)
      }
    }
  }
  return retList
}

export {
  // catalan number
  catalanNumber,

  // generators
  // exhaustive sets
  generateCatalanNumberSet,
  generateCatalanParenthesisSet,
  // iterative
  generateIterativeCatalanParentheses,
  generateIterativeCatalanNumerical,

  // representation conversions
  parenthesesToNumerical,
  parenthesesToPartitions,
  numericalToPartition,
  numericalToParentheses,

  // character conversion
  hexConversion,
  getNotchNumber,
}
