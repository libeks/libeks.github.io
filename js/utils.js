import { average } from '/js/math.js'

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

// zip together two arrays, the size of the return is the shortes of the two arrays
function zip() {
  // console.log('zip', arguments)
  let args = [...arguments]
  // console.log(
  //   'lengths',
  //   args.map((l) => l.length),
  // )

  let minLen = Math.min(...args.map((l) => l.length))
  // console.log('minLen', minLen)
  let retList = []
  for (let i = 0; i < minLen; i++) {
    retList.push(args.map((arg) => arg[i]))
  }
  // console.log('zip result', retList)
  return retList
}

function enumerate(list) {
  return list.entries()
}

const range = (n) => Array(n).keys()

// given a list, return the list of all pairs, where the first element comes before the second one
// this is the upper triangular matrix of the elements
function crossProduct(list) {
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
// [1,2,3,4,5,6],(c)=> (c>1&&c<3) || (c>4 && c<5) => [[1,3], [4,5]]
function reduceIntervals(tValues, filterFunction) {
  let intervals = pairs(tValues).filter(([a, b]) => filterFunction(average(a, b)))
  // console.log('intervals', intervals)
  // now join contiguous intervals
  let answer = []
  let i = 0
  while (i < intervals.length) {
    if (i < intervals.length - 1) {
      if (intervals[i + 1][0] == intervals[i][1]) {
        intervals[i][1] = intervals[i + 1][1]
        intervals.splice(i + 1, 1)
        // console.log('after removing', i + 1, intervals)
      } else {
        i++
      }
    } else {
      i++
    }
  }
  // console.log('answer', intervals)
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
