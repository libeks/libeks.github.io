import {
  degToRad,
  radToDeg,
  closeEnough,
  normalizeRadians,
  normalizeRadianString,
} from '/js/math.js'
import { Point, Vector, Point2DOrigin, LineSegment } from '/js/geometry.js'
import { Polygon } from '/js/lines.js'

const THRESHOLD = 0.01

const regularTilings = ['3.3.3.3.3.3', '6.6.6', '4.4.4.4']
const semiregularTilings = [
  '3.12.12',
  '3.4.6.4',
  '4.6.12',
  '3.6.3.6',
  '4.8.8',
  '3.3.4.3.4',
  '3.3.3.4.4',
  '3.3.3.3.6', // ambiguous, can't get past the initial hex surrounded by triangles
]
const planeVertexTilings = [
  '3.3.4.12',
  '3.4.3.12',
  '3.3.6.6',
  '3.4.4.6',
  '3.7.42',
  '3.8.24',
  '3.9.18',
  '3.10.15',
  '3.12.12',
  '4.5.20',
  '4.6.12',
  '5.5.10',
]

class NGon {
  constructor({ n, side, angleFraction, angle, center, firstVertex }) {
    // center is assumed to be the origin
    this.n = n
    this.side = side
    this.angle = 0
    this.alphaDeg = 360 / this.n
    this.alphaRad = degToRad(this.alphaDeg)

    if (angleFraction) {
      this.angle = this.alphaRad * angleFraction
    }
    if (angle) {
      this.angle = angle
    }

    this.center = Point2DOrigin
    if (center) {
      this.center = center
    }
    let h = this.side / (2 * Math.sin(this.alphaRad / 2))
    this.v = new Vector(h, 0) // vector in the positive 0x axis direction
    if (firstVertex) {
      // console.log('firstVertex', firstVertex, firstVertex.point, radToDeg(angle))
      this.center = firstVertex.point.addVect(this.v.rotateRad(angle + this.vertexAngle / 2))
      this.v = this.center.vectTo(firstVertex.point)
    } else {
      this.v = this.v.rotateRad(this.angle) // v points in the direction of the first vertex
    }
  }

  get vertices() {
    let vertices = []
    for (let i = 0; i < this.n; i++) {
      vertices.push(this.center.addVect(this.v.rotateRad(this.alphaRad * i))) // add 0.5 to make sure the poly's look horizontal
    }
    return vertices
  }

  get lines() {
    let lines = []
    for (let i = 0; i < this.vertices.length; i++) {
      let firstVertex = this.vertices[i]
      let secondVertex = this.vertices[(i + 1) % this.vertices.length]
      lines.push(new LineSegment(firstVertex, firstVertex.vectTo(secondVertex)))
    }
    return lines
  }

  get color() {
    const colorMap = { 3: 'yellow', 4: 'red', 6: 'lime', 8: 'orange' }
    if (this.n in colorMap) {
      return colorMap[this.n]
    }
    return 'blue'
  }

  get vertexAngle() {
    // return the angle, in radians, between two consecutive edges
    // console.log('vertexAngle', this.n, degToRad(180 - 360 / this.n))
    return degToRad(180 - 360 / this.n)
  }

  get d() {
    return new Polygon(this.vertices).d()
  }
}

class RotatedFace {
  constructor(id, face) {
    this.id = id
    // this.center = center
    // this.angle = angle
    this.face = face
    this.vertices = []
    this.edges = []
  }
}

class TilingPattern {
  constructor(...patterns) {
    console.log('patterns', patterns)
    // input is a list of strings, each string consists of a sequence of polygon numbers that add up to 360 degrees
    this.patterns = patterns.map((pattern) => pattern.split('.'))
    console.log(this.patterns)
    this.potentials = getPatternPotentials(...this.patterns)
    console.log('potentials', this.potentials)
  }
}

function shiftPattern(pattern) {
  return [pattern[pattern.length - 1], ...pattern.slice(0, pattern.length - 1)]
}

function getPatternPotentials(...patterns) {
  console.log('getPatternPotentials', patterns)
  let potentials = new Set()
  for (let pattern of patterns) {
    let reverse = [...pattern].reverse()
    for (let i = 0; i < pattern.length; i++) {
      pattern = shiftPattern(pattern)
      reverse = shiftPattern(reverse)
      potentials.add(pattern.join('.'))
      potentials.add(reverse.join('.'))
    }
  }
  return Array.from(potentials).map((key) => key.split('.'))
}

class Vertex {
  constructor(id, point, pattern) {
    this.id = id
    this.point = point
    this.pattern = pattern
    this.patternPotentials = pattern.potentials
    // console.log('initial pattern potential', this.patternPotentials)
    this.faces = []
  }

  isComplete() {
    // return this.faces.length == this.pattern.length
    let totalAngle = this.faces.reduce((acc, current) => acc + current.vertexAngle, 0)
    return radToDeg(totalAngle) == 360
  }

  faceAngles() {
    return this.faces.map((face) => face[2])
  }

  refinePatterns() {
    // console.log('refinePatterns faces', this.faces)
    if (this.faces.length == 0) {
      throw `Cannot refine vertex with no faces`
    }
    if (this.patternPotentials.length < 2) {
      // there is nothing to refine
      return
    }
    let firstAngle = normalizeRadians(this.faces[0][2])
    // console.log('firstAngle', firstAngle, this.faces[0])
    let newPatterns = []
    let faceAngles = {}
    for (let [face, _, angle] of this.faces) {
      faceAngles[`${face.face.n}:${normalizeRadianString(angle)}`] = [face, angle]
    }
    console.log(`vertex ${this.id} faceAngles`, faceAngles)
    let faceAngleSet = new Set(Object.keys(faceAngles))
    for (let pat of this.patternPotentials) {
      let angle = firstAngle
      let patternAngles = {}
      for (let n of pat) {
        let key = `${n}:${normalizeRadianString(angle)}`
        // console.log('n', n, angle, key)
        patternAngles[`${n}:${normalizeRadianString(angle)}`] = n
        angle = normalizeRadians(angle + degToRad(180 - 360 / n))
      }
      let patternAngleSet = new Set(Object.keys(patternAngles))
      console.log(`vertex ${this.id} patternAngles`, patternAngles)

      if (faceAngleSet.difference(patternAngleSet).size == 0) {
        newPatterns.push(pat)
      }
    }
    if (newPatterns.length == 0) {
      throw `Got no potentials for vertex ${this.id}`
    }
    console.log(
      `after refinding, vertex ${this.id} got new patterns ${newPatterns.map((pat) => pat.join(',')).join(';')}`,
    )
    this.patternPotentials = newPatterns
  }

  computeMissing() {
    // console.log(`compute missing for ${this.id}`)
    if (this.isComplete()) {
      return []
    }
    this.refinePatterns()
    // console.log(
    //   `vertex ${this.id} patternPotentials`,
    //   this.patternPotentials.length,
    //   this.patternPotentials,
    // )
    if (this.patternPotentials.length > 1) {
      return []
    }
    let firstAngle = normalizeRadians(this.faces[0][2])
    // console.log(`Vertex ${this.id} already has angles ${this.faces}`)
    let faceAngles = {}
    for (let [face, _, angle] of this.faces) {
      faceAngles[`${face.face.n}:${normalizeRadianString(angle)}`] = [face, angle]
    }
    // console.log(`vertex ${this.id} face angles`, faceAngles)
    let faceAngleSet = new Set(Object.keys(faceAngles))
    let angle = firstAngle
    let patternAngles = {}
    for (let n of this.patternPotentials[0]) {
      patternAngles[`${n}:${normalizeRadianString(angle)}`] = [n, angle]
      angle = normalizeRadians(angle + degToRad(180 - 360 / n))
    }
    // console.log(`vertex ${this.id} pattern angles`, patternAngles)
    let patternAngleSet = new Set(Object.keys(patternAngles))
    let missingKeys = Array.from(patternAngleSet.difference(faceAngleSet))
    // if (missingKeys.length + this.faces.length != this.pattern.length) {
    //   throw `Inconsistent number of missings for ${this.id}: ${missingKeys.length}, ${this.faces.length}, ${this.pattern.length}`
    // }
    let missing = missingKeys.map((key) => patternAngles[key])
    // console.log(`vertex ${this.id} will have new faces ${missing}`)
    return missing
  }
}

class Edge {
  constructor(id, pointA, pointB) {
    // this.id = id
    this.points = [pointA, pointB]
    this.faces = [null, null]
  }

  get id() {
    return `${this.pointA}:${this.pointB}`
  }

  reverse() {
    let edge = new Edge(this.id, this.points[1], this.points[0])
    edge.faces = [this.faces[1], this.faces[0]]
    return edge
  }
}

class VertexGrid {
  constructor({ bbox, start, size, angle, pattern }) {
    this.start = start
    this.angle = angle
    this.bbox = bbox
    this.size = size
    this.pattern = pattern
    this.vertices = {}
    this.edges = {}
    this.faces = {}
  }

  vertexAt(pt) {
    if (pt.type != 'Point') {
      console.trace()
      throw `VertexGrid.vertexAt received unexpected argument ${pt.string()}`
    }
    // console.log('checking point', pt)
    for (let vertex of Object.values(this.vertices)) {
      if (vertex.point.distance(pt) < THRESHOLD) {
        // console.log('vertex close to point', vertex, pt)
        return vertex
      }
    }
    // console.log('no vertext found close to ', pt)
    return null
  }

  addFace(polygon) {
    // console.log('addFace', polygon)
    let face = new RotatedFace(/** id: **/ Object.values(this.faces).length, polygon)
    this.faces[face.id] = face

    let polyLines = polygon.lines
    // console.log('polylines', polyLines)
    // console.log(`adding face ${face.id} of size ${face.face.n}`)
    for (let i = 0; i < polyLines.length; i++) {
      let firstLine = polyLines[i]
      let secondLine = polyLines[(i + 1) % polyLines.length]
      let point = secondLine.p
      let vertex = this.vertexAt(point)
      if (vertex == null) {
        vertex = new Vertex(Object.values(this.vertices).length, point, this.pattern)
        // console.log('adding new vertex', vertex)
        this.vertices[vertex.id] = vertex
      }
      face.vertices.push(vertex) // todo, is this sufficient?
      // console.log(`adding face ${face.id} to vertex ${vertex.id}`)
      if (vertex.faces.length >= vertex.pattern.length) {
        throw `Vertex ${vertex.id} already has enough faces, can't add any more`
      }
      // console.log(
      //   `addFace pushing ${normalizeRadians(-firstLine.v.angle())}, ${normalizeRadians(secondLine.v.angle())}, ${firstLine.string()}, ${secondLine.string()}`,
      // )
      vertex.faces.push([
        face,
        normalizeRadians(-firstLine.v.angle()),
        normalizeRadians(secondLine.v.angle()),
      ])
    }
  }

  generate() {
    this.vertices[0] = new Vertex(0, this.start, this.pattern)
    // console.log('generate', this.faces, this.vertices, this.angle)
    let angle = this.angle
    for (let n of this.pattern.patterns[0].map((val) => Number(val))) {
      // console.log('new ngon', radToDeg(angle))
      let face = new NGon({ n, side: this.size, angle, firstVertex: this.vertices[0] })
      let oldAngle = face.vertexAngle
      angle += face.vertexAngle
      this.addFace(face, oldAngle, angle)
    }
    let isUpdated = true
    let nAdded = 0
    while (isUpdated && nAdded < 200) {
      // continue until no changes are made
      isUpdated = false
      for (let vertex of Object.values(this.vertices)) {
        if (vertex.isComplete()) {
          continue
        }
        if (this.bbox.distance(vertex.point) > this.side * 20) {
          // point is too far
          continue
        }
        vertex.refinePatterns()
        // console.log(`vertex ${vertex.id} potentials`, vertex.patternPotentials)
        if (vertex.patternPotentials.length == 1) {
          let updates = vertex.computeMissing()
          if (updates.length == 0) {
            continue
          }
          for (let [n, angle] of updates) {
            let face = new NGon({ n, side: this.size, angle, firstVertex: vertex })
            this.addFace(face, angle, 0)
          }
          isUpdated = true
          nAdded += 1
          break
        }
      }
      // break
    }
    return this // allow chaining
  }

  getFaces() {
    let faces = Object.values(this.faces)
    // console.log(
    //   'faces',
    //   faces,
    //   this.faces,
    //   faces.map((face) => face.face.d),
    // )
    return faces
  }

  getVertices() {
    let vertices = Object.values(this.vertices)
    // console.log(
    //   'vertices',
    //   vertices.map((vert) => vert.faces.length),
    // )
    return vertices
  }
}

export { VertexGrid, NGon, TilingPattern }
