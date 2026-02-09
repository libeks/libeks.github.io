import { generateCatalanNumberSet, numericalToHex, hexToNumerical } from './catalan.js'
import { Point, Vector, Line } from './geometry.js'
import { StraightStroke, QuadraticBezier, CubicBezier, CircleArc, CompositeCurve } from './lines.js'
import { memoize } from './memoize.js'

const triangleTwoPointFactory = memoize(function (size, notch) {
  const halfwidth = size / 2
  const c1 = new Point(-size / 2, 0)
  const c2 = new Point(size / 2, 0)
  const c3 = new Point(0, (Math.sqrt(3) / 2) * size)
  const origin = new Point(0, 0)
  const center = origin.addVect(origin.vectTo(c3).mult(1 / 3))
  const e1mid = origin
  const e2mid = c2.midpoint(c3)
  const e3mid = c1.midpoint(c3)

  const e1Perp = e1mid.vectTo(center)
  const e2Perp = e2mid.vectTo(center)
  const e3Perp = e3mid.vectTo(center)

  const n1 = e1mid.towards(c1, notch)
  const n2 = e1mid.towards(c2, notch)
  const n3 = e2mid.towards(c2, notch)
  const n4 = e2mid.towards(c3, notch)
  const n5 = e3mid.towards(c3, notch)
  const n6 = e3mid.towards(c1, notch)

  const c1Line = new Line(c1, c1.vectTo(center))
  const c2Line = new Line(c2, c2.vectTo(center))
  const c3Line = new Line(c3, c3.vectTo(center))
  const c1star = c1Line.intersect(new Line(n1, e1Perp))
  const c2star = c2Line.intersect(new Line(n2, e1Perp))
  const c3star = c3Line.intersect(new Line(n4, e2Perp)) // notches don't map 1-1 to star-points, hence why n4 here

  return {
    // corners
    c1,
    c2,
    c3,
    // center
    center,
    // notches
    n1,
    n2,
    n3,
    n4,
    n5,
    n6,
    // star points
    c1star,
    c2star,
    c3star,
    n1star: c1star,
    n2star: c2star,
    n3star: c2star,
    n4star: c3star,
    n5star: c3star,
    n6star: c1star,
    // midpoints
    e1mid,
    e2mid,
    e3mid,
  }
})

const triangleFourPointFactory = memoize(function (size, notch1, notch2) {
  const halfwidth = size / 2
  const c1 = new Point(-size / 2, 0)
  const c2 = new Point(size / 2, 0)
  const c3 = new Point(0, (Math.sqrt(3) / 2) * size)
  const origin = new Point(0, 0)
  const center = origin.addVect(origin.vectTo(c3).mult(1 / 3))
  const e1mid = origin
  const e2mid = c2.midpoint(c3)
  const e3mid = c1.midpoint(c3)
  const e1Perp = e1mid.vectTo(center)
  const e2Perp = e2mid.vectTo(center)
  const e3Perp = e3mid.vectTo(center)

  const n1 = e1mid.towards(c1, notch2)
  const n2 = e1mid.towards(c1, notch1)
  const n3 = e1mid.towards(c2, notch1)
  const n4 = e1mid.towards(c2, notch2)
  const n5 = e2mid.towards(c2, notch2)
  const n6 = e2mid.towards(c2, notch1)
  const n7 = e2mid.towards(c3, notch1)
  const n8 = e2mid.towards(c3, notch2)
  const n9 = e3mid.towards(c3, notch2)
  const n10 = e3mid.towards(c3, notch1)
  const n11 = e3mid.towards(c1, notch1)
  const n12 = e3mid.towards(c1, notch2)

  const c1Line = new Line(c1, c1.vectTo(center)) // center to corner 1
  const c2Line = new Line(c2, c2.vectTo(center)) // center to corner 2
  const c3Line = new Line(c3, c3.vectTo(center)) // center to corner 3
  const t1 = c1Line.intersect(new Line(n1, e1Perp))
  const t2 = c1Line.intersect(new Line(n2, e1Perp))
  const t3 = c2Line.intersect(new Line(n3, e1Perp))
  const t4 = c2Line.intersect(new Line(n4, e1Perp))
  const t5 = c3Line.intersect(new Line(n7, e2Perp))
  const t6 = c3Line.intersect(new Line(n8, e2Perp))

  const t1t4Line = new Line(t1, t1.vectTo(t4))
  const t4t6Line = new Line(t4, t4.vectTo(t6))
  const t1t6Line = new Line(t1, t1.vectTo(t6))

  const n2star = t1t4Line.intersect(new Line(n2, e1Perp))
  const n3star = t1t4Line.intersect(new Line(n3, e1Perp))
  const n6star = t4t6Line.intersect(new Line(n6, e2Perp))
  const n7star = t4t6Line.intersect(new Line(n7, e2Perp))
  const n10star = t1t6Line.intersect(new Line(n10, e3Perp))
  const n11star = t1t6Line.intersect(new Line(n11, e3Perp))

  return {
    // corners
    c1,
    c2,
    c3,
    // center
    center,
    // notches
    n1,
    n2,
    n3,
    n4,
    n5,
    n6,
    n7,
    n8,
    n9,
    nA: n10,
    nB: n11,
    nC: n12,

    n1star: t1,
    n2star,
    n3star,
    n4star: t4,
    n5star: t4,
    n6star,
    n7star,
    n8star: t6,
    n9star: t6,
    nAstar: n10star,
    nBstar: n11star,
    nCstar: t1,

    n2plus: t2,
    n3plus: t3,
    n6plus: t3,
    n7plus: t5,
    nAplus: t5,
    nBplus: t2,
  }
})

function equalPoints(p1, p2) {
  return p1.x == p2.x && p1.y == p2.y
}

function midpoint(p1, p2) {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
}

function printPt(pt) {
  return `${pt.x} ${pt.y}`
}

function getNotchType(a) {
  a = hexToNumerical(a)
  const mod4 = a % 4
  if (mod4 == 1 || mod4 == 0) {
    return 'outer'
  }
  return 'inner'
}

// given the one-character notch names, give the absolute distance between them
// assume a <= b
function distance12(a, b) {
  a = hexToNumerical(a)
  b = hexToNumerical(b)
  return Math.min((b - a) % 12, Math.abs((b - a - 12) % 12))
}

// given an edge character, return which edge of the triangle [1,2,3] it lies on
function notchEdge12(a) {
  a = hexToNumerical(a)
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
  let next = hexToNumerical(a) + 1
  return numericalToHex(next)
}

function prevChar(a) {
  if (a == 1) {
    return 'C'
  }
  let next = hexToNumerical(a) - 1
  return numericalToHex(next)
}

function toCenter(a) {
  let num = hexToNumerical(a)
  if (num == 1 || num == 5 || num == 9) {
    return nextChar(a)
  }
  return prevChar(a)
}

const twoCurveFactory = {
  template: `<path class="stroke" :d="getChunk(curve).d()" />`,
  props: {
    curve: String,
    side: {
      type: Number,
      default: 100,
    },
    notch: {
      type: Number,
      default: 1 / 3,
    },
  },
  methods: {
    getChunk: function (curve) {
      const points = triangleTwoPointFactory(this.side, this.notch)
      const c1 = curve[0]
      const c2 = curve[1]
      const distance = distance12(c1, c2)
      const p1 = points['n' + c1]
      const p2 = points['n' + c2]
      const p1prime = points['n' + c1 + 'star']
      const p2prime = points['n' + c2 + 'star']
      if (p1prime.same(p2prime)) {
        // without this the corner curves are very pointy
        return new QuadraticBezier(p1, p1prime, p2)
      }
      return new CubicBezier(p1, p1prime, p2prime, p2)
    },
  },
  computed: {},
}

const fourCurveFactory = {
  template: `<path class="stroke medium" :d="getChunk(curve).d()" />`,
  props: {
    curve: String,
    side: {
      type: Number,
      default: 100,
    },
    notch1: {
      type: Number,
      default: 1 / 5,
    },
    notch2: {
      type: Number,
      default: 3 / 5,
    },
  },
  methods: {
    getChunk: function (curve) {
      const fourPoints = triangleFourPointFactory(this.side, this.notch1, this.notch2)
      let c1 = curve[0]
      let c2 = curve[1]
      const distance = distance12(c1, c2)
      if (distance == 0) {
        return new StraightStroke(p1, p1) // tiny line between point and itself, ideally nothing should be drawn
        // return `M ${printPt(p1)}` // no curve to draw
      }
      const p1 = fourPoints['n' + c1]
      const p2 = fourPoints['n' + c2]
      if (distance == 1) {
        // case 1, notches next to each other
        const p1prime = fourPoints['n' + c1 + 'star']
        const p2prime = fourPoints['n' + c2 + 'star']
        if (equalPoints(p1prime, p2prime)) {
          // case 1.1, notches are next to each other on a corner
          // without this the corner curves are very pointy
          return new QuadraticBezier(p1, p1prime, p2)
          // return `M ${printPt(p1)} Q ${printPt(p1prime)}, ${printPt(p2)}`
        }
        // case 1.2 nothces are next to each other on the same edge, connect using cubic and * points
        return new CubicBezier(p1, p1prime, p2prime, p2)
        // return `M ${printPt(p1)} C ${printPt(p1prime)}, ${printPt(p2prime)}, ${printPt(p2)}`
        // return `M ${printPt(p1)} L ${printPt(p2)}`
      }
      if (distance == 3 && notchEdge12(c1) == notchEdge12(c2)) {
        // case 2, notches represent the outer pair of an edge, connect them through the points 'C p1, p1*, p2+, midpoint(p2+, p3+)' and 'C midpoint(p2+, p3+), p3+, p4*, p4'
        // assume that c1 is the smaller-numbered point
        const p2plus = fourPoints['n' + nextChar(c1) + 'star']
        const p3plus = fourPoints['n' + nextChar(nextChar(c1)) + 'star']
        const mid = p2plus.midpoint(p3plus)
        return new CompositeCurve(
          new CubicBezier(p1, fourPoints['n' + c1 + 'star'], p2plus, mid),
          new CubicBezier(mid, p3plus, fourPoints['n' + c2 + 'star'], p2),
        )
        // return `M ${printPt(p1)} C ${printPt(fourPoints[c1 + '*'])} ${printPt(p2plus)} ${printPt(mid)} C ${printPt(p3plus)} ${printPt(fourPoints[c2 + '*'])} ${printPt(p2)}`
      }
      if (
        getNotchType(c1) == 'inner' &&
        getNotchType(c2) == 'inner' &&
        equalPoints(fourPoints['n' + c1 + 'plus'], fourPoints['n' + c2 + 'plus'])
      ) {
        // case 3, pair of closest inner notches
        return new QuadraticBezier(p1, fourPoints['n' + c1 + 'plus'], p2)
        // return `M ${printPt(p1)} Q ${printPt(fourPoints[c1 + '+'])} ${printPt(p2)}`
      }
      if (getNotchType(c1) == 'outer' && getNotchType(c2) == 'outer') {
        // case 4, pair of farthest outer notches (closest ones are already covered in case 1)
        const p1plus = fourPoints['n' + toCenter(c1) + 'plus']
        const p2plus = fourPoints['n' + toCenter(c2) + 'plus']
        const mid = p1plus.midpoint(p2plus)
        return new CompositeCurve(
          new CubicBezier(p1, fourPoints['n' + c1 + 'star'], p1plus, mid),
          new CubicBezier(mid, p2plus, fourPoints['n' + c2 + 'star'], p2),
        )
        // return `M ${printPt(p1)} C ${printPt(fourPoints[c1 + '*'])} ${printPt(p1plus)} ${printPt(mid)} C ${printPt(p2plus)} ${printPt(fourPoints[c2 + '*'])} ${printPt(p2)}`
      }
      if (getNotchType(c1) == 'inner' && getNotchType(c2) == 'inner') {
        // case 5, pair of far inner notches
        return new CompositeCurve(
          new QuadraticBezier(p1, fourPoints['n' + c1 + 'star'], fourPoints['center']),
          new QuadraticBezier(fourPoints['center'], fourPoints['n' + c2 + 'star'], p2),
        )
        // return `M ${printPt(p1)} Q ${printPt(fourPoints[c1 + '*'])} ${printPt(fourPoints['center'])} Q ${printPt(fourPoints[c2 + '*'])} ${printPt(p2)}`
      }
      if (distance == 3 && getNotchType(c1) != getNotchType(c2)) {
        // case 6, inner to outer at a distance of 3
        const p1prime = fourPoints['n' + c1 + 'star']
        const p2prime = fourPoints['n' + c2 + 'star']
        const midprime = p1prime.midpoint(p2prime)
        return new CompositeCurve(
          new QuadraticBezier(p1, p1prime, midprime),
          new QuadraticBezier(midprime, p2prime, p2),
        )
        // return `M ${printPt(p1)} Q ${printPt(p1prime)} ${printPt(midprime)} Q ${printPt(p2prime)} ${printPt(p2)}`
      }
      if (distance == 5 && getNotchType(c1) != getNotchType(c2)) {
        // case 7, inner to outer at a disnce of 5
        // start by ordering so that c1 is the inner point
        if (getNotchType(c2) == 'inner') {
          let temp = c1
          c1 = c2
          c2 = temp
        }
        const p1 = fourPoints['n' + c1]
        const p2 = fourPoints['n' + c2]
        const p1plus = fourPoints['n' + c1 + 'plus']
        const p2prime = fourPoints['n' + c2 + 'star']
        const midprime = p1plus.midpoint(p2prime)
        return new CompositeCurve(
          new QuadraticBezier(p1, p1plus, midprime),
          new QuadraticBezier(midprime, p2prime, p2),
        )
        // return `M ${printPt(p1)} Q ${printPt(p1plus)} ${printPt(midprime)} Q ${printPt(p2prime)} ${printPt(p2)}`
      }
      // case X, fallback to direct line
      return new StraightLine(p1, p2)
      // return `M ${printPt(p1)} L ${printPt(p2)}` // last resort, return direct line
    },
  },
}

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
  template: `
  <g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <two-curve-factory v-for="i in [0,1,2]" :curve="computeCurve(tile,i)" />
  </g>
  `,
  props: ['tile'],
  methods: {
    computeCurve: function (tile, n) {
      let chunks = getPairs(tile)
      return chunks[n]
    },
  },
  components: { twoCurveFactory },
}

const fourTileFactory = {
  template: `
  <g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <four-curve-factory v-for="i in [0,1,2,3,4,5]" :curve="computeCurve(tile,i)" />
  </g>
  `,
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

function arrayOfArrayToArrayOfStrings(a) {
  return a.map((entry) => entry.join(''))
}

function arrayOfArrayToArrayOfNumStrings(a) {
  return a.map((entry) => entry.map((char) => numericalToHex(char)).join(''))
}

const catalan6 = arrayOfArrayToArrayOfNumStrings(generateCatalanNumberSet(6))

const catalan3 = arrayOfArrayToArrayOfNumStrings(generateCatalanNumberSet(3))

export { twoTileFactory, fourCurveFactory, fourTileFactory, catalan6, catalan3, threePairs }
