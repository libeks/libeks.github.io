import { Point, Line, Ray } from '/js/geometry.js'
import { reversed, shift, rightShift, zip, enumerate, range, crossProduct } from '/js/utils.js'
import { degToRad, radToDeg, distance, randomInt } from '/js/math.js'
import { getPairs } from '/js/triangular-tiles.js'
import { Triangulation } from '/js/catalan-structures.js'
import {
  hexToNumerical,
  numericalToHex,
  generateIterativeCatalanNumerical,
  generateIterativeCatalanParentheses,
} from '/js/catalan.js'
import {
  StraightStroke,
  QuadraticBezier,
  CubicBezier,
  CompositeCurve,
  rayLineRayCurve,
  ClosedCurve,
} from '/js/lines.js'
import { VertexGrid } from '/js/grid.js'
import { Random } from '/js/random.js'

// This is similar to triangular-tiles.js and square-tiles.js, but tries to generalize to any n-gon.
// It also operates on an arbitrarily placed and rotated n-gon, based off of its vertices

const THRESHOLD = 0.01

class GenericTruchetTile {
  constructor(vertices, notches, side) {
    // console.log('side', side)
    for (let vertex of vertices) {
      if (vertex.type != 'Point') {
        throw `GenericTruchetTile got vertex with unexpected type ${vertex.type}`
      }
    }
    this.vertices = vertices
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

  // return a list of notch-, start-, corner-, and mid-points
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

    // compute symmetry axis
    let midpoint = p1.midpoint(p2)

    if (midpoint.same(this.center)) {
      throw `midpoint is center ${this.vertices.length} ${curve}`
    }

    let symmetryLine = new Line(this.center, p1.vectTo(p2).perp())

    let alphaAngle = degToRad(360 / this.vertices.length) // angle from center between consecutive vertices
    let edgeDistance = this.side / 2 / Math.tan(alphaAngle / 2) // distance from the center to the closest edge, it's height

    let nTracks = this.notchPoints.length / 4
    let centerOffset = 0.5
    let incrementDistance = edgeDistance / (nTracks + centerOffset) // ensure that the first track starts some way from the center

    let incrementVect = symmetryLine.v.unit()
    if (incrementVect.dot(this.center.vectTo(midpoint)) < 0) {
      incrementVect = incrementVect.mult(-1)
    }
    let gap = (step + 1) / 2
    let stepFromCenter = this.notchPoints.length / 4 - gap
    let track = new Line(
      this.center.addVect(incrementVect.mult((1 * stepFromCenter + 0.5) * incrementDistance)),
      incrementVect.perp(),
    )
    return new rayLineRayCurve(
      new Ray(p1, p1.vectTo(c1star).withLength(this.side * 0.2)),
      track,
      new Ray(p2, p2.vectTo(c2star).withLength(this.side * 0.2)),
    )
  }

  getSquareCurve(curve) {
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
    let p1 = this.notchPoints[cn1]
    let p2 = this.notchPoints[cn2]
    let c1star = this.stars[cn1]
    let c2star = this.stars[cn2]

    if (this.notches.length == 1) {
      // direct lines across, closest to center
      if (['16', '25', '38', '47'].includes(curve)) {
        return new StraightStroke(p1, p2)
      }
      if (['18', '23', '45', '67'].includes(curve)) {
        // small corner
        return new QuadraticBezier(p1, c1star, p2)
      }
      if (['12', '34', '56', '78'].includes(curve)) {
        // same side
        return new CubicBezier(p1, p1.towards(c1star, 0.7), p2.towards(c2star, 0.7), p2)
      }
      if (['14', '27', '36', '58'].includes(curve)) {
        return new CubicBezier(p1, c1star, c2star, p2)
      }
      console.warn('Single notch cube curve without a curve, drawing straight line', curve)
      return new StraightStroke(p1, p2)
    }

    // the below handles 2-notches (i.e. 4 notches per side)

    if (['1G', '45', '89', 'CD'].includes(curve)) {
      // small corner
      return new QuadraticBezier(p1, c1star, p2)
    }
    if (['2F', '36', '7A', 'BE'].includes(curve)) {
      // larger corner
      return new QuadraticBezier(p1, c1star, p2)
    }

    if (['12', '34', '56', '78', '9A', 'BC', 'DE', 'FG'].includes(curve)) {
      // same side next to corner, close by
      return new CubicBezier(
        p1,
        p1.addVect(p1.vectTo(c1star).withLength(this.side * 0.1)),
        p2.addVect(p2.vectTo(c2star).withLength(this.side * 0.1)),
        p2,
      )
    }

    if (['1A', '29', '3C', '4B', '5E', '6D', '7G', '8F'].includes(curve)) {
      // almost diagonal curve, passing closest to centerpoint
      let c1pt = p1.addVect(p1.vectTo(c1star).withLength(this.side * 0.15))
      let c2pt = p2.addVect(p2.vectTo(c2star).withLength(this.side * 0.15))
      let midpoint = c1pt.midpoint(c2pt)
      return new CompositeCurve(
        new QuadraticBezier(p1, c1pt, midpoint),
        new QuadraticBezier(midpoint, c2pt, p2),
      )
    }

    if (['16', '38', '4F', '5A', '7C', '9E', 'AD', 'CG'].includes(curve)) {
      return new CubicBezier(p1, c1star, c2star, p2)
    }

    let step = distance(this.n * 2, cn1, cn2)

    // compute symmetry axis
    let midpoint = p1.midpoint(p2)

    if (midpoint.same(this.center)) {
      throw `midpoint is center ${this.vertices.length} ${curve}`
    }

    let symmetryLine = new Line(this.center, p1.vectTo(p2).perp())

    let alphaAngle = degToRad(360 / this.vertices.length) // angle from center between consecutive vertices
    let edgeDistance = this.side / 2 / Math.tan(alphaAngle / 2) // distance from the center to the closest edge, it's height

    let nTracks = this.notchPoints.length / 4
    let centerOffset = 0.5
    let incrementDistance = edgeDistance / (nTracks + centerOffset) // ensure that the first track starts some way from the center

    let incrementVect = symmetryLine.v.unit()
    if (incrementVect.dot(this.center.vectTo(midpoint)) < 0) {
      incrementVect = incrementVect.mult(-1)
    }
    let gap = (step + 1) / 2
    let stepFromCenter = this.notchPoints.length / 4 - gap
    let track = new Line(
      this.center.addVect(incrementVect.mult((1 * stepFromCenter + 0.5) * incrementDistance)),
      incrementVect.perp(),
    )
    return new rayLineRayCurve(
      new Ray(p1, p1.vectTo(c1star).withLength(this.side * 0.2)),
      track,
      new Ray(p2, p2.vectTo(c2star).withLength(this.side * 0.2)),
    )
  }

  nextChar(c) {
    let numeric = hexToNumerical(c) - 1
    return numericalToHex(numeric + 2)
  }

  // Should only be used for triangles, doesn't look good for other ngons
  getTriangleCurve(curve) {
    let c1 = curve[0]
    let c2 = curve[1]
    let cn1 = hexToNumerical(c1) - 1 // iterative starts at 1, not 0
    let cn2 = hexToNumerical(c2) - 1 // iterative starts at 1, not 0
    if (cn1 > cn2) {
      throw `getCurve got unordered curve ${curve}`
    }
    let p1 = this.notchPoints[cn1]
    let p2 = this.notchPoints[cn2]
    let c1star = this.stars[cn1]
    let c2star = this.stars[cn2]

    let step = distance(this.n * 2, cn1, cn2)
    if (this.notches.length == 1) {
      if (c1star.distance(c2star) < THRESHOLD) {
        return new QuadraticBezier(p1, c1star, p2)
      }
      if (['14', '25', '36'].includes(curve)) {
        return new CubicBezier(p1, p1.towards(c1star, 0.75), p2.towards(c2star, 0.75), p2) // shorten to not interfere with '12'
      }
      return new CubicBezier(p1, c1star, c2star, p2)
    }

    // the following is for two notches

    if (c1star.distance(c2star) < THRESHOLD) {
      return new QuadraticBezier(p1, c1star, p2)
    }
    if (step == 1) {
      if (this.notches.length == 2) {
        if (['23', '67', 'AB'].includes(curve)) {
          let c1pt = p1.towards(c1star, 0.6)
          let c2pt = p2.towards(c2star, 0.6)
          let midpoint = c1pt.midpoint(c2pt)
          return new CubicBezier(p1, c1pt, c2pt, p2)
        }
      }
      let dist = Math.min(p1.distance(p2), p1.distance(c1star), p2.distance(c2star))
      let perp1 = p1.addVect(p1.vectTo(c1star).withLength(dist))
      let perp2 = p2.addVect(p2.vectTo(c2star).withLength(dist))
      return new CubicBezier(p1, perp1, perp2, p2)
    }
    if (step == 3 && ['14', '58', '9C'].includes(curve)) {
      const p1plus = this.notchPoints[cn1 + 1]
      const p1plusplus = this.notchPoints[cn1 + 2]
      const p2plusstar = p1plus.addVect(p1plus.vectTo(this.stars[cn1 + 1]).mult(0.7))
      const p3plusstar = p1plusplus.addVect(p1plusplus.vectTo(this.stars[cn1 + 2]).mult(0.7))
      const mid = p2plusstar.midpoint(p3plusstar)
      return new CompositeCurve(
        new CubicBezier(p1, c1star, p2plusstar, mid),
        new CubicBezier(mid, p3plusstar, c2star, p2),
      )
    }
    if (['16', '29', '38', '4B', '5A', '7C'].includes(curve)) {
      let midpoint = c1star.midpoint(c2star)
      return new CompositeCurve(
        new QuadraticBezier(p1, c1star, midpoint),
        new QuadraticBezier(midpoint, c2star, p2),
      )
    }
    if (['1A', '25', '47', '3C', '69', '8B'].includes(curve)) {
      return new CubicBezier(p1, c1star, c2star, p2)
    }
    if (['18', '49', '5C'].includes(curve)) {
      let p1plus
      let p2plus
      if (curve == 49) {
        // for 49 the order is flipped, since the notches in between are consecutive
        p1plus = this.stars[cn1 - 1]
        p2plus = this.stars[cn2 + 1]
      } else {
        // the notces between the two notches are disjoint, they loop around
        p1plus = this.stars[cn1 + 1]
        p2plus = this.stars[cn2 - 1]
      }
      // console.log('this.stars', this.stars)
      const mid = p1plus.midpoint(p2plus)
      // console.log('funny', curve, p1plus, p2plus, mid, cn1, cn2, cn1 + 1, cn2 - 1)
      return new CompositeCurve(
        new CubicBezier(p1, c1star, p1plus, mid),
        new CubicBezier(mid, p2plus, c2star, p2),
      )
    }
    if (['27', '3A', '6B'].includes(curve)) {
      return new CubicBezier(p1, p1.towards(c1star, 0.5), p2.towards(c2star, 0.5), p2)
    }

    console.warn('unknown curve segment, returning straight line', curve)
    return new StraightStroke(p1, p2)
  }

  getCurve(curve) {
    if (this.vertices.length == 3) {
      return this.getTriangleCurve(curve)
    }

    if (this.vertices.length == 4) {
      return this.getSquareCurve(curve)
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
    this.computePoints()
    // console.log('notchpoints', this.notchPoints)
    let lines = curves.map(
      (curve) => new CatalanFragment(curve, this.getCurve(curve), this.notchPoints),
    )
    // console.log(
    //   'getCatalanTile',
    //   lines,
    //   lines.map((line) => line.notchPoints.length),
    //   // this.vertices.length,
    // )
    return lines
  }
}

// CatalanFragment is a wrapper around a line, with extra information to help position it among other curves, and get directionality
class CatalanFragment {
  constructor(curve, line, points) {
    this.curve = curve
    this.line = line
    this.notchPoints = points
    this.type = 'CatalanFragment'
  }

  // get type() {
  //   return 'CatalanFragment'
  // }

  d() {
    return this.line.d()
  }

  contour() {
    return this.line.contour()
  }

  startpoint() {
    return this.line.startpoint()
  }

  endpoint() {
    return this.line.endpoint()
  }

  dContinued() {
    return this.line.dContinued()
  }

  bbox() {
    return this.line.bbox()
  }

  intersectLineU(line) {
    return this.line.intersectLineU(line)
  }

  at(t) {
    return this.line.at(t)
  }

  reverse() {
    return new CatalanFragment(
      this.curve.split('').reverse().join(''),
      this.line.reverse(),
      this.notchPoints,
    )
  }

  clip(bbox) {
    // console.log('this curve', this.curve)
    return this.line.clip(bbox)
  }
}

function generateTruchetGrid(grid, seed, notches, chooser) {
  // will return an array of top-level closed curves, along with individual curve fragments
}

const genericTruchetGrid = {
  template: `
    <g v-if="grid" class="grid squares">
      <template v-for="face in grid">
        <g v-if="showEdges"  class="face">
          <path
            class="polygon"
            :data-face="face.id"
            :d="face.ngon.face.d()"
            :style="{fill: 'white', stroke: 'black', 'fill-opacity':0.8}"
          />
        </g>
        <template v-if="!showContinuous" v-for="curve in face.tile.getCatalanTile({n:face.n})">
          <path class="stroke medium" :d="curve.d()" />
        </template>
      </template>
      <g v-if="showContinuous" v-for="(curve,i) in continuousTruchetCurves">
        <path class="polygon" :d="curve.d()" :style="{fill: 'white', stroke: 'black', 'fill-opacity':0.8}" :data-face="i" />
      </g>
      <g v-if="showFillLines" v-for="curve in closedTruchetCurves">
        <path v-for="line in curve.fill(3, Math.random()*180)" :d="line.d()" :style="{stroke:'purple'}" />
      </g>

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
    showContinuous: Boolean,
    showFillLines: Boolean,
    notches: Object,
    onlyNgonsInsideBBox: Boolean,
    seed: Number,
  },
  computed: {
    random() {
      console.log('random for pattern and seed', this.pattern, this.seed)
      return new Random(this.seed)
    },
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
      let allFaces = this.onlyNgonsInsideBBox ? grid.getFacesInBBox() : grid.getFaces()
      for (let ngon of allFaces) {
        retList.push({
          ngon,
          tile: new GenericTruchetTile(
            ngon.vertices.map((vertex) => vertex.point),
            this.notches,
            this.size,
          ),
          n: this.random.int(1289904147324), // 1289904147324 is C24
        })
      }
      return retList
    },
    curveFragmentsByNgons() {
      let byNGon = {}
      for (let face of this.grid) {
        let curves = []
        for (let [id, curve] of enumerate(face.tile.getCatalanTile({ n: face.n }))) {
          curves.push({
            id: `${face.ngon.id}.${id}`,
            faceID: face.ngon.id,
            curve,
          })
        }
        byNGon[face.ngon.id] = curves
      }
      return byNGon
    },
    neighborNGonIDs() {
      let byNGon = {}
      for (let face of this.grid) {
        byNGon[face.ngon.id] = face.ngon.edges.map((edge) => edge.id)
      }
      return byNGon
    },
    neighborNGonFragments() {
      let byNGon = {}
      for (let face of this.grid) {
        byNGon[face.id] = face.ngon.edges.map((edge) => edge.id)
      }
      return byNGon
    },
    continuousTruchetCurves() {
      // populate 'unprocessed' so all segments intially appear there. by the end of this method, 'unprocessed' should be empty
      let unprocessed = {}
      for (let ngon of Object.values(this.curveFragmentsByNgons)) {
        for (let curve of ngon) {
          unprocessed[curve.id] = curve
        }
      }
      let curves = []
      while (Object.keys(unprocessed).length > 0) {
        let start = Object.values(unprocessed)[0] // pick a 'random' curve to start with
        let end = start // initially the start and end are the same
        delete unprocessed[start.id]
        let aggregate = new CompositeCurve(start.curve)
        while (!aggregate.closed()) {
          let found = false
          // if the last element is a connector (straight stroke along perimeter), consider curves in the same face,
          // otherwise look at the current face's neighbors
          let neighbors = end.isConnector ? [end.faceID] : this.neighborNGonIDs[end.faceID]
          for (let neighborNGonID of neighbors) {
            if (!(neighborNGonID in this.curveFragmentsByNgons)) {
              continue
            }
            let neighborNGon = this.curveFragmentsByNgons[neighborNGonID]
            for (let curve of neighborNGon) {
              if (!(curve.id in unprocessed)) {
                continue
              }
              if (curve.curve.startpoint().same(end.curve.endpoint())) {
                aggregate.add(curve.curve)
                end = curve
                delete unprocessed[curve.id]
                found = true
                break
              } else if (curve.curve.endpoint().same(end.curve.endpoint())) {
                // the curve needs to be reversed before it can be added
                curve.curve = curve.curve.reverse()
                aggregate.add(curve.curve)
                end = curve
                delete unprocessed[curve.id]
                found = true
                break
              }
            }
            if (found) {
              // no need to look at curves in other neighbor ngons
              break
            }
          }
          if (!found && !end.isConnector) {
            // if we've run out of truchet curves to add to the end, add a straight line segment to the 'neighbor' notch of
            // the endpoint's notch. This should only be happening on the perimeter, where there is no neighbor ngon to connect to
            let endpointVertexID = hexToNumerical(end.curve.curve[1]) - 1
            let otherVertexNum =
              endpointVertexID % 2 == 0 ? endpointVertexID + 1 : endpointVertexID - 1
            let otherVertex = end.curve.notchPoints[otherVertexNum]
            end = {
              curve: new CatalanFragment(
                end.curve.curve[1] + numericalToHex(otherVertexNum),
                new StraightStroke(end.curve.endpoint(), otherVertex),
                end.curve.notchPoints,
              ),
              faceID: end.faceID,
              isConnector: true,
            }
            aggregate.add(end.curve)
            found = true
          }
          if (!found) {
            directions = directions.filter((dir) => dir != direction)
          }
        }
        // the curve is completed, i.e. it is closed, or we cannot make any progress on the curve
        curves.push(aggregate)
      }
      return curves
    },
    closedTruchetCurves() {
      let curves = this.continuousTruchetCurves.filter((curve) => curve.closed())
      let ancestors = {}
      let descendants = {}
      let children = {}
      let depth = {}
      for (let [i, c] of enumerate(curves)) {
        ancestors[i] = []
        descendants[i] = []
        children[i] = []
      }
      for (let [[a, curveA], [b, curveB]] of crossProduct(enumerate(curves))) {
        if (curveB.bbox().boxInside(curveA.bbox()) && curveB.inside(curveA.at(0.34))) {
          // curveA is a descendant of curveB
          descendants[b].push(a)
          ancestors[a].push(b)
        } else if (curveA.bbox().boxInside(curveB.bbox()) && curveA.inside(curveB.at(0.35))) {
          // curveB is a descendant of curveA
          descendants[a].push(b)
          ancestors[b].push(a)
        }
      }

      for (let [i, curve] of enumerate(curves)) {
        if (ancestors[i].length > 0) {
          let depth = ancestors[i].length
          for (let j of ancestors[i]) {
            if (ancestors[j].length == depth - 1) {
              children[j].push(i)
            }
          }
        }
      }
      let closed = curves.map((curve) => new ClosedCurve(curve, []))
      for (let [i, curve] of enumerate(closed)) {
        for (let childID of children[i]) {
          curve.minus.push(closed[childID])
        }
      }

      let topLevel = enumerate(closed)
        .filter(([i, curve]) => ancestors[i].length == 0)
        .map(([i, curve]) => curve)

      return topLevel
    },
  },
}

const genericTriangulationGrid = {
  template: `
    <g v-if="grid" class="grid squares">
      <g v-for="face in grid" class="face">
        <path
          class="polygon"
          :data-face="face.id"
          :d="face.ngon.face.d()"
          :style="{fill: 'white', stroke: 'black', 'fill-opacity':0.8}"
        />
        <path v-for="edge in face.internalEdges" :d="edge.d()" :style="{stroke: 'black', 'fill-opacity':0.8}" />
      </g>
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
      let allFaces = this.onlyNgonsInsideBBox ? grid.getFacesInBBox() : grid.getFaces()
      for (let ngon of allFaces) {
        let face = {
          ngon,
          internalEdges: new Triangulation(
            generateIterativeCatalanParentheses(ngon.vertices.length - 2, randomInt(1289904147324)),
          ).internalEdges.map(
            ([from, to]) => new StraightStroke(ngon.vertices[from].point, ngon.vertices[to].point),
          ),
          n: randomInt(1289904147324), // 1289904147324 is C24
        }
        retList.push(face)
      }
      return retList
    },
  },
}

export { GenericTruchetTile, genericTruchetGrid, genericTriangulationGrid }
