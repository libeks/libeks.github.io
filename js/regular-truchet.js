import { Point, Line } from '/js/geometry.js'
import { reversed, shift, rightShift, zip } from '/js/utils.js'
import { distance } from '/js/math.js'
import { generateIterativeCatalanNumerical } from '/js/catalan.js'
import { getPairs } from '/js/triangular-tiles.js'
import { hexToNumerical } from '/js/catalan.js'
import { StraightStroke, QuadraticBezier, CubicBezier } from '/js/lines.js'

// This is similar to triangular-tiles.js and square-tiles.js, but tries to generalize to any n-gon.
// It also operates on an arbitrarily placed and rotated n-gon, based off of its vertices

const THRESHOLD = 0.01

class GenericTriangleTruchet {
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

// class GenericDodecagonTruchet {
//   constructor(vertices, hasCenterNotch, notches, nCatalan) {
//     if (vertices.length != 12) {
//       throw `Unexpected number of vertices for dodecagon: ${vertices.length}`
//     }
//     this.vertices = vertices
//     this.hasCenterNotch = hasCenterNotch
//     this.notches = notches
//   }

//   getN() {
//     return this.vertices.length
//   }

//   get center() {
//     let x = 0
//     let y = 0
//     for (let vertex of this.vertices) {
//       x += vertex.x
//       y += vertex.y
//     }
//     return new Point(x / this.getN(), y / this.getN())
//   }

//   // return a list of lines
//   getPoints() {
//     let center = this.center
//     let midpoints = zip(this.vertices, rightShift(this.vertices)).map(([v1, v2]) => v1.midpoint(v2))
//     let notches = []
//     let stars = {}
//     let perps = midpoints.map((pt) => pt.vectTo(center))
//     for (let [[c1, c2], [m1, perp]] of zip(
//       zip(this.vertices, rightShift(this.vertices)),
//       zip(midpoints, perps),
//     )) {
//       for (let notch of reversed(this.notches)) {
//         let id = notches.length
//         let n = m1.towards(c1, notch)
//         notches.push(n)
//         stars[id] = new Line(c1, c1.vectTo(center)).intersect(new Line(n, perp))
//       }
//       if (this.hasCenterNotch) {
//         notches.push(m1)
//       }
//       for (let notch of this.notches) {
//         let id = notches.length
//         let n = m1.towards(c2, notch)
//         notches.push(m1.towards(c2, notch))
//         stars[id] = new Line(c2, c2.vectTo(center)).intersect(new Line(n, perp))
//       }
//     }

//     return {
//       midpoints,
//       notches,
//       stars,
//     }
//   }

//   get n() {
//     return this.notches.length * this.vertices.length
//   }

//   // given a numerical index, return the index of the side that this notch would appear on
//   getSide(i) {
//     return Math.floor(i / (2 * this.notches.length))
//   }

//   getCurve(curve) {
//     let c1 = curve[0]
//     let c2 = curve[1]
//     let cn1 = hexToNumerical(c1) - 1 // iterative starts at 1, not 0
//     let cn2 = hexToNumerical(c2) - 1 // iterative starts at 1, not 0
//     if (cn1 > cn2) {
//       throw `getCurve got unordered curve ${curve}`
//     }
//     let p1 = this.getPoints().notches[cn1] //TODO: memoize points
//     let p2 = this.getPoints().notches[cn2]
//     console.log('p1 p2', curve, p1, p2, cn1, cn2)
//     let dist = distance(this.n)
//     if (this.getSide(cn1) == this.getSide(cn2)) {
//       return new CubicBezier(p1, this.getPoints().stars[cn1], this.getPoints().stars[cn2], p2)
//     }
//     if (this.getSide(cn1) != this.getSide(cn2) && dist == 1) {
//       return new QuadraticBezier(p1, this.getPoints().stars[cn1], p2)
//     }
//     return new StraightStroke(p1, p2)
//   }

//   getCatalanTile(n) {
//     console.log(`get dodecahedron with n=${n}`, this.notches, this.vertices)
//     let k = this.n
//     console.log(`k=${k}`)
//     let tile = generateIterativeCatalanNumerical(k, n)
//     let curves = getPairs(tile)
//     console.log(`tile ${n}`, tile, 'curves', curves)
//     let lines = curves.map((curve) => this.getCurve(curve))
//     console.log('lines', lines)
//     return lines
//   }
// }

class GenericTruchet {
  constructor(vertices, hasCenterNotch, notches, nCatalan) {
    this.vertices = vertices
    this.hasCenterNotch = hasCenterNotch
    this.notches = notches
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

    // return {
    //   midpoints,
    //   notches,
    //   stars,
    // }
  }

  get n() {
    return this.notches.length * this.vertices.length
  }

  // given a numerical index, return the index of the side that this notch would appear on
  getSide(i) {
    return Math.floor(i / (2 * this.notches.length))
  }

  getCurve(curve) {
    let c1 = curve[0]
    let c2 = curve[1]
    let cn1 = hexToNumerical(c1) - 1 // iterative starts at 1, not 0
    let cn2 = hexToNumerical(c2) - 1 // iterative starts at 1, not 0
    if (cn1 > cn2) {
      throw `getCurve got unordered curve ${curve}`
    }
    console.log('notch points', this.notchPoints)
    let p1 = this.notchPoints[cn1]
    let p2 = this.notchPoints[cn2]
    let c1star = this.stars[cn1]
    let c2star = this.stars[cn2]

    let step = distance(this.n * 2, cn1, cn2)
    console.log('p1 p2', step, curve, p1, p2, cn1, cn2)

    // if (this.getSide(cn1) == this.getSide(cn2)) {
    //   return new CubicBezier(p1, c1star, c2star, p2)
    // }
    // if (this.getSide(cn1) != this.getSide(cn2) && dist == 1) {
    //   return new QuadraticBezier(p1, c1star, p2)
    // }
    if (c1star.distance(c2star) < THRESHOLD) {
      return new QuadraticBezier(p1, c1star, p2)
    }
    if (step == 1) {
      let dist = Math.min(p1.distance(p2), p1.distance(c1star), p2.distance(c2star))
      let perp1 = p1.addVect(p1.vectTo(c1star).unit().mult(dist))
      let perp2 = p2.addVect(p2.vectTo(c2star).unit().mult(dist))
      return new CubicBezier(p1, perp1, perp2, p2)
    }
    return new CubicBezier(p1, c1star, c2star, p2)
    // return new StraightStroke(p1, p2)
  }

  getTile(n) {
    return generateIterativeCatalanNumerical(this.n, n)
  }

  getCatalanTile({ n, tile }) {
    console.log(`getCatalanTile with n=${n} and tile=${tile}`)
    if (n != undefined && !tile) {
      tile = this.getTile(n)
    }
    console.log(`Tile ${tile}`)
    let curves = getPairs(tile)
    console.log(`tile ${n}`, tile, 'curves', curves)
    let lines = curves.map((curve) => this.getCurve(curve))
    console.log('lines', lines)
    return lines
  }
}

export { GenericTriangleTruchet, GenericTruchet }
