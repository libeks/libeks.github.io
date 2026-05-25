import { Point, Line, Ray } from '/js/geometry.js'
import { reversed, shift, rightShift, zip } from '/js/utils.js'
import { degToRad, radToDeg, distance, randomInt } from '/js/math.js'
import { generateIterativeCatalanNumerical } from '/js/catalan.js'
import { getPairs } from '/js/triangular-tiles.js'
import { hexToNumerical, numericalToHex } from '/js/catalan.js'
import {
  StraightStroke,
  QuadraticBezier,
  CubicBezier,
  CompositeCurve,
  rayLineRayCurve,
} from '/js/lines.js'
import { VertexGrid } from '/js/grid.js'

// This is similar to triangular-tiles.js and square-tiles.js, but tries to generalize to any n-gon.
// It also operates on an arbitrarily placed and rotated n-gon, based off of its vertices

const THRESHOLD = 0.01

class GenericTriangleTruchetTile {
  constructor(vertices, hasCenterNotch, notches, nCatalan) {
    this.vertices = vertices
    this.hasCenterNotch = hasCenterNotch
    this.notches = notches
    this.computePoints()
    // this.nCatalan = nCatalan // the triangular tile to use
  }

  getN() {
    return this.vertices.length
  }

  get center() {
    let x = 0
    let y = 0
    for (let vertex of this.vertices) {
      x += vertex.x
      y += vertex.y
    }
    return new Point(x / this.getN(), y / this.getN())
  }

  // return a list of lines
  computePoints() {
    let center = this.center
    let midpoints = zip(this.vertices, rightShift(this.vertices)).map(([v1, v2]) => v1.midpoint(v2))
    let notches = []
    let stars = {}
    let perps = midpoints.map((pt) => pt.vectTo(center))
    for (let [[c1, c2], [m1, perp]] of zip(
      zip(this.vertices, rightShift(this.vertices)),
      zip(midpoints, perps),
    )) {
      for (let notch of reversed(this.notches)) {
        let id = notches.length
        let n = m1.towards(c1, notch)
        notches.push(n)
        stars[id] = new Line(c1, c1.vectTo(center)).intersect(new Line(n, perp))
      }
      if (this.hasCenterNotch) {
        notches.push(m1)
      }
      for (let notch of this.notches) {
        let id = notches.length
        let n = m1.towards(c2, notch)
        notches.push(m1.towards(c2, notch))
        stars[id] = new Line(c2, c2.vectTo(center)).intersect(new Line(n, perp))
      }
    }

    this.midpoints = midpoints
    this.notchPoints = notches
    this.stars = stars
  }

  getCatalanTile(n) {
    return []
  }
}

class GenericTruchetTile {
  constructor(vertices, hasCenterNotch, notches, side) {
    // console.log('side', side)
    for (let vertex of vertices) {
      if (vertex.type != 'Point') {
        throw `GenericTruchetTile got vertex with unexpected type ${vertex.type}`
      }
    }
    this.vertices = vertices
    this.hasCenterNotch = hasCenterNotch
    this.notches = notches
    this.side = side
    this.computePoints()
  }

  getN() {
    return this.vertices.length
  }

  get center() {
    let x = 0
    let y = 0
    for (let vertex of this.vertices) {
      x += vertex.x
      y += vertex.y
    }
    return new Point(x / this.getN(), y / this.getN())
  }

  // return a list of lines
  computePoints() {
    let center = this.center
    let midpoints = zip(this.vertices, rightShift(this.vertices)).map(([v1, v2]) => v1.midpoint(v2))
    let notches = []
    let stars = {}
    let perps = midpoints.map((pt) => pt.vectTo(center))
    for (let [[c1, c2], [m1, perp]] of zip(
      zip(this.vertices, rightShift(this.vertices)),
      zip(midpoints, perps),
    )) {
      for (let notch of reversed(this.notches)) {
        let id = notches.length
        let n = m1.towards(c1, notch)
        notches.push(n)
        stars[id] = new Line(c1, c1.vectTo(center)).intersect(new Line(n, perp))
      }
      if (this.hasCenterNotch) {
        notches.push(m1)
      }
      for (let notch of this.notches) {
        let id = notches.length
        let n = m1.towards(c2, notch)
        notches.push(m1.towards(c2, notch))
        stars[id] = new Line(c2, c2.vectTo(center)).intersect(new Line(n, perp))
      }
    }
    this.midpoints = midpoints
    this.notchPoints = notches
    this.stars = stars
  }

  get n() {
    return this.notches.length * this.vertices.length
  }

  // given a numerical index, return the index of the side that this notch would appear on
  getSide(i) {
    return Math.floor(i / (2 * this.notches.length))
  }

  getTrackCurve(curve) {
    if (this.vertices.length % 2 == 1) {
      throw `getTrackCurve with odd number of vertices ${this.vertices.length}`
    }
    let c1 = curve[0]
    let c2 = curve[1]
    let cn1 = hexToNumerical(c1) - 1 // iterative starts at 1, not 0
    let cn2 = hexToNumerical(c2) - 1 // iterative starts at 1, not 0
    if (cn1 > cn2) {
      throw `getCurve got unordered curve ${curve}`
    }
    // console.log('notch points', this.notchPoints)
    let p1 = this.notchPoints[cn1]
    let p2 = this.notchPoints[cn2]
    let c1star = this.stars[cn1]
    let c2star = this.stars[cn2]

    let step = distance(this.n * 2, cn1, cn2)
    // console.log('p1 p2', step, curve, p1, p2, cn1, cn2)
    // console.log('getCurve', curve, step, this.vertices.length)

    // compute symmetry axis
    let midpoint = p1.midpoint(p2)

    if (midpoint.same(this.center)) {
      throw `midpoint is center ${this.vertices.length} ${curve}`
    }
    // console.log('midpoint', p1, p2, midpoint)

    // let symmetryLine = new Line(midpoint, midpoint.vectTo(this.center))
    // let symmetryLine = new Line(this.center, this.center.vectTo(midpoint))
    let symmetryLine = new Line(this.center, p1.vectTo(p2).perp())
    // console.log('symmetry line', symmetryLine)
    // console.log('center', this.center)

    let alphaAngle = degToRad(360 / this.vertices.length) // angle from center between consecutive vertices
    let edgeDistance = this.side / 2 / Math.tan(alphaAngle / 2) // distance from the center to the closest edge, it's height
    // if (this.vertices.length == 4) {
    //   edgeDistance = (this.side / 2 / Math.tan(alphaAngle / 2)) * 0.3
    // }
    // console.log('edgeDistance', this.vertices.length, edgeDistance, radToDeg(alphaAngle), this.side)

    let nTracks = this.notchPoints.length / 4
    let centerOffset = 0.5
    // if (this.vertices.length == 4) {
    //   centerOffset = -1
    // }
    // console.log('nTracks', this.vertices.length, this.notchPoints.length, nTracks)
    let incrementDistance = edgeDistance / (nTracks + centerOffset) // ensure that the first track starts some way from the center
    // console.log('incrementDistance', this.vertices.length, incrementDistance)

    let incrementVect = symmetryLine.v.unit()
    if (incrementVect.dot(this.center.vectTo(midpoint)) < 0) {
      // console.warn(`IncrementVector is in wrong direction`)
      incrementVect = incrementVect.mult(-1)
    }
    let gap = (step + 1) / 2
    let stepFromCenter = this.notchPoints.length / 4 - gap
    // console.log('stepFromCenter', this.vertices.length, step, gap, stepFromCenter)
    let track = new Line(
      // this.center.addVect(incrementVect.mult((2 * stepFromCenter - 1) * incrementDistance)),
      this.center.addVect(incrementVect.mult((1 * stepFromCenter + 0.5) * incrementDistance)),
      incrementVect.perp(),
    )
    return new rayLineRayCurve(
      new Ray(
        p1,
        p1
          .vectTo(c1star)
          .unit()
          .mult(this.side * 0.2),
      ),
      track,
      new Ray(
        p2,
        p2
          .vectTo(c2star)
          .unit()
          .mult(this.side * 0.2),
      ),
    )
    // return new QuadraticBezier(p1, track.p, p2)
    // return new StraightStroke(p1, p2)
  }

  nextChar(c) {
    let numeric = hexToNumerical(c) - 1
    // console.log('next of', c, 'is', numericalToHex(numeric + 2))
    return numericalToHex(numeric + 2)
  }

  // Should only be used for triangles, doesn't look good for other ngons
  getStarCurve(curve) {
    let c1 = curve[0]
    let c2 = curve[1]
    let cn1 = hexToNumerical(c1) - 1 // iterative starts at 1, not 0
    let cn2 = hexToNumerical(c2) - 1 // iterative starts at 1, not 0
    if (cn1 > cn2) {
      throw `getCurve got unordered curve ${curve}`
    }
    // console.log('notch points', this.notchPoints)
    let p1 = this.notchPoints[cn1]
    let p2 = this.notchPoints[cn2]
    let c1star = this.stars[cn1]
    let c2star = this.stars[cn2]

    let step = distance(this.n * 2, cn1, cn2)
    if (this.notches.length == 1) {
      if (c1star.distance(c2star) < THRESHOLD) {
        return new QuadraticBezier(p1, c1star, p2)
      }
      return new CubicBezier(p1, c1star, c2star, p2)
    }

    // the following is for two notches

    if (c1star.distance(c2star) < THRESHOLD) {
      return new QuadraticBezier(p1, c1star, p2)
    }
    if (step == 1) {
      // console.log('step 1', this.notches.length, curve)
      if (this.notches.length == 2) {
        if (['23', '67', 'AB'].includes(curve)) {
          return new CubicBezier(
            p1,
            p1.addVect(p1.vectTo(c1star).mult(0.5)),
            p2.addVect(p2.vectTo(c2star).mult(0.5)),
            p2,
          )
        }
      }
      let dist = Math.min(p1.distance(p2), p1.distance(c1star), p2.distance(c2star))
      let perp1 = p1.addVect(p1.vectTo(c1star).unit().mult(dist))
      let perp2 = p2.addVect(p2.vectTo(c2star).unit().mult(dist))
      return new CubicBezier(p1, perp1, perp2, p2)
    }
    if (step == 3 && ['14', '58', '9C'].includes(curve)) {
      const p1plus = this.notchPoints[cn1 + 1]
      const p1plusplus = this.notchPoints[cn1 + 2]
      const p2plusstar = p1plus.addVect(p1plus.vectTo(this.stars[cn1 + 1]).mult(0.5))
      const p3plusstar = p1plusplus.addVect(p1plusplus.vectTo(this.stars[cn1 + 2]).mult(0.5))
      const mid = p2plusstar.midpoint(p3plusstar)
      return new CompositeCurve(
        new CubicBezier(p1, c1star, p2plusstar, mid),
        new CubicBezier(mid, p3plusstar, c2star, p2),
      )
    }
    if (
      [
        '16',
        '1A',
        '47',
        '4B',
        '52',
        '5A',
        '28',
        '8B',
        '39',
        '69',
        '3C',
        '7C',
        '25',
        '29',
        '38',
      ].includes(curve)
    ) {
      return new CubicBezier(p1, c1star, c2star, p2)
    }
    if (['18', '49', '5C'].includes(curve)) {
      const p1plus = this.stars[cn1 + 1]
      const p2plus = this.stars[cn2 - 1]
      const mid = p1plus.midpoint(p2plus)
      return new CompositeCurve(
        new CubicBezier(p1, c1star, p1plus, mid),
        new CubicBezier(mid, p2plus, c2star, p2),
      )
    }
    if (['27', '3A', '6B'].includes(curve)) {
      // return new CompositeCurve(
      //     new QuadraticBezier(p1, p1prime, midprime),
      //     new QuadraticBezier(midprime, p2prime, p2),
      //   )
      return new CubicBezier(p1, c1star, c2star, p2)
    }

    console.log('straight line', curve)
    return new StraightStroke(p1, p2)
  }

  getCurve(curve) {
    if (this.vertices.length == 3) {
      return this.getStarCurve(curve)
    }

    return this.getTrackCurve(curve)
  }

  getTile(n) {
    return generateIterativeCatalanNumerical(this.n, n)
  }

  getCatalanTile({ n, tile }) {
    if (n != undefined && !tile) {
      tile = this.getTile(n)
    }
    let curves = getPairs(tile)
    let lines = curves.map((curve) => this.getCurve(curve))
    return lines
  }
}

const genericTruchetGrid = {
  template: `
    <g v-if="grid" class="grid squares">
      <template v-for="face in grid">
        <g v-if="showEdges"  class="face">
          <path
            class="polygon"
            :data-face="face.id"
            :d="face.ngon.face.d"
            :style="{fill: 'white', stroke: 'black', 'fill-opacity':0.8}"
          />
        </g>
        <template v-for="curve in face.tile.getCatalanTile({n:face.n})">
          <path class="stroke medium" :d="curve.d()" />
        </template>
      </template>
    </g>
    `,
  props: {
    pattern: Object,
    bbox: Object,
    start: {
      type: Object,
      default: new Point(0, 0),
    },
    size: {
      type: Number,
      default: 100,
    },
    angle: {
      type: Number,
      default: 0,
    },
    iterations: {
      type: Number,
      default: -1,
    },
    showEdges: Boolean,
    notches: Object,
  },
  computed: {
    grid() {
      let grid = new VertexGrid({
        bbox: this.bbox,
        start: this.start,
        size: this.size,
        angle: this.angle,
        pattern: this.pattern,
        iterations: this.iterations,
      }).generate()
      let retList = []
      for (let ngon of Object.values(grid.getFaces())) {
        retList.push({
          ngon,
          tile: new GenericTruchetTile(
            ngon.vertices.map((vertex) => vertex.point),
            false,
            this.notches,
            this.size,
          ),
          n: randomInt(10000000000), // should be 1289904147324 for 24
        })
      }
      return retList
    },
  },
}

export { GenericTriangleTruchetTile, GenericTruchetTile, genericTruchetGrid }
