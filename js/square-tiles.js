import {
  generateCatalanNumberSet,
  generateIterativeCatalanNumerical,
  numericalToHex,
  hexToNumerical,
} from '/js/catalan.js'
import { Point, Vector, Line } from '/js/geometry.js'
import {
  CircleArc,
  CubicBezier,
  QuadraticBezier,
  CompositeCurve,
  StraightStroke,
} from '/js/lines.js'
import { memoize } from '/js/memoize.js'

// Given a string, return an array of strings of two characters each, which add up to the input string
function getPairs(s) {
  const len = 2
  var chunks = []

  for (var i = 0, charsLength = s.length; i < charsLength; i += len) {
    chunks.push(s.substring(i, i + len))
  }
  return chunks
}

const oneCurveFactory = {
  template: `<path class="stroke" :d="getChunk(curve).d()" />`,
  props: {
    curve: String,
    side: {
      type: Number,
      default: 100,
    },
  },
  methods: {
    getChunk: function (curve) {
      let p1 = new Point(this.side / 2, 0)
      let p2 = new Point(this.side, this.side / 2)
      let p3 = new Point(this.side / 2, this.side)
      let p4 = new Point(0, this.side / 2)
      if (curve == '14') {
        return new CircleArc(p4, p1, this.side / 2, 0, 0)
      }
      if (curve == '12') {
        return new CircleArc(p1, p2, this.side / 2, 0, 0)
      }
      if (curve == '23') {
        return new CircleArc(p2, p3, this.side / 2, 0, 0)
      }
      if (curve == '34') {
        return new CircleArc(p3, p4, this.side / 2, 0, 0)
      }
    },
  },
}

const squareTwoPointFactory = memoize(function (side, notch) {
  // const halfwidth = side / 2
  const center = new Point(side / 2, side / 2)
  const c1 = new Point(0, 0)
  const c2 = new Point(side, 0)
  const c3 = new Point(side, side)
  const c4 = new Point(0, side)
  let m1 = new Point(side / 2, 0)
  let m2 = new Point(side, side / 2)
  let m3 = new Point(side / 2, side)
  let m4 = new Point(0, side / 2)

  const n1 = m1.towards(c1, notch)
  const n2 = m1.towards(c2, notch)
  const n3 = m2.towards(c2, notch)
  const n4 = m2.towards(c3, notch)
  const n5 = m3.towards(c3, notch)
  const n6 = m3.towards(c4, notch)
  const n7 = m4.towards(c4, notch)
  const n8 = m4.towards(c1, notch)

  const n1Line = new Line(n1, n1.vectTo(n6))
  const n2Line = new Line(n2, n2.vectTo(n5))
  const n3Line = new Line(n3, n3.vectTo(n8))
  const n4Line = new Line(n4, n4.vectTo(n7))

  const c1star = n1Line.intersect(n3Line)
  const c2star = n2Line.intersect(n3Line)
  const c3star = n2Line.intersect(n4Line)
  const c4star = n1Line.intersect(n4Line)

  return {
    // center
    center,
    // corners
    c1,
    c2,
    c3,
    c4,
    // notches
    n1,
    n2,
    n3,
    n4,
    n5,
    n6,
    n7,
    n8,
    // star points
    c1star,
    c2star,
    c3star,
    c4star,
    n1star: c1star,
    n2star: c2star,
    n3star: c2star,
    n4star: c3star,
    n5star: c3star,
    n6star: c4star,
    n7star: c4star,
    n8star: c1star,
  }
})

const squareThreePointFactory = memoize(function (side, notch) {
  // const halfwidth = side / 2
  const center = new Point(side / 2, side / 2)
  const c1 = new Point(0, 0)
  const c2 = new Point(side, 0)
  const c3 = new Point(side, side)
  const c4 = new Point(0, side)
  let m1 = new Point(side / 2, 0)
  let m2 = new Point(side, side / 2)
  let m3 = new Point(side / 2, side)
  let m4 = new Point(0, side / 2)

  const n1 = m1.towards(c1, notch)
  const n2 = m1
  const n3 = m1.towards(c2, notch)
  const n4 = m2.towards(c2, notch)
  const n5 = m2
  const n6 = m2.towards(c3, notch)
  const n7 = m3.towards(c3, notch)
  const n8 = m3
  const n9 = m3.towards(c4, notch)
  const n10 = m4.towards(c4, notch)
  const n11 = m4
  const n12 = m4.towards(c1, notch)

  const n1Line = new Line(n1, n1.vectTo(n9))
  const n2Line = new Line(n2, n2.vectTo(n8))
  const n3Line = new Line(n3, n3.vectTo(n7))
  const n4Line = new Line(n4, n4.vectTo(n12))
  const n5Line = new Line(n5, n5.vectTo(n11))
  const n6Line = new Line(n6, n6.vectTo(n10))

  const c1star = n1Line.intersect(n4Line)
  const c2star = n3Line.intersect(n4Line)
  const c3star = n3Line.intersect(n6Line)
  const c4star = n1Line.intersect(n6Line)

  const m1star = n2Line.intersect(n4Line)
  const m2star = n5Line.intersect(n3Line)
  const m3star = n2Line.intersect(n6Line)
  const m4star = n5Line.intersect(n1Line)

  return {
    // center
    center,
    // corners
    c1,
    c2,
    c3,
    c4,
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
    // star points
    c1star,
    c2star,
    c3star,
    c4star,

    m1star,
    m2star,
    m3star,
    m4star,

    n1star: c1star,
    n2star: m1star,
    n3star: c2star,
    n4star: c2star,
    n5star: m2star,
    n6star: c3star,
    n7star: c3star,
    n8star: m3star,
    n9star: c4star,
    nAstar: c4star,
    nBstar: m4star,
    nCstar: c1star,
  }
})

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
      default: 0.33,
    },
  },
  methods: {
    getChunk: function (curve) {
      const points = squareTwoPointFactory(this.side, this.notch)
      let center = points['center']
      let p1 = curve[0]
      let p2 = curve[1]
      let n1 = points['n' + p1]
      let n2 = points['n' + p2]
      let n1star = points['n' + p1 + 'star']
      let n2star = points['n' + p2 + 'star']

      if (['12', '34', '56', '78'].includes(curve)) {
        // same side
        return new CubicBezier(n1, n1star, n2star, n2)
      }
      if (['18', '23', '45', '67'].includes(curve)) {
        // wrap around a corner
        return new QuadraticBezier(n1, n1star, n2)
      }
      if (['16', '25', '38', '47'].includes(curve)) {
        // straight across
        return new StraightStroke(n1, n2)
      }
      if (['14', '27', '36', '58'].includes(curve)) {
        return new CubicBezier(n1, n1star, n2star, n2)
      }
      // catch-all
      return new StraightStroke(n1, n2)
    },
  },
}

const threeCurveFactory = {
  template: `<path class="stroke" :d="getChunk(curve).d()" />`,
  props: {
    curve: String,
    side: {
      type: Number,
      default: 100,
    },
    notch: {
      type: Number,
      default: 0.33,
    },
  },
  methods: {
    getChunk: function (curve) {
      // console.log('curve', curve)
      const points = squareThreePointFactory(this.side, this.notch)
      let center = points['center']
      let p1 = curve[0]
      let p2 = curve[1]
      // console.log
      let n1 = points['n' + p1]
      let n2 = points['n' + p2]
      let n1star = points['n' + p1 + 'star']
      let n2star = points['n' + p2 + 'star']
      // console.log(n1, n2, n1star, n2star)

      if (['12', '23', '45', '56', '78', '89', 'AB', 'BC'].includes(curve)) {
        // same side
        // make curve shorter
        return new CubicBezier(n1, n1.towards(n1star, 0.5), n2.towards(n2star, 0.5), n2)
      }
      if (['1C', '34', '67', '9A'].includes(curve)) {
        // wrap around a corner
        return new QuadraticBezier(n1, n1star, n2)
      }
      if (['19', '28', '37', '4C', '5B', '6A'].includes(curve)) {
        // straight across
        return new StraightStroke(n1, n2)
      }
      if (['25', '58', '8B', '2B'].includes(curve)) {
        // connect non-opposite midpoints
        return new CubicBezier(n1, n1star, n2star, n2)
      }
      if (['14', '1A', '36', '3C', '47', '69', '7A', '9C'].includes(curve)) {
        // reach across one self-side
        return new CubicBezier(n1, n1star, n2star, n2)
      }
      if (['17', '39', '4A', '6C'].includes(curve)) {
        // opposite sides, connected through middle
        return new CubicBezier(n1, n1star, n2star, n2)
      }
      if (['16', '3A', '49', '7C'].includes(curve)) {
        // adjoining sides, furthest notches
        return new CubicBezier(n1, n1star, n2star, n2)
      }
      if (['18', '38', '4B', '6B', '27', '29', '5A', '5C'].includes(curve)) {
        // midpoint to non-midpoint on opposite side
        return new CubicBezier(n1, n1star, n2star, n2)
      }
      // catch-all
      return new StraightStroke(n1, n2)
    },
  },
}

const oneTileFactory = {
  template: `
  <g class="tile">
    <polygon points="0,0 0,100 100,100 100,0" />
    <one-curve-factory v-for="curve in getPairs(tile,2)" :curve="curve" :side="side" />
  </g>
  `,
  props: {
    tile: String,
    side: {
      type: Number,
      default: 100,
    },
  },
  methods: {
    getPairs,
  },
  components: { oneCurveFactory },
}

const twoTileFactory = {
  template: `
  <g class="tile">
    <polygon points="0,0 0,100 100,100 100,0" />
    <two-curve-factory v-for="curve in getPairs(tile,2)" :curve="curve" :notch="notch" :side="side" />
  </g>
  `,
  props: {
    tile: String,
    side: {
      type: Number,
      default: 100,
    },
    notch: {
      type: Number,
      default: 0.33,
    },
  },
  methods: {
    getPairs,
  },
  components: { twoCurveFactory },
}

const threeTileFactory = {
  template: `
  <g class="tile">
    <polygon points="0,0 0,100 100,100 100,0" />
    <three-curve-factory v-for="curve in getPairs(tile,2)" :curve="curve" :notch="notch" :side="side" />
  </g>
  `,
  props: {
    tile: String,
    side: {
      type: Number,
      default: 100,
    },
    notch: {
      type: Number,
      default: 0.33,
    },
  },
  methods: {
    getPairs,
  },
  components: { threeCurveFactory },
}

export {
  oneCurveFactory,
  oneTileFactory,
  twoCurveFactory,
  twoTileFactory,
  threeCurveFactory,
  threeTileFactory,
}
