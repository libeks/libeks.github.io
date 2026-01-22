const triangleSide = 100
const height = (Math.sqrt(3) * triangleSide) / 2 // 86.6

const points = {
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

function equalPoints(p1, p2) {
  return p1.x == p2.x && p1.y == p2.y
}

function printPt(pt) {
  return `${pt.x} ${pt.y}`
}

const twoCurveFactory = {
  template: `<path class="stroke" :d="getChunk(curve)" />`,
  props: ['curve'],
  methods: {
    getChunk: function (curve) {
      const c1 = curve[0]
      const c2 = curve[1]
      const p1 = points[c1]
      const p2 = points[c2]
      const p1prime = points[c1 + '*']
      const p2prime = points[c2 + '*']
      if (equalPoints(p1prime, p2prime)) {
        // without this the corner curves are very pointy
        return `M ${printPt(p1)} Q ${printPt(p1prime)}, ${printPt(p2)}`
      }
      return `M ${printPt(p1)} C ${printPt(p1prime)}, ${printPt(p2prime)}, ${printPt(p2)}`
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
    computeCurve: function (curve, n) {
      let chunks = getPairs(curve)
      const chunk = chunks[n]
      return `tricurve${chunk}`
    },
  },
  components: twoCurveSet,
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

// console.log(generateAllPairs([1,2,3,4,5,6,7,8,9, 'A', 'B', 'C']));

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

// console.log("catalan 3", arrayOfArrayToArrayOfNumStrings(generateCatalanNumberSet(7)))

const threeCatalans = arrayOfArrayToArrayOfNumStrings(generateCatalanNumberSet(3))

let tilesetTri5 = (function () {
  let retObj = {}
  for (let id of threeCatalans) {
    retObj[`tile${id}`] = generateTwoTile(id)
  }
  return retObj
})()

export { tilesetTri5, tilesetTri15, twoTileFactory }
