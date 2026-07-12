import { average } from '/js/math.js'

// utils.js is a collection of mostly array-based utility functions, some of which mirror similar functions in python

// given a list, return pairs
// [1,2,3] => [[1,2], [2,3]]
function pairs(list) {
  let retlist = []
  for (let i = 0; i < list.length - 1; i++) {
    retlist.push([list[i], list[i + 1]])
  }
  return retlist
}

// given a list, return pairs of adjacent elements, with wrap-around
// [1,2,3] => [[1,2], [2,3], [3,1]]
function circularPairs(list) {
  let retlist = []
  for (let i = 0; i < list.length; i++) {
    let first = list[i]
    let second = list[(i + 1) % list.length]
    retlist.push([first, second])
  }
  return retlist
}

// shift leftward one position, with wraparound
// so shift([0,1,2,3]) => [3,0,1,2]
function shift(list) {
  return [list[list.length - 1], ...list.slice(0, list.length - 1)]
}

// shift rightward one position, with wraparound
// so rightShift([0,1,2,3]) => [1,2,3,0]
function rightShift(list) {
  return [...list.slice(1, list.lenght), list[0]]
}

function reversed(list) {
  return [...list].reverse()
}

// zip together a variable number of arrays, the size of the return is the shortest of the two arrays
// zip([1,2,3], ['a', 'b']) => [[1,'a'], [2,'b']]
function zip() {
  let args = [...arguments]

  let minLen = Math.min(...args.map((l) => l.length))
  let retList = []
  for (let i = 0; i < minLen; i++) {
    retList.push(args.map((arg) => arg[i]))
  }
  return retList
}

// enumerate the elements of the list
// enumerate(['a', 'b', 'c']) => [[0, 'a'], [1, 'b'], [2, 'c']]
function enumerate(list) {
  return Array.from(list.entries())
}

// range returns the numbers from 0 to n-1, inclusive
// range(3) => [0,1,2]
const range = (n) => Array(n).keys()

// given a list, return the list of all pairs, where the first element comes before the second one
// this is the upper triangular matrix of the elements
function crossProduct(list) {
  if (!Array.isArray(list)) {
    throw `crossProduct got a non-array argument`
  }
  let result = []
  for (let a = 0; a < list.length; a++) {
    for (let b = a + 1; b < list.length; b++) {
      result.push([list[a], list[b]])
    }
  }
  return result
}

// reduceIntervals reduces a list of t-values and a filter function (c)=>Bool to return a list of pairs inside which the function is true
// the filter function is assumed to be constant in between the provided t-values
// the t-values are assumed to be sorted
// reduceIntervals([1,2,3,4,5,6],(c)=> (c>1&&c<3) || (c>4 && c<5)) => [[1,3], [4,5]]
function reduceIntervals(tValues, filterFunction) {
  let intervals = pairs(tValues).filter(([a, b]) => filterFunction(average(a, b)))
  // now join contiguous intervals
  let answer = []
  let i = 0
  while (i < intervals.length) {
    if (i < intervals.length - 1 && intervals[i + 1][0] == intervals[i][1]) {
      // this and the next intervals are continguous, join them
      intervals[i][1] = intervals[i + 1][1]
      intervals.splice(i + 1, 1) // remove the following interval, it has been merged into the current one
    } else {
      i++
    }
  }
  return intervals
}

export {
  pairs,
  circularPairs,
  zip,
  shift,
  rightShift,
  reversed,
  enumerate,
  range,
  crossProduct,
  reduceIntervals,
}
