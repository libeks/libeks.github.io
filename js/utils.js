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

export { pairs, circularPairs, zip, shift, reversed, enumerate }
