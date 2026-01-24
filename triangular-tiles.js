const triangleSide = 100
const height = (Math.sqrt(3) * triangleSide) / 2 // 86.6

const twoPoints = {
  // points on the edge
  1: { x: -triangleSide / 6, y: 0 },
  2: { x: triangleSide / 6, y: 0 },
  3: { x: triangleSide / 3, y: height / 3 },
  4: { x: triangleSide / 6, y: (2 * height) / 3 },
  5: { x: -triangleSide / 6, y: (2 * height) / 3 },
  6: { x: -triangleSide / 3, y: height / 3 },
  // derived points, perpendicular to edge points
  '1*': { x: -triangleSide / 6, y: (2 / 9) * height },
  '2*': { x: triangleSide / 6, y: (2 / 9) * height },
  '3*': { x: triangleSide / 6, y: (2 / 9) * height },
  '4*': { x: 0, y: (5 / 9) * height },
  '5*': { x: 0, y: (5 / 9) * height },
  '6*': { x: -triangleSide / 6, y: (2 / 9) * height },
}

const fourPoints = {
  1: { x: (-3 * triangleSide) / 10, y: 0 },
  2: { x: -triangleSide / 10, y: 0 },
  3: { x: triangleSide / 10, y: 0 },
  4: { x: (3 * triangleSide) / 10, y: 0 },
  5: { x: (4 * triangleSide) / 10, y: height / 5 },
  6: { x: (3 * triangleSide) / 10, y: (2 * height) / 5 },
  7: { x: (2 * triangleSide) / 10, y: (3 * height) / 5 },
  8: { x: triangleSide / 10, y: (4 * height) / 5 },
  9: { x: -triangleSide / 10, y: (4 * height) / 5 },
  A: { x: (-2 * triangleSide) / 10, y: (3 * height) / 5 },
  B: { x: (-3 * triangleSide) / 10, y: (2 * height) / 5 },
  C: { x: (-4 * triangleSide) / 10, y: height / 5 },
  // derived points, hitting the closest diagonal perpendicularly
  '1*': { x: (-3 * triangleSide) / 10, y: 11.56 },
  '2+': { x: -triangleSide / 10, y: 23.12 },
  '2*': { x: -triangleSide / 10, y: 11.56 },
  '3+': { x: triangleSide / 10, y: 23.12 },
  '3*': { x: triangleSide / 10, y: 11.56 },
  '4*': { x: (3 * triangleSide) / 10, y: 11.56 },
  '5*': { x: (3 * triangleSide) / 10, y: 11.56 },
  '6+': { x: triangleSide / 10, y: 23.12 },
  '6*': { x: (2 * triangleSide) / 10, y: 28.85 },
  '7+': { x: 0, y: 40.44 },
  '7*': { x: triangleSide / 10, y: 46.15 },
  '8*': { x: 0, y: 63.52 },
  '9*': { x: 0, y: 63.52 },
  'A+': { x: 0, y: 40.44 },
  'A*': { x: -triangleSide / 10, y: 46.15 },
  'B+': { x: -triangleSide / 10, y: 23.12 },
  'B*': { x: (-2 * triangleSide) / 10, y: 28.85 },
  'C*': { x: (-3 * triangleSide) / 10, y: 11.56 },
  center: { x: 0, y: height / 3 },
}

function equalPoints(p1, p2) {
  return p1.x == p2.x && p1.y == p2.y
}

function midpoint(p1, p2) {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
}

function printPt(pt) {
  return `${pt.x} ${pt.y}`
}

// given a notch character, give its numeric value
function getNotchNumber(a) {
  if (!isNaN(a)) {
    return Number(a) // ensure the result is always a number
  }
  return a.charCodeAt() - 65 + 10
}

function getNotchType(a) {
  a = getNotchNumber(a)
  const mod4 = a % 4
  if (mod4 == 1 || mod4 == 0) {
    return 'outer'
  }
  return 'inner'
}

// given the one-character notch names, give the absolute distance between them
// assume a <= b
function distance12(a, b) {
  a = getNotchNumber(a)
  b = getNotchNumber(b)
  return Math.min((b - a) % 12, Math.abs((b - a - 12) % 12))
}

// given an edge character, return which edge of the triangle [1,2,3] it lies on
function notchEdge12(a) {
  a = getNotchNumber(a)
  if (a < 5) {
    return 1
  }
  if (a < 9) {
    return 2
  }
  return 3
}

function nextChar(a) {
  if (a == 'C') {
    return 1
  }
  let next = getNotchNumber(a) + 1
  return hexConversion(next)
}

function prevChar(a) {
  if (a == 1) {
    return 'C'
  }
  let next = getNotchNumber(a) - 1
  return hexConversion(next)
}

function toCenter(a) {
  let num = getNotchNumber(a)
  if (num == 1 || num == 5 || num == 9) {
    return nextChar(a)
  }
  return prevChar(a)
}

const twoCurveFactory = {
  template: `<path class="stroke" :d="getChunk(curve)" />`,
  props: ['curve'],
  methods: {
    getChunk: function (curve) {
      const c1 = curve[0]
      const c2 = curve[1]
      const distance = distance12(c1, c2)
      const p1 = twoPoints[c1]
      const p2 = twoPoints[c2]
      const p1prime = twoPoints[c1 + '*']
      const p2prime = twoPoints[c2 + '*']
      if (equalPoints(p1prime, p2prime)) {
        // without this the corner curves are very pointy
        return `M ${printPt(p1)} Q ${printPt(p1prime)}, ${printPt(p2)}`
      }
      return `M ${printPt(p1)} C ${printPt(p1prime)}, ${printPt(p2prime)}, ${printPt(p2)}`
    },
  },
}

const fourCurveFactory = {
  template: `<path class="stroke medium" :d="getChunk(curve)" />`,
  props: ['curve'],
  methods: {
    getChunk: function (curve) {
      let c1 = curve[0]
      let c2 = curve[1]
      const distance = distance12(c1, c2)
      if (distance == 0) {
        return `M ${printPt(p1)}` // no curve to draw
      }
      const p1 = fourPoints[c1]
      const p2 = fourPoints[c2]
      if (distance == 1) {
        // case 1, notches next to each other
        const p1prime = fourPoints[c1 + '*']
        const p2prime = fourPoints[c2 + '*']
        if (equalPoints(p1prime, p2prime)) {
          // case 1.1, notches are next to each other on a corner
          // without this the corner curves are very pointy
          return `M ${printPt(p1)} Q ${printPt(p1prime)}, ${printPt(p2)}`
        }
        // case 1.2 nothces are next to each other on the same edge, connect using cubic and * points
        return `M ${printPt(p1)} C ${printPt(p1prime)}, ${printPt(p2prime)}, ${printPt(p2)}`
        // return `M ${printPt(p1)} L ${printPt(p2)}`
      }
      if (distance == 3 && notchEdge12(c1) == notchEdge12(c2)) {
        // case 2, notches represent the outer pair of an edge, connect them through the points 'C p1, p1*, p2+, midpoint(p2+, p3+)' and 'C midpoint(p2+, p3+), p3+, p4*, p4'
        // assume that c1 is the smaller-numbered point
        const p2plus = fourPoints[nextChar(c1) + '*']
        const p3plus = fourPoints[nextChar(nextChar(c1)) + '*']
        const mid = midpoint(p2plus, p3plus)
        return `M ${printPt(p1)} C ${printPt(fourPoints[c1 + '*'])} ${printPt(p2plus)} ${printPt(mid)} C ${printPt(p3plus)} ${printPt(fourPoints[c2 + '*'])} ${printPt(p2)}`
      }
      if (
        getNotchType(c1) == 'inner' &&
        getNotchType(c2) == 'inner' &&
        equalPoints(fourPoints[c1 + '+'], fourPoints[c2 + '+'])
      ) {
        // case 3, pair of closest inner notches
        return `M ${printPt(p1)} Q ${printPt(fourPoints[c1 + '+'])} ${printPt(p2)}`
      }
      if (getNotchType(c1) == 'outer' && getNotchType(c2) == 'outer') {
        // case 4, pair of farthest outer notches (closest ones are already covered in case 1)
        const p1plus = fourPoints[toCenter(c1) + '+']
        const p2plus = fourPoints[toCenter(c2) + '+']
        const mid = midpoint(p1plus, p2plus)
        return `M ${printPt(p1)} C ${printPt(fourPoints[c1 + '*'])} ${printPt(p1plus)} ${printPt(mid)} C ${printPt(p2plus)} ${printPt(fourPoints[c2 + '*'])} ${printPt(p2)}`
      }
      if (getNotchType(c1) == 'inner' && getNotchType(c2) == 'inner') {
        // case 5, pair of far inner notches
        return `M ${printPt(p1)} Q ${printPt(fourPoints[c1 + '*'])} ${printPt(fourPoints['center'])} Q ${printPt(fourPoints[c2 + '*'])} ${printPt(p2)}`
      }
      if (distance == 3 && getNotchType(c1) != getNotchType(c2)) {
        // case 6, inner to outer at a distance of 3
        const p1prime = fourPoints[c1 + '*']
        const p2prime = fourPoints[c2 + '*']
        const midprime = midpoint(p1prime, p2prime)
        return `M ${printPt(p1)} Q ${printPt(p1prime)} ${printPt(midprime)} Q ${printPt(p2prime)} ${printPt(p2)}`
      }
      if (distance == 5 && getNotchType(c1) != getNotchType(c2)) {
        // case 7, inner to outer at a disnce of 5
        // start by ordering so that c1 is the inner point
        if (getNotchType(c2) == 'inner') {
          let temp = c1
          c1 = c2
          c2 = temp
        }
        const p1 = fourPoints[c1]
        const p2 = fourPoints[c2]
        const p1plus = fourPoints[c1 + '+']
        const p2prime = fourPoints[c2 + '*']
        const midprime = midpoint(p1plus, p2prime)
        return `M ${printPt(p1)} Q ${printPt(p1plus)} ${printPt(midprime)} Q ${printPt(p2prime)} ${printPt(p2)}`
      }
      // case X, fallback to direct line
      return `M ${printPt(p1)} L ${printPt(p2)}` // last resort, return direct line
    },
  },
}

function generateTwoCurve(curve) {
  return {
    template: `<two-curve-factory curve="${curve}"/>`,
    components: { twoCurveFactory },
  }
}

function twoCurveIDs() {
  let retList = []
  for (let i = 1; i <= 6; i++) {
    for (let j = i + 1; j <= 6; j++) {
      retList.push(`${i}${j}`)
    }
  }
  return retList
}

let twoCurveSet = (function () {
  let retObj = {}
  for (let id of twoCurveIDs()) {
    retObj[`tricurve${id}`] = generateTwoCurve(id)
  }
  return retObj
})()

// Given a string, return an array of strings of two characters each, which add up to the input string
function getPairs(s) {
  const len = 2
  var chunks = []

  for (var i = 0, charsLength = s.length; i < charsLength; i += len) {
    chunks.push(s.substring(i, i + len))
  }
  return chunks
}

const twoTileFactory = {
  template: `<g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <component :is="computeCurve(tile,0)"></component>
    <component :is="computeCurve(tile,1)"></component>
    <component :is="computeCurve(tile,2)"></component>
  </g>`,
  props: ['tile'],
  methods: {
    computeCurve: function (tile, n) {
      let chunks = getPairs(tile)
      const chunk = chunks[n]
      return `tricurve${chunk}`
    },
  },
  components: twoCurveSet,
}

const fourTileFactory = {
  template: `<g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <four-curve-factory v-for="i in [0,1,2,3,4,5]" :curve="computeCurve(tile,i)" />
  </g>`,
  props: ['tile'],
  methods: {
    computeCurve: function (tile, n) {
      let chunks = getPairs(tile)
      const chunk = chunks[n]
      return chunk
    },
  },
  components: { fourCurveFactory },
}

function generateTwoTile(tile) {
  return {
    template: `<two-tile-factory tile="${tile}"/>`,
    components: { twoTileFactory },
  }
}

// given n*2 points, return a list of all unique sets of point pairs.
function generateAllPairs(fullList) {
  function rec(l) {
    if (l.length <= 2) {
      return [l]
    } else {
      const a = l[0]
      let firstChoice = l.filter((num) => num !== a)
      let retList = []
      for (let b of firstChoice) {
        let remainder = firstChoice.filter((num) => num !== b)
        let res = rec(remainder)
        for (const ret of res) {
          // prepend (a,b) to the returned array
          ret.unshift(b)
          ret.unshift(a)
          retList.push(ret)
        }
      }
      return retList
    }
  }
  return rec(fullList).map((lst) => lst.join(''))
}

const threePairs = generateAllPairs([1, 2, 3, 4, 5, 6])

let tilesetTri15 = (function () {
  let retObj = {}
  for (let id of threePairs) {
    retObj[`tile${id}`] = generateTwoTile(id)
  }
  return retObj
})()

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
    for (let l of left) {
      for (let r of right) {
        retList.push(['(', ...l, ')', ...r])
      }
    }
  }
  return retList
}

function offsetArrayVals(a, val) {
  return a.map((v) => v + val)
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
    for (let l of left) {
      for (let r of right) {
        retList.push([
          1,
          l.length + 2,
          ...offsetArrayVals(l, 1),
          ...offsetArrayVals(r, l.length + 2),
        ])
      }
    }
  }
  return retList
}

function hexConversion(char) {
  if (char < 10) {
    return char
  }
  return String.fromCharCode(65 + (char - 10))
}

function arrayOfArrayToArrayOfStrings(a) {
  return a.map((entry) => entry.join(''))
}

function arrayOfArrayToArrayOfNumStrings(a) {
  return a.map((entry) => entry.map((char) => hexConversion(char)).join(''))
}

const catalan6 = arrayOfArrayToArrayOfNumStrings(generateCatalanNumberSet(6))

const threeCatalans = arrayOfArrayToArrayOfNumStrings(generateCatalanNumberSet(3))

let tilesetTri5 = (function () {
  let retObj = {}
  for (let id of threeCatalans) {
    retObj[`tile${id}`] = generateTwoTile(id)
  }
  return retObj
})()

export { tilesetTri5, tilesetTri15, twoTileFactory, fourCurveFactory, fourTileFactory, catalan6 }
