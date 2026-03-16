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

const THRESHOLD = 0.01
const MAX_DISTANCE = 0

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

const uniform2Tilings = [
  ['3.3.3.3.3.3', '3.3.4.3.4'], // broken
  ['3.4.6.4', '3.3.4.3.4'], // broken
  ['3.4.6.4', '3.3.3.4.4'],
  ['3.4.6.4', '3.4.4.6'], // broken
  ['4.6.12', '3.4.6.4'],
  ['3.3.3.3.3.3', '3.3.4.12'],
  ['3.12.12', '3.4.3.12'], // broken
  ['3.3.3.3.3.3', '3.3.6.6'],
  ['3.3.6.6', '3.3.3.3.6'], // broken
  ['3.6.3.6', '3.3.6.6'],
]

const uniform3Tilings = [
  ['3.4.4.6', '3.6.3.6', '4.6.12'], // broken
  ['3.3.3.3.3.3', '3.3.4.12', '4.6.12'],
  ['3.3.4.12', '3.4.6.4', '3.12.12'],
  ['3.4.3.12', '3.4.6.4', '3.12.12'], // broken
  ['3.3.3.4.4', '3.3.4.12', '3.4.6.4'], // broken
  ['3.3.3.3.3.3', '3.3.3.4.4', '3.3.4.12'], // broken
  ['3.3.3.3.3.3', '3.3.4.3.4', '3.3.4.12'],
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
    this.face = face
    this.vertices = []
    this.edges = []
  }
}

class TilingPattern {
  constructor(...patterns) {
    // input is a list of strings, each string consists of a sequence of polygon numbers that add up to 360 degrees
    this.patterns = Object.entries(patterns).map(([id, pattern]) => ({
      pattern: pattern.split('.'),
      genus: id,
    }))
    this.potentials = getPatternPotentials(...this.patterns)
  }
}

function displayKTiling(tiling) {
  return `[${tiling.join('; ')}]`
}

function shiftPattern(pattern) {
  // console.log(pattern)
  return [pattern[pattern.length - 1], ...pattern.slice(0, pattern.length - 1)]
}

function getPatternPotentials(...patterns) {
  // console.log('getPatternPotentials', patterns)
  let potentials = {}
  for (let pt of patterns) {
    // console.log('pattern', pt)
    let reversePattern = [...pt.pattern].reverse()
    let pattern = pt.pattern
    for (let i = 0; i < pt.pattern.length; i++) {
      // console.log('reverse', reversePattern)
      pattern = shiftPattern(pattern)
      reversePattern = shiftPattern(reversePattern)
      potentials[pattern.join('.')] = {
        pattern: pattern,
        genus: pt.genus,
        shift: i,
        reverse: false,
      }
      potentials[reversePattern.join('.')] = {
        pattern: reversePattern,
        genus: pt.genus,
        shift: i,
        reverse: true,
      }
    }
  }
  // return Array.from(potentials).map((key) => key.split('.'))
  return Object.values(potentials)
}

class Vertex {
  constructor(id, point, pattern) {
    this.id = id
    this.point = point
    this.pattern = pattern
    this.patternPotentials = pattern.potentials
    // console.log(`vertex ${id} patternPotentials`, this.patternPotentials)
    this.faces = []
    this.neighbors = {}
    this.finalPattern = null
    this.error = null
    this.forcedChoice = false // true if a pattern was forced on this vertex
  }

  isComplete() {
    let totalAngle = this.faces.reduce((acc, face) => acc + face[0].face.vertexAngle, 0)
    // console.log('isComplete', radToDeg(totalAngle))
    return closeEnough(radToDeg(totalAngle), 360)
  }

  faceAngles() {
    return this.faces.map((face) => face[2])
  }

  get deficit() {
    // return the deficit, i.e. how many faces are missing from this vertex
    let minPat = Math.min(...this.pattern.patterns.map((pat) => pat.length))
    return minPat - this.faces.length
  }

  get color() {
    // console.log(this.id, this.isComplete())
    if (this.isComplete()) {
      return 'black'
    }
    // console.log(this.pattern.patterns.map((pat) => pat.length))
    // let minPat = Math.min(...this.pattern.patterns.map((pat) => pat.length))
    let deficit = this.deficit
    // console.log(this.id, minPat, deficit)
    if (deficit < 3) {
      return { 0: 'teal', 1: 'red', 2: 'orange' }[deficit]
    }
    return 'gray'
  }

  addFace(face, startAngle, endAngle) {
    this.faces.push([face, startAngle, endAngle])
    this.refinePatterns()
  }

  refinePatterns() {
    if (this.faces.length == 0) {
      throw `Cannot refine vertex with no faces`
    }
    if (this.patternPotentials.length < 2) {
      // there is nothing to refine
      // if (!this.finalPattern) {
      //   console.warn(`Vertex ${this.id} exiting early with ${this.finalPattern}`)
      // }
      return
    }
    let firstAngle = normalizeRadians(this.faces[0][2])
    let newPatterns = []
    let faceAngles = {}
    for (let [face, _, angle] of this.faces) {
      faceAngles[`${face.face.n}:${normalizeRadianString(angle)}`] = [face, angle]
    }
    // console.log(`vertex ${this.id} faceAngles`, faceAngles)
    let faceAngleSet = new Set(Object.keys(faceAngles))
    // console.log(`vertex ${this.id} patternPotentials`, this.patternPotentials)
    for (let pat of this.patternPotentials) {
      let angle = firstAngle
      let patternAngles = {}
      for (let n of pat.pattern) {
        let key = `${n}:${normalizeRadianString(angle)}`
        patternAngles[`${n}:${normalizeRadianString(angle)}`] = n
        angle = normalizeRadians(angle + degToRad(180 - 360 / n))
      }
      let patternAngleSet = new Set(Object.keys(patternAngles))
      if (faceAngleSet.difference(patternAngleSet).size == 0) {
        // console.log(`setting vertex ${this.id} patterns to ${pat}`)
        newPatterns.push(pat)
      }
    }
    if (newPatterns.length == 0) {
      this.error = true
      console.trace()
      // console.error(`Got no potentials for vertex ${this.id}`)
      throw `Got no potentials for vertex ${this.id}`
      return
    }
    // console.log(
    //   `after refining, vertex ${this.id} got new patterns ${newPatterns.map((pat) => pat.pattern.join(',')).join(';')}`,
    // )
    if (newPatterns.length == 1) {
      this.finalPattern = newPatterns[0]
    }
    this.patternPotentials = newPatterns
  }

  computeMissing() {
    if (this.isComplete()) {
      return []
    }
    this.refinePatterns()
    // console.log(`vertex ${this.id} has neighbors ${Object.keys(this.neighbors)}`)
    if (this.patternPotentials.length > 1) {
      return []
    }
    let firstAngle = normalizeRadians(this.faces[0][2])
    let faceAngles = {}
    for (let [face, _, angle] of this.faces) {
      faceAngles[`${face.face.n}:${normalizeRadianString(angle)}`] = [face, angle]
    }
    let faceAngleSet = new Set(Object.keys(faceAngles))
    let angle = firstAngle
    let patternAngles = {}
    for (let n of this.patternPotentials[0].pattern) {
      patternAngles[`${n}:${normalizeRadianString(angle)}`] = [n, angle]
      angle = normalizeRadians(angle + degToRad(180 - 360 / n))
    }
    let patternAngleSet = new Set(Object.keys(patternAngles))
    let missingKeys = Array.from(patternAngleSet.difference(faceAngleSet))
    let missing = missingKeys.map((key) => patternAngles[key])
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
  constructor({ bbox, start, size, angle, pattern, iterations }) {
    this.start = start
    this.angle = angle
    this.bbox = bbox
    this.size = size
    this.pattern = pattern
    this.vertices = {}
    this.edges = {}
    this.faces = {}
    this.iterations = iterations
    this.forcedChoices = 0 // number of times a choice was forced on the grid
  }

  vertexAt(pt) {
    if (pt.type != 'Point') {
      console.trace()
      throw `VertexGrid.vertexAt received unexpected argument ${pt.type}`
    }
    for (let vertex of Object.values(this.vertices)) {
      if (vertex.point.distance(pt) < THRESHOLD) {
        return vertex
      }
    }
    return null
  }

  addFace(polygon) {
    let face = new RotatedFace(/** id: **/ Object.values(this.faces).length, polygon)
    this.faces[face.id] = face

    let polyLines = polygon.lines
    for (let i = 0; i < polyLines.length; i++) {
      let firstLine = polyLines[i]
      let secondLine = polyLines[(i + 1) % polyLines.length]
      let point = secondLine.p
      let vertex = this.vertexAt(point)
      if (vertex == null) {
        vertex = new Vertex(Object.values(this.vertices).length, point, this.pattern)
        this.vertices[vertex.id] = vertex
      }
      face.vertices.push(vertex) // todo, is this sufficient?
      if (vertex.faces.length >= vertex.pattern.length) {
        throw `Vertex ${vertex.id} already has enough faces, can't add any more`
      }
      vertex.addFace(
        face,
        normalizeRadians(-firstLine.v.angle()),
        normalizeRadians(secondLine.v.angle()),
      )
      for (let point of [firstLine.p, secondLine.p.addVect(secondLine.v)]) {
        let neighbor = this.vertexAt(point)
        if (neighbor == null) {
          neighbor = new Vertex(Object.values(this.vertices).length, point, this.pattern)
        }
        vertex.neighbors[neighbor.id] = neighbor
      }
    }
  }

  generate() {
    this.vertices[0] = new Vertex(0, this.start, this.pattern)
    let angle = this.angle
    for (let n of this.pattern.patterns[0].pattern.map((val) => Number(val))) {
      let face = new NGon({ n, side: this.size, angle, firstVertex: this.vertices[0] })
      let oldAngle = face.vertexAngle
      angle += face.vertexAngle
      this.addFace(face, oldAngle, angle)
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
      for (let vertex of Object.values(this.vertices)) {
        if (vertex.isComplete()) {
          continue
        }
        if (this.bbox.distance(vertex.point) > MAX_DISTANCE) {
          // point is too far
          continue
        }
        try {
          vertex.refinePatterns()
        } catch (err) {
          this.error = true
          return
        }
        if (vertex.patternPotentials.length == 1) {
          let updates
          try {
            updates = vertex.computeMissing()
          } catch (err) {
            console.error(err)
            this.error = true
          }
          if (updates.length == 0) {
            continue
          }
          for (let [n, angle] of updates) {
            let face = new NGon({ n, side: this.size, angle, firstVertex: vertex })
            try {
              this.addFace(face, angle, 0)
            } catch (err) {
              this.error = true
              console.error(err)
              return this
            }
          }
          isUpdated = true
          nAdded += 1
          break
        }
      }
      if (!isUpdated) {
        // switch to making decisive choices
        let verticesByDeficit = {}
        for (let vertex of Object.values(this.vertices)) {
          if (vertex.isComplete()) {
            continue
          }
          if (this.bbox.distance(vertex.point) > MAX_DISTANCE) {
            // point is too far
            continue
          }
          let deficit = vertex.deficit
          if (!(deficit in verticesByDeficit)) {
            verticesByDeficit[deficit] = []
          }
          verticesByDeficit[deficit].push(vertex)
        }
        let minDeficit = Math.min(...Object.keys(verticesByDeficit).map((key) => Number(key)))
        if (!verticesByDeficit[minDeficit]) {
          continue
        }
        let vertex = verticesByDeficit[minDeficit][0]
        // compute neighbor statistics
        let byGenus = Object.fromEntries(this.pattern.patterns.map((pat) => [pat.genus, 0]))
        for (let neighbor of Object.values(vertex.neighbors)) {
          if (neighbor.finalPattern) {
            if (!(neighbor.finalPattern.genus in byGenus)) {
              byGenus[neighbor.finalPattern.genus] = 0
            }
            byGenus[neighbor.finalPattern.genus] += 1
          }
        }
        // console.log(
        //   `vertex ${vertex.id} by genus has`,
        //   byGenus,
        //   vertex.patternPotentials.map((pot) => pot.genus),
        // )

        let potentialsByGenus = {}
        for (let pot of vertex.patternPotentials) {
          if (!(pot.genus in potentialsByGenus)) {
            potentialsByGenus[pot.genus] = []
          }
          potentialsByGenus[pot.genus].push(pot)
        }
        // let potentials = vertex.patternPotentials
        let potentials = []
        let genusOrder = Object.entries(byGenus)
        genusOrder.sort((a, b) => a[1] - b[1])
        // console.log(`vertex ${vertex.id} has genus order`, genusOrder)
        for (let genus of genusOrder.map(([genus, count]) => genus)) {
          // console.log('genus', genus)
          if (genus in potentialsByGenus) {
            // console.log(`vertex ${vertex.id} has genus ${genus} among`, potentialsByGenus)
            potentials.push(...Object.values(potentialsByGenus[genus]))
          }
        }
        // console.log(`vertex ${vertex.id} has potentials`, potentials, genusOrder)
        // console.log(`Forced choice on ${vertex.id} with options`, potentials)
        this.forcedChoices += 1
        vertex.forcedChoice = true
        vertex.patternPotentials = [potentials[0]]
        vertex.finalPattern = potentials[0]
        let updates
        try {
          updates = vertex.computeMissing()
        } catch (err) {
          console.error(err)
          this.error = true
        }
        if (updates.length == 0) {
          continue
        }
        for (let [n, angle] of updates) {
          let face = new NGon({ n, side: this.size, angle, firstVertex: vertex })
          try {
            this.addFace(face, angle, 0)
          } catch (err) {
            console.error(err)
            this.error = true
            return this
          }
        }
        isUpdated = true
        nAdded += 1
      }
    }
    return this // allow chaining
  }

  getFaces() {
    let faces = Object.values(this.faces)
    return faces
  }

  getVertices() {
    let vertices = Object.values(this.vertices)
    // for (let vertex of vertices) {
    //   console.log(
    //     `vertex ${vertex.id} has ${vertex.patternPotentials.length} genus ${vertex.patternPotentials[0].genus}, ${vertex.finalPattern ? vertex.finalPattern.genus : null}`,
    //   )
    // }
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
      // console.log(
      //   `vertex ${vertex.id} has ${vertex.patternPotentials.length} genus ${vertex.patternPotentials[0].genus}, ${vertex.finalPattern ? vertex.finalPattern.genus : null}`,
      // )
    }
    return summary
  }
}

const gridTiling = {
  template: `
		<g class="grid squares">
      <g v-if="showFaces" v-for="face in grid.getFaces()" class="face">
        <path
          class="polygon"
          :data-face="face.id"
          :d="face.face.d"
          :style="{fill: face.face.color, stroke: 'black', 'fill-opacity':0.8}"
        />
        <text v-if="debugFaceNumber" text-anchor="middle" v-bind="face.face.center.xyProps()">
          {{face.id}}
        </text>
      </g>
      <g v-for="vertex in grid.getVertices()">
        <circle
  				v-if="showVertices"
          class="stroke medium"
          v-bind="vertex.point.cxcyProps()"
          :style="{stroke: (debugVertexGenus && vertex.finalPattern )? {'0': 'green', '1':'blue', '2':'red'}[vertex.finalPattern.genus] : vertex.color}"
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
          v-bind="vertex.point.d(-15,5).xyProps()"
          :style="{stroke: 'hsl(0,0%,40%)'}"
        >
          {{vertex.id}}
        </text>
      </g>
  		<g v-if="showDebugPanel" class="debug">
  			<path :style="{fill:'white'}" d="M 0 0 L 200 0 L 200 60 L 0 60 L 0 0" />
  			<text v-if="showForcedChoices" x=0 y=20>Choices forced: {{grid.forcedChoices}}</text>
  			<text v-if="grid.error" x=0 y=40 :style="{'fill':'red'}">Errors!</text>
  			<path v-if="debugShowBbox" class="stroke" :d="bbox.d()" />
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
    debugVertexNumber: Boolean,
    debugFaceNumber: Boolean,
    debugVertexGenus: Boolean,
    debugShowBbox: Boolean,
    showVertices: Boolean,
    showForcedChoices: Boolean,
    showForcedVertices: Boolean,
    showFaces: Boolean,
  },
  computed: {
    grid(previous) {
      console.log('recomputing computed', previous)
      return new VertexGrid({
        bbox: this.bbox,
        start: this.start,
        size: this.size,
        angle: this.angle,
        pattern: this.tilingPattern,
        iterations: this.iterations,
      }).generate()
    },
    tilingPattern() {
      console.log('recomputing tilingPattern')
      return new TilingPattern(...this.pattern)
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
  displayKTiling,
}
