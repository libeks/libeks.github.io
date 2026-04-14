import { Point, Line } from '/js/geometry.js'
import { reversed, shift, rightShift, zip } from '/js/utils.js'
import { generateIterativeCatalanNumerical } from '/js/catalan.js'
import { getPairs } from '/js/triangular-tiles.js'
import { hexToNumerical } from '/js/catalan.js'
import { StraightStroke } from '/js/lines.js'

// This is similar to triangular-tiles.js and square-tiles.js, but tries to generalize to any n-gon.
// It also operates on an arbitrarily placed and rotated n-gon, based off of its vertices

class GenericTriangleTruchet {
  constructor(vertices, hasCenterNotch, notches, nCatalan) {
    this.vertices = vertices
    this.hasCenterNotch = hasCenterNotch
    this.notches = notches
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
  getPoints() {
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

    return {
      midpoints,
      notches,
      stars,
    }
  }

  getCatalanTile(n) {
    return []
  }
}

class GenericDodecagonTruchet {
  constructor(vertices, hasCenterNotch, notches, nCatalan) {
    if (vertices.length != 12) {
      throw `Unexpected number of vertices for dodecagon: ${vertices.length}`
    }
    this.vertices = vertices
    this.hasCenterNotch = hasCenterNotch
    this.notches = notches
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
  getPoints() {
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

    return {
      midpoints,
      notches,
      stars,
    }
  }

  getCurve(curve) {
    let c1 = curve[0]
    let c2 = curve[1]
    let cn1 = hexToNumerical(c1)
    let cn2 = hexToNumerical(c2)
    let p1 = this.getPoints().notches[cn1] //TODO: memoize points
    let p2 = this.getPoints().notches[cn2]
    console.log('p1 p2', curve, p1, p2)
    return new StraightStroke(p1, p2)
  }

  getCatalanTile(n) {
    console.log(`get dodecahedron with n=${n}`, this.notches, this.vertices)
    let k = (this.notches.length * this.vertices.length) / 2
    console.log(`k=${k}`)
    let tile = generateIterativeCatalanNumerical(k, n)
    let curves = getPairs(tile)
    console.log(`tile ${n}`, tile, 'curves', curves)
    let lines = curves.map((curve) => this.getCurve(curve))
    console.log('lines', lines)
    return lines
  }
}

export { GenericTriangleTruchet, GenericDodecagonTruchet }
