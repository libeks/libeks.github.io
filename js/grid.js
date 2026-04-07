import {
  degToRad,
  radToDeg,
  closeEnough,
  normalizeRadians,
  normalizeRadianString,
} from '/js/math.js'
import { Point, Vector, Point2DOrigin, LineSegment } from '/js/geometry.js'
import { Polygon } from '/js/lines.js'
import { BBox } from '/js/bbox.js'
import { pairs, circularPairs, zip, shift, enumerate, reversed } from '/js/utils.js'
import { KDTree } from '/js/spatial.js'

const THRESHOLD = 0.01
const MAX_DISTANCE = 0

class TilingPattern {
  constructor(patterns, hints) {
    // input is a list of strings, each string consists of a sequence of polygon numbers that add up to 360 degrees
    this.patterns = Object.entries(patterns).map(([id, pattern]) => ({
      pattern: pattern.split('.'),
      genus: Number(id),
    }))
    this.vertices = patterns
    this.firstVertex = 0
    this.allowReverse = true
    if (hints) {
      if (hints.faces) {
        this.faceHints = this.precomputeFaceHints(hints.faces)
      }
      if (hints.firstVertex) {
        this.firstVertex = hints.firstVertex
      }
      if (hints.noReverse) {
        this.allowReverse = false
      }
      if (hints.edges) {
        this.edgeHints = this.precomputeEdgeHints(hints.edges)
      }
    }
    this.potentials = this.getPatternPotentials(...this.patterns)
  }

  getPatternPotentials(...patterns) {
    let potentials = {}
    for (let pt of patterns) {
      let reversePattern = reversed(pt.pattern)
      let pattern = pt.pattern
      for (let i = 0; i < pt.pattern.length; i++) {
        pattern = shift(pattern)
        reversePattern = shift(reversePattern)
        potentials[pattern.join('.')] = {
          pattern: pattern,
          genus: pt.genus,
          shift: i,
          reverse: false,
        }
        if (this.allowReverse) {
          potentials[reversePattern.join('.')] = {
            pattern: reversePattern,
            genus: pt.genus,
            shift: i,
            reverse: true,
          }
        }
      }
    }
    return Object.values(potentials)
  }

  precomputeFaceHints(hints) {
    let hintObj = {}
    for (let [key, pattern] of Object.entries(hints)) {
      pattern = pattern.split('.').map((val) => Number(val))
      let potentials = {}
      let reversePattern = reversed(pattern)
      for (let i = 0; i < pattern.length; i++) {
        pattern = shift(pattern)
        reversePattern = shift(pattern)
        potentials[pattern.join('.')] = pattern
        potentials[reversePattern.join('.')] = reversePattern
      }
      hintObj[key] = Object.values(potentials)
    }
    return hintObj
  }

  precomputeEdgeHints(hints) {
    let hintObj = {}
    for (let [key, pattern] of Object.entries(hints)) {
      pattern = pattern.split('.')
      let potentials = {}
      let reversePattern = reversed(pattern)
      for (let i = 0; i < pattern.length; i++) {
        pattern = shift(pattern)
        reversePattern = shift(reversePattern)
        potentials[pattern.join('.')] = pattern
        potentials[reversePattern.join('.')] = reversePattern
      }
      hintObj[key] = Object.values(potentials)
    }
    // console.log('edge hints', hintObj)
    return hintObj
  }

  // return the list of possible vertex genera given a face genus
  getFaceHints(key) {
    return this.faceHints[key]
  }

  string() {
    return `[${this.vertices.join('; ')}]`
  }
}

const regularTilings = [
  new TilingPattern(['3.3.3.3.3.3']),
  new TilingPattern(['6.6.6']),
  new TilingPattern(['4.4.4.4']),
]
const semiregularTilings = [
  new TilingPattern(['3.12.12']),
  new TilingPattern(['3.4.6.4']),
  new TilingPattern(['4.6.12']), // causes infinite loop without reverse pattern
  new TilingPattern(['3.6.3.6']),
  new TilingPattern(['4.8.8']),
  new TilingPattern(['3.3.4.3.4']),
  new TilingPattern(['3.3.3.4.4']),
  new TilingPattern(['3a.3a.3b.3a.6'], { noReverse: true }),
  new TilingPattern(['3a.3b.3a.3a.6'], { noReverse: true }),
]
const planeVertexTilings = [
  new TilingPattern(['3.3.4.12']),
  new TilingPattern(['3.4.3.12']),
  new TilingPattern(['3.3.6.6']),
  new TilingPattern(['3.4.4.6']),
  new TilingPattern(['3.7.42']),
  new TilingPattern(['3.8.24']),
  new TilingPattern(['3.9.18']),
  new TilingPattern(['3.10.15']),
  new TilingPattern(['3.12.12']),
  new TilingPattern(['4.5.20']),
  new TilingPattern(['4.6.12']),
  new TilingPattern(['5.5.10']),
]

const uniform2Tilings = [
  new TilingPattern(['3a.3a.3a.3a.3a.3a', '3a.3a.4.3b.4'], {
    faces: { '3a': '0.1.1', '3b': '1.1.1', 4: '1.1.1.1' },
  }),
  new TilingPattern(['3a.4.6.4', '3a.3a.4.3b.4'], {
    faces: { '3a': '0.1.1', '3b': '1.1.1', 4: '0.0.1.1', 6: '1.1.1.1.1.1' },
  }),
  new TilingPattern(['3a.4.6.4', '3a.3b.3a.4.4'], {
    faces: { '3a': '0.1.1', '3b': '1.1.1', 4: '0.0.1.1', 6: '0.0.0.0.0.0' },
  }),
  new TilingPattern(['3.4a.6a.4a', '3.4a.4b.6b'], {
    faces: {
      3: '0.1.1',
      '4a': '0.0.1.1',
      '4b': '1.1.1.1',
      '6a': '0.0.0.0.0.0',
      '6b': '1.1.1.1.1.1',
    },
  }),
  new TilingPattern(['4.6.12', '3.4.6.4'], {
    faces: { 3: '1.1.1', 4: '0.0.1.1', 6: '0.0.1.0.0.1', 12: '0.0.0.0.0.0.0.0.0.0.0.0' },
  }),
  new TilingPattern(['3a.3b.3a.3b.3a.3b', '3a.3b.4.12'], {
    faces: { '3a': '0.1.1', '3b': '0.1.1', 4: '1.1.1.1', 12: '1.1.1.1.1.1.1.1.1.1.1.1' },
    firstVertex: 1,
  }),
  new TilingPattern(['3.12.12', '3.4.3.12'], {
    faces: { 3: '0.1.1', 4: '1.1.1.1', 12: '0.0.1.0.0.1.0.0.1.0.0.1' },
  }), // broken
  new TilingPattern(['3.3.3.3.3.3', '3.3.6.6'], { firstVertex: 1 }),
  new TilingPattern(['3a.3b.3a.3b.3a.3b', '3a.3b.3b.3a.6'], { firstVertex: 1 }),
  new TilingPattern(['3a.3b.3b.3c.3d.3c', '3a.3c.3b.3a.6'], {
    faces: { '3a': '0.1.1', '3b': '0.0.1', '3c': '0.0.1', '3d': '0.0.0', 6: '1.1.1.1.1.1' },
    firstVertex: 1,
  }),
  new TilingPattern(['3.3.6.6', '3.3.3.3.6'], { faces: { 3: '0.1.1', 6: '0.0.1.0.0.1' } }),
  new TilingPattern(['3.6.3.6', '3.3.6.6'], {
    faces: { 3: '0.1.1', 6: '0.1.1.0.1.1' },
    firstVertex: 0,
  }),
  new TilingPattern(['3.4.4.6', '3.6.3.6'], {
    faces: { 3: '0.0.1', 4: '0.0.0.0', 6: '0.0.1.0.0.1' },
    edges: { 3: '4.6.6', 4: '3.4.6.4', 6: '3.3.4.3.3.4' },
  }), // ambiguous, need to give edge hints
  new TilingPattern(['3.4a.4b.6', '3.6.3.6'], {
    faces: { 3: '0.0.1', '4a': '0.0.0.0', '4b': '0.0.0.0', 6: '0.0.1.0.0.1' },
  }),
  new TilingPattern(['3a.3b.3a.4a.4a', '3a.3b.4a.3a.4b'], {
    faces: { '3a': '0.1.1', '3b': '0.1.1', '4a': '0.0.1.1', '4b': '1.1.1.1' },
  }),
  new TilingPattern(['3a.3b.4.3a.4', '3a.3b.3b.4.4'], {
    faces: { '3a': '0.0.1', '3b': '0.1.1', 4: '0.0.1.1' },
  }),
  new TilingPattern(['3.3.3.4.4', '4.4.4.4'], { faces: { 3: '0.0.0', 4: '0.0.1.1' } }),
  new TilingPattern(['3.3.3.4a.4a', '4a.4a.4b.4b'], {
    faces: { 3: '0.0.0', '4a': '0.0.1.1', '4b': '1.1.1.1' },
  }),
  new TilingPattern(['3a.3a.3b.3a.3a.3b', '3b.3a.3b.4.4']),
  new TilingPattern(['3a.3b.3a.3c.3c.3c', '3b.3a.3b.4.4']),
]

const uniform3Tilings = [
  new TilingPattern(['3a.4b.4a.6', '3a.6.3b.6', '4a.6.12'], {
    faces: {
      '3a': '0.0.1',
      '3b': '1.1.1',
      '4a': '0.0.2.2',
      '4b': '0.0.0.0',
      6: '0.1.1.0.2.2',
      12: '2.2.2.2.2.2.2.2.2.2.2.2',
    },
  }),
  new TilingPattern(['3a.3b.3a.3b.3a.3b', '3a.3b.4.12', '4.6.12'], {
    faces: {
      '3a': '0.1.1',
      '3b': '0.1.1',
      4: '1.1.2.2',
      6: '2.2.2.2.2.2',
      12: '1.1.2.2.1.1.2.2.1.1.2.2',
    },
    // firstVertex: 2,
  }),
  new TilingPattern(['3a.3b.4.12', '3b.4.6.4', '3a.12.12'], {
    faces: {
      '3a': '0.0.2',
      '3b': '0.0.1',
      4: '0.0.1.1',
      6: '1.1.1.1.1.1',
      12: '0.0.2.2.0.0.2.2.0.0.2.2',
    },
  }),
  new TilingPattern(['3a.4.3b.12', '3b.4.6.4', '3a.12.12'], {
    faces: {
      '3a': '0.0.2',
      '3b': '0.0.1',
      4: '0.0.1.1',
      6: '1.1.1.1.1.1',
      12: '0.0.2.2.0.0.2.2.0.0.2.2',
    },
  }),
  new TilingPattern(['3a.3b.3a.4b.4b', '3b.3a.4a.12', '3a.4a.6.4b'], { firstVertex: 1 }),
  new TilingPattern(['3a.3b.3c.3d.3c.3b', '3b.3c.3b.4.4', '3a.3b.4.12']),
  new TilingPattern(['3a.3b.3b.3a.3b.3b', '3b.3b.4.3c.4', '3a.3b.4.12'], { firstVertex: 2 }),
]

class NGon {
  constructor({ tile, side, angleFraction, angle, center, firstVertex }) {
    // center is assumed to be the origin
    this.tile = tile
    let { n, genus } = NGon.getNGenus(tile)
    this.n = n
    this.genus = genus
    this.side = side
    this.angle = 0

    this.alphaDeg = 360 / this.n // angle between successive vertices, from the perspective of the center
    this.alphaRad = degToRad(this.alphaDeg)

    this.betaDeg = 180 - this.alphaDeg
    this.betaRad = degToRad(this.betaDeg)

    // each vertex angle
    // n  | alpha | beta
    // ---+-------+-----
    // 3  |  120  | 60
    // 4  |  90   | 90
    // 6  |  60   | 120
    // 8  |  45   | 135
    // 12 |  30   | 150

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
      this.center = firstVertex.point.addVect(this.v.rotateRad(angle + this.vertexAngle / 2))
      this.v = this.center.vectTo(firstVertex.point)
    } else {
      this.v = this.v.rotateRad(this.angle) // v points in the direction of the first vertex
    }
  }

  static getNGenus(input) {
    const regex = /^(\d+)(\D?)$/ // match things like '12', '3', '6a', '6b'
    let [_, n, genus] = input.match(regex)
    if (genus == '') {
      genus = 'a'
    }
    return { n: Number(n), genus }
  }

  get vertices() {
    let vertices = []
    for (let i = 0; i < this.n; i++) {
      vertices.push(this.center.addVect(this.v.rotateRad(this.alphaRad * i)))
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
    const colorHue = {
      3: 60, // yellow
      4: 0, // red
      6: 120, // lime
      8: 39, // orange
      12: 240, // blue
    }
    const colorLuma = {
      a: 50,
      b: 20,
      c: 80,
      d: 5,
      e: 95,
    }
    if (this.n in colorHue) {
      let hue = colorHue[this.n]
      return `hsl(${hue} 100% ${colorLuma[this.genus]}%)`
    }
    return 'blue'
  }

  get vertexAngle() {
    // return the angle, in radians, between two consecutive edges
    return degToRad(180 - 360 / this.n)
  }

  get d() {
    return new Polygon(this.vertices).d()
  }
}

class RotatedFace {
  constructor(id, face) {
    this.id = id
    this.face = face
    this.vertices = []
    this.edges = []
    this.potentialGenera = null
    this.finalVertexGenera = null
  }

  isComplete() {
    for (let vertex of this.vertices) {
      if (!vertex.finalPattern) {
        return false
      }
    }
    return true
  }
}

// function shiftPattern(pattern) {
//   return [pattern[pattern.length - 1], ...pattern.slice(0, pattern.length - 1)]
// }

class Vertex {
  constructor(id, point, pattern) {
    this.id = id
    this.point = point
    this.pattern = pattern
    this.patternPotentials = pattern.potentials
    this.faces = []
    this.facesByStartAngle = {}
    this.facesByEndAngle = {}
    this.neighbors = {}
    this.finalPattern = null
    this.error = null
    this.forcedChoice = false // true if a pattern was forced on this vertex
  }

  isComplete() {
    let totalAngle = this.faces.reduce((acc, face) => acc + face[0].face.vertexAngle, 0)
    return closeEnough(radToDeg(totalAngle), 360)
  }

  faceAngles() {
    return this.faces.map((face) => face[1])
  }

  get deficit() {
    // return the deficit, i.e. how many faces are missing from this vertex
    let minPat = Math.min(...this.pattern.patterns.map((pat) => pat.length))
    return minPat - this.faces.length
  }

  get color() {
    if (this.isComplete()) {
      return 'black'
    }
    let deficit = this.deficit
    if (deficit < 3) {
      return { 0: 'teal', 1: 'red', 2: 'orange' }[deficit]
    }
    return 'gray'
  }

  addFace(face, angle) {
    // console.log(
    //   `vertex ${this.id}.addFace ${face.id}: ${face.face.n} with angles`,
    //   Math.round(radToDeg(angle)),
    // )
    this.faces.push([face, angle])

    this.facesByStartAngle[normalizeRadianString(angle)] = face
    this.facesByEndAngle[normalizeRadianString(angle + face.face.betaRad)] = face
    for (let otherFace of [
      this.facesByEndAngle[normalizeRadianString(angle)],
      // this.facesByStartAngle[normalizeRadianString(angle + face.face.betaRad)],
    ]) {
      // let otherFace = this.facesByEndAngle[angle]
      if (otherFace) {
        face.edges.push(otherFace)
        otherFace.edges.push(face)
        // console.log(`faces ${face.id} and ${otherFace.id} are neighbors`)
      }
    }
    this.refinePatterns()
  }

  getPossibleGenera() {
    // return the possible genera of this vertex, so far
    if (this.finalPattern) {
      return [Number(this.finalPattern.genus)]
    }
    let ret = {}
    for (let pat of this.patternPotentials) {
      ret[pat.genus] = pat
    }
    return Object.keys(ret).map((key) => Number(key))
  }

  refinePatterns() {
    if (this.faces.length == 0) {
      throw `Cannot refine vertex with no faces`
    }
    if (this.faces.length == this.validFor) {
      // early exit, nothing to recompute
      return
    }
    if (this.patternPotentials.length < 2) {
      // there is nothing to refine
      // if (!this.finalPattern) {
      //   console.warn(`Vertex ${this.id} exiting early with ${this.finalPattern}`)
      // }
      return
    }
    let firstAngle = normalizeRadians(this.faces[0][1])
    let newPatterns = []
    let faceAngles = {}
    for (let [face, angle] of this.faces) {
      faceAngles[`${face.face.tile}:${normalizeRadianString(angle)}`] = [face, angle]
    }
    let faceAngleSet = new Set(Object.keys(faceAngles))
    for (let pat of this.patternPotentials) {
      let angle = firstAngle
      let patternAngles = {}
      for (let tile of pat.pattern) {
        let key = `${tile}:${normalizeRadianString(angle)}`
        let { n, genus } = NGon.getNGenus(tile)
        patternAngles[key] = tile
        angle = normalizeRadians(angle + degToRad(180 - 360 / n))
      }
      let patternAngleSet = new Set(Object.keys(patternAngles))
      if (faceAngleSet.difference(patternAngleSet).size == 0) {
        newPatterns.push(pat)
      }
    }
    if (newPatterns.length == 0) {
      this.error = true
      console.trace()
      throw `Got no potentials for vertex ${this.id}`
    }
    if (newPatterns.length == 1) {
      this.finalPattern = newPatterns[0]
    }
    this.patternPotentials = newPatterns
    this.validFor = this.faces.length
  }

  computeMissing() {
    if (this.isComplete()) {
      // console.log(`computeMissing for vertex ${this.id} is complete`)
      return []
    }
    this.refinePatterns()
    if (this.patternPotentials.length > 1) {
      // console.log(`computeMissing for vertex ${this.id} is has multiple potentials`)
      return []
    }
    let firstAngle = normalizeRadians(this.faces[0][1])
    let faceAngles = {}
    for (let [face, angle] of this.faces) {
      faceAngles[`${face.face.tile}:${normalizeRadianString(angle)}`] = [face, angle]
    }
    let faceAngleSet = new Set(Object.keys(faceAngles))
    let angle = firstAngle
    let patternAngles = {}
    for (let tile of this.patternPotentials[0].pattern) {
      let { n, genus } = NGon.getNGenus(tile)
      patternAngles[`${tile}:${normalizeRadianString(angle)}`] = [tile, angle]
      angle = normalizeRadians(angle + degToRad(180 - 360 / n))
    }
    let patternAngleSet = new Set(Object.keys(patternAngles))
    // console.log(`computeMissing for vertex ${this.id}`, patternAngleSet, faceAngleSet)
    let missingKeys = Array.from(patternAngleSet.difference(faceAngleSet))
    let missing = missingKeys.map((key) => patternAngles[key])
    return missing
  }
}

// given a list of vertices (exhaustive) and edges/faces (non-exhaustive),
// return an array so that each face touches the corresponding vertex, in order
// set to null for missing edges/faces
function sortEdgesAndFaces(center, vertices, faces) {
  // console.log(vertices, faces)
  let verticesWithIndex = Object.entries(vertices) // tuples of id, edge
  let facesWithAngles = faces.map((face) => [
    normalizeRadians(center.vectTo(face.face.center).angle()),
    face,
  ])
  // facesWithAngles.sort((a, b) => a[0] - b[0])
  // console.log(
  //   'faces',
  //   facesWithAngles.map(([angle, face]) => `id.${face.id} angle: ${normalizeRadianString(angle)}`),
  // )
  // console.log(verticesWithIndex)
  // console.log(
  //   'vertices',
  //   verticesWithIndex.map(
  //     ([idx, vertex]) => `${idx} ${normalizeRadianString(center.vectTo(vertex.point).angle())}`,
  //   ),
  // )
  let mixedList = []
  for (let [rad, face] of facesWithAngles) {
    mixedList.push({
      type: 'face',
      rad,
      face: face,
    })
  }
  for (let [id, vertex] of verticesWithIndex) {
    mixedList.push({
      type: 'vertex',
      rad: normalizeRadians(center.vectTo(vertex.point).angle()),
      vertex,
      id,
    })
  }
  mixedList.sort((a, b) => a.rad - b.rad)
  let faceArray = []
  for (let i = 0; i < vertices.length; i++) {
    faceArray[i] = null
  }
  // console.log('mixedList', mixedList)
  // console.log('pairs', pairs([1, 2, 3]))
  for (let [a, b] of circularPairs(mixedList)) {
    // console.log(`a ${a.type}, b ${b.type}`)
    if (a.type == 'vertex' && b.type == 'face') {
      faceArray[a.id] = b.face
    }
  }
  // console.log('faceArray', faceArray)
  return faceArray
}

class VertexGrid {
  constructor({ bbox, start, size, angle, pattern, iterations }) {
    this.start = start
    this.angle = angle
    this.bbox = bbox
    this.size = size
    this.pattern = pattern
    this.vertices = {}
    this.verticesByCoord = {}
    this.kdtree = new KDTree()
    this.incompleteVertices = [] // vertices that are not yet complete
    this.edges = {}
    this.faces = {}
    this.iterations = iterations
    // this.forcedChoices = 0 // number of times a choice was forced on the grid
  }

  vertexAt(pt) {
    if (pt.type != 'Point') {
      console.trace()
      throw `VertexGrid.vertexAt received unexpected argument ${pt.type}`
    }
    if (pt.string() in this.verticesByCoord) {
      return this.verticesByCoord[pt.string()]
    }
    let vertex = this.kdtree.find(pt)
    if (vertex) {
      return vertex
    }
    // for (let vertex of Object.values(this.vertices)) {
    //   if (vertex.point.manhattanDistance(pt) < THRESHOLD) {
    //     console.log(
    //       `from for loop ${this.pattern.vertices}`,
    //       pt.string(),
    //       vertex.point.string(),
    //       vertex.point.distance(pt),
    //     )
    //     this.kdtree.find(pt, true)
    //     return vertex
    //   }
    // }
    return null
  }

  addVertex(point, pattern) {
    let vertex = new Vertex(Object.values(this.vertices).length, point, this.pattern)
    this.vertices[vertex.id] = vertex
    this.verticesByCoord[point.string()] = vertex
    this.kdtree.add(point, vertex)
    this.incompleteVertices.push(vertex)
    return vertex
  }

  addFace(polygon) {
    let face = new RotatedFace(/** id: **/ Object.values(this.faces).length, polygon)
    this.faces[face.id] = face

    let polyLines = polygon.lines
    for (let [firstLine, secondLine] of circularPairs(polyLines)) {
      let point = secondLine.p // the point that connects first line with second line
      let vertex = this.vertexAt(point)
      if (vertex == null) {
        vertex = this.addVertex(point, this.pattern)
      }
      face.vertices.push(vertex)
      if (vertex.faces.length >= vertex.pattern.length) {
        throw `Vertex ${vertex.id} already has enough faces, can't add any more`
      }
      vertex.addFace(face, normalizeRadians(secondLine.v.angle()))
      // populate the neighbors of this vertex
      for (let point of [firstLine.p, secondLine.p.addVect(secondLine.v)]) {
        let neighbor = this.vertexAt(point)
        if (neighbor == null) {
          neighbor = this.addVertex(point, this.pattern)
        }
        vertex.neighbors[neighbor.id] = neighbor
      }
    }
  }

  updateVertices() {
    for (let vertex of this.incompleteVertices) {
      if (vertex.isComplete()) {
        continue
      }
      if (this.bbox.distance(vertex.point) > MAX_DISTANCE) {
        // point is too far
        continue
      }
      vertex.refinePatterns()
      if (vertex.patternPotentials.length == 1) {
        let updates
        updates = vertex.computeMissing()
        if (updates.length == 0) {
          continue
        }
        for (let [tile, angle] of updates) {
          let face = new NGon({ tile, side: this.size, angle, firstVertex: vertex })
          this.addFace(face)
        }
        return 1 // one vertex was updated, don't continue
      }
    }
    return 0 // no updates
  }

  // filter out any complete vertices from the incomplete vertex list
  recomputeIncompleteVertices() {
    this.incompleteVertices = this.incompleteVertices.filter((vertex) => !vertex.isComplete())
  }

  populateFaceFromEdgehints() {
    for (let face of Object.values(this.faces)) {
      if (face.isComplete()) {
        continue
      }
      if (this.bbox.distance(face.face.center) > MAX_DISTANCE) {
        continue
      }

      // face.edges.sort(
      //   (a, b) =>
      //     normalizeRadians(face.face.center.vectTo(a.face.center).angle()) -
      //     normalizeRadians(face.face.center.vectTo(b.face.center).angle()),
      // )
      // console.log(
      //   `face ${face.id} vertices`,
      //   face.vertices,
      //   face.vertices.map(
      //     (vertex) =>
      //       `${vertex.id}, ${normalizeRadianString(face.face.center.vectTo(vertex.point).angle())}`,
      //   ),
      // )
      // console.log(face.edges)

      let edges = sortEdgesAndFaces(face.face.center, face.vertices, face.edges)
      // console.log(
      //   'edges',
      //   edges.map((edge) => (edge ? edge.face.tile : null)),
      // )
      let possibilities = this.pattern.edgeHints[face.face.tile]
      // console.log('possibilities', possibilities)
      let validPotentials = []
      for (let pot of possibilities) {
        // console.log('pot', pot)
        let valid = true
        for (let [edge, expected] of zip(edges, pot)) {
          // console.log('edge', edge, 'expected', expected)
          if (edge != null && edge.face.tile != expected) {
            // console.log(
            //   `potential ${pot} doesn't work, expected ${expected} but got ${edge.face.tile}`,
            // )
            valid = false
            break
          }
        }
        if (valid) {
          validPotentials.push(pot)
        }
      }
      // if (possibilities.length > validPotentials.length) {
      //   console.log(
      //     `Valid potentials went from ${possibilities.length} to ${validPotentials.length}`,
      //   )
      // }
      if (validPotentials.length > 1) {
        continue
      }
      // console.log('applying potential', validPotentials[0])
      // console.log('zip result', enumerate(zip(face.vertices, validPotentials[0], edges)))
      for (let [id, [vertex, tile, f]] of enumerate(
        zip(face.vertices, validPotentials[0], edges),
      )) {
        if (f == null) {
          let nextVertex = face.vertices[(id + 1) % face.vertices.length]
          // console.log(
          //   `face vertices`,
          //   face.vertices.map((v) => v.id),
          //   id,
          //   (id + 1) % face.vertices.length,
          // )
          let angle = vertex.point.vectTo(nextVertex.point).angle() + degToRad(180) // why do we need to add 180 degs here???
          // let angle = 0
          // console.log(`angle between ${vertex.id} and ${nextVertex.id} is ${angle}`)
          // console.log(`angle`)
          // console.log(
          //   `attempt to add new tile ${tile} to vertex ${nextVertex.id} at angle ${normalizeRadianString(angle)}`,
          // )
          let newFace = new NGon({ tile, side: this.size, angle, firstVertex: nextVertex })
          this.addFace(newFace)
          return 1
        }
        // console.log(`vertex ${vertex.id}, tile ${tile}, face ${f}`)
      }
    }
    return 0
  }

  populateFaceFromHints() {
    for (let face of Object.values(this.faces)) {
      if (face.isComplete()) {
        continue
      }
      if (!face.potentialGenera) {
        face.potentialGenera = this.pattern.getFaceHints(face.face.tile)
      }

      // first, filter out any patterns that don't apply to the current vertex setup
      let isUpdate = false
      if (face.potentialGenera.length > 1) {
        let newPatterns = []
        for (let [i, pat] of enumerate(face.potentialGenera)) {
          let validPattern = true
          for (let [vertex, gen] of zip(face.vertices, pat)) {
            let potentialGenera = vertex.getPossibleGenera()
            if (!potentialGenera.includes(gen)) {
              validPattern = false
              isUpdate = true
              break
            }
          }
          if (validPattern) {
            newPatterns.push(pat)
          }
        }
        if (newPatterns.length == 0) {
          throw `Face ${face.id} got unexpected zero new patterns`
        }
        face.potentialGenera = newPatterns
      }
      for (let [vid, vertex] of enumerate(face.vertices)) {
        if (this.bbox.distance(vertex.point) > MAX_DISTANCE) {
          // point is too far
          break
        }
        let potentials = face.potentialGenera.map((g) => g[vid])
        let newList = []
        for (let pat of vertex.patternPotentials) {
          let isValid = false
          let genus = pat.genus
          isValid = potentials.includes(genus)
          if (isValid) {
            newList.push(pat)
          }
        }
        if (newList.length != vertex.patternPotentials.length) {
          if (newList.length == 0) {
            throw `populateFaceFromHints produced 0 patterns for vertex ${vertex.id}`
          }
          vertex.patternPotentials = newList
          if (vertex.patternPotentials.length == 1) {
            vertex.finalPattern = vertex.patternPotentials[0]
            let updates = vertex.computeMissing()
            if (updates.length == 0) {
              throw `Vertex ${vertex.id}: No updates`
            }
            for (let [tile, angle] of updates) {
              let face = new NGon({ tile, side: this.size, angle, firstVertex: vertex })
              this.addFace(face)
            }
            return 1 // success
          } else {
            return 0
          }
        }
      }
    }
    return 0
  }

  generate() {
    let initialVertex = this.addVertex(this.start, this.pattern)
    let angle = this.angle
    for (let tile of this.pattern.patterns[this.pattern.firstVertex].pattern) {
      let face = new NGon({ tile, side: this.size, angle, firstVertex: initialVertex })
      let oldAngle = face.vertexAngle
      angle += face.vertexAngle
      this.addFace(face)
    }
    let isUpdated = true
    let nAdded = 0
    while (isUpdated) {
      isUpdated = false
      if (this.iterations > -1 && nAdded >= this.iterations) {
        break
      }
      if (this.error) {
        break
      }

      // start by updating vertices that are forced to have only one choice
      var vertexUpdates
      try {
        vertexUpdates = this.updateVertices()
      } catch (err) {
        console.error(err)
        this.error = true
        return this
      }
      if (vertexUpdates > 0) {
        isUpdated = true
        nAdded += vertexUpdates
        this.recomputeIncompleteVertices()
      }
      // next, see if any faces can have their vertices completed
      if (this.pattern.faceHints) {
        let updates
        try {
          updates = this.populateFaceFromHints()
        } catch (err) {
          console.error(err)
          this.error = true
          return this
        }
        if (updates > 0) {
          isUpdated = true
          nAdded += updates
        }
      }
      if (this.pattern.edgeHints) {
        let updates
        try {
          updates = this.populateFaceFromEdgehints()
        } catch (err) {
          console.error(err)
          this.error = true
          return this
        }
        if (updates > 0) {
          isUpdated = true
          nAdded += updates
        }
      }
    }
    return this // allow chaining
  }

  getFaces() {
    let faces = Object.values(this.faces)
    // for (let face of faces) {
    //   console.log(
    //     `face ${face.id} with n=${face.face.n} has neighbors`,
    //     face.edges.map((edge) => edge.id),
    //   )
    // }
    return faces
  }

  getVertices() {
    let vertices = Object.values(this.vertices)
    return vertices
  }

  getVertexCountByGenus() {
    let summary = {}
    for (let vertex of vertices) {
      if (vertex.isComplete()) {
        if (!([vertex.finalPattern.genus] in summary)) {
          summary[vertex.finalPattern.genus] = 0
        }
        summary[vertex.finalPattern.genus] += 1
      }
    }
    return summary
  }
}

const gridTiling = {
  template: `
    <g v-if="loading">
      <text x=20 y=20>LOADING...</text>
    </g>
    <g v-if="grid" class="grid squares">
      <g v-if="showFaces" v-for="face in grid.getFaces()" class="face">
        <path
          class="polygon"
          :data-face="face.id"
          :d="face.face.d"
          :style="{fill: showFaceColors ? face.face.color : 'white', stroke: 'black', 'fill-opacity':0.8}"
        />
        <text v-if="debugFaceNumber" text-anchor="middle" v-bind="face.face.center.xyProps()" class="debug">
          {{face.id}}
        </text>
      </g>
      <g v-for="vertex in grid.getVertices()">
        <circle
          v-if="showVertices"
          class="stroke medium"
          v-bind="vertex.point.cxcyProps()"
          :style="{stroke: (debugVertexGenus && vertex.finalPattern )? ['green', 'blue', 'red'][vertex.finalPattern.genus] : vertex.color}"
          r="2"
        />
        <circle
          v-if="showForcedVertices && vertex.forcedChoice"
          class="stroke medium"
          v-bind="vertex.point.cxcyProps()"
          :style="{stroke: 'red'}"
          r="4"
        />
        <text
          v-if="debugVertexNumber"
          text-anchor="middle"
          v-bind="vertex.point.d(-10,8).xyProps()"
          :style="{stroke: 'hsl(0,0%,40%)'}"
          class="debug"
        >
          {{vertex.id}}
        </text>
      </g>
      <g v-if="grid.error" class="debug">
        <path :style="{fill:'white'}" d="M 0 0 L 200 0 L 200 40 L 0 40 L 0 0" />
        <text v-if="grid.error" x=0 y=20 :style="{'fill':'red'}">Errors!</text>  
      </g>
      <path v-if="debugShowBbox" class="stroke" :d="bbox.d()" />
    </g>
    `,
  data() {
    return {
      loading: false,
    }
  },
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
    debugVertexNumber: Boolean,
    debugFaceNumber: Boolean,
    debugVertexGenus: Boolean,
    debugShowBbox: Boolean,
    showVertices: Boolean,
    showForcedChoices: Boolean,
    showForcedVertices: Boolean,
    showFaces: Boolean,
    showFaceColors: Boolean,
    showPattern: Boolean,
  },
  computed: {
    grid(previous) {
      let result = new VertexGrid({
        bbox: this.bbox,
        start: this.start,
        size: this.size,
        angle: this.angle,
        pattern: this.pattern,
        iterations: this.iterations,
      }).generate()
      return result
    },
    showDebugPanel() {
      return this.grid.error || this.debugShowBbox || this.showForcedChoices
    },
  },
}

export {
  VertexGrid,
  NGon,
  TilingPattern,
  regularTilings,
  semiregularTilings,
  uniform2Tilings,
  uniform3Tilings,
  gridTiling,
}
