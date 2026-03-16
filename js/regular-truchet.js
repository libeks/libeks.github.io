import { Point, Line } from '/js/geometry.js'

// This is similar to triangular-tiles.js and square-tiles.js, but tries to generalize to any n-gon.
// It also operates on an arbitrarily placed and rotated n-gon, based off of its vertices

// shift leftward one position, with wraparound
// so shift([0,1,2,3]) => [3,0,1,2]
function shift(list) {
  return [list[list.length - 1], ...list.slice(0, list.length - 1)]
}

function reversed(list) {
  return [...list].reverse()
}

// zip together two arrays, the size of the return is the shortes of the two arrays
function zip(l1, l2) {
  // console.log('zip', l1, l2)
  let minLen = Math.min(l1.length, l2.length)
  let retList = []
  for (let i = 0; i < minLen; i++) {
    retList.push([l1[i], l2[i]])
  }
  // console.log('zip result', retList)
  return retList
}

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
    let midpoints = zip(this.vertices, shift(this.vertices)).map(([v1, v2]) => v1.midpoint(v2))
    let notches = []
    let stars = {}
    let perps = midpoints.map((pt) => pt.vectTo(center))
    for (let [[c1, c2], [m1, perp]] of zip(
      zip(this.vertices, shift(this.vertices)),
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

    // console.log('midpoints', midpoints, 'notches', notches)
    return {
      midpoints,
      notches,
      stars,
    }
  }

  getCatalanTile(n) {}
}

export { GenericTriangleTruchet }
