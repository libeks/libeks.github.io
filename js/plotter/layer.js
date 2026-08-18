import { Point2DOrigin } from '/js/geometry.js'
import { pairs, enumerate, crossProduct } from '/js/utils.js'
import { pens } from '/js/plotter/pens.js'
import { BBox } from '/js/bbox.js'

function metersToSeconds(m) {
  return 22.6 * m
}

// given a distance in image space (10000 units = 9 in), return the length in meters
function imageSpaceToMeters(l) {
  return l / 44092
}

class Layer {
  constructor(name) {
    this.name = name
    this.id = 0
    this.penID = 0 // the index of the pen, color, thickness that this layer will use, set by .withPenID()
    this.staticPen = false // whether the pen of this layer can be changed. can be modified with .withStaticPen()
    this.curves = []
    this.fillCurves = [] // the outlines of the fill curves for this layer
    this.filledCurves = {}
    this.drawGuides = false // can be changed with .withGuides()
    this.spacing = 20
    this.direction = 13
    // this.color = 'black' // can be changed with .withColor(color)
    // this.pen = pens.Micron005 // can be changed with .withPen(pen)
    this.canOptimize = true // whether curves should be rearranged to minimine uptime, can be disabled with .withoutOptimize()

    // child/parent relationships, used to render time table, set with .attachChild(child)
    this.child = null
    this.parent = null

    this.hidden = false

    this.type = 'Layer'
  }

  getAllCurves(spacing, withFill) {
    console.log('getAllCurves', this, spacing, this.hasFillCurves(), this.filledCurves, withFill)
    if (withFill && this.hasFillCurves()) {
      if (!(spacing in this.filledCurves)) {
        console.log('filling with spacing', spacing)
        this.filledCurves[spacing] = this.fill(spacing, this.direction)
      }
      console.log('returning filled curves', this.filledCurves[spacing])
      return [...this.curves, ...this.filledCurves[spacing]]
    }
    if (!this.hasFillCurves()) {
      return this.curves
    }
    return this.fillCurves
  }

  withGuides() {
    this.drawGuides = true
    return this // allow chaining
  }

  withCurves(curves) {
    // check that each curve can be rendered, i.e. it has a '.d()' method
    for (let curve of curves) {
      if (!('d' in curve)) {
        console.error('Layer.withCurves passed object without a .d method', curve)
        throw `Curve in layer cannot be rendered`
      }
    }
    this.curves.push(...curves)
    return this // allow chaining
  }

  withFillCurves(curves) {
    for (let curve of curves) {
      if (curve.type != 'ClosedCurveWithMinus') {
        throw `withFill got unexpected curve ${curve.type}`
      }
    }
    this.fillCurves.push(...curves)
    return this // allow chaining
  }

  // the id of the pen that this layer will use
  withPenID(id) {
    this.penID = id
    return this // allow chaining
  }

  withStaticPen() {
    this.staticPen = true
    return this
  }

  withColor(color) {
    this.color = color
    return this // allow chaining
  }

  withoutOptimize() {
    this.canOptimize = false
    return this
  }

  withPen(params) {
    let { pen, color } = params
    if (pen.type != 'Pen') {
      throw `Layer.withPen got unexpected argument ${pen.type}`
    }
    this.pen = pen
    this.color = color
    return this // allow chaining
  }

  hasFillCurves() {
    return this.fillCurves.length > 0
  }

  fill(spacing, direction) {
    let fillCurves = []
    for (let curve of this.fillCurves) {
      let fill = curve.fill(spacing, direction)
      if (curve.id) {
        enumerate(fill).forEach(([id, c]) => (c.id = `${curve.id}.${id}`))
      }
      // layer.curves.push(...fill)
      fillCurves.push(...fill)
    }
    return fillCurves
  }

  // rearrange the layer to minimize pen uptime, only affect non-fill curves, filled curves should be drawn in the given order to
  // minimize felt-tip layering effects
  optimize() {
    if (!this.canOptimize) {
      return this
    }
    if (this.curves.length == 0) {
      return this
    }
    console.info(`optimizing ${this.curves.length} curves`)
    let allCurves = Array.from(enumerate(this.curves).map(([i, curve]) => ({ curve, i })))
    let curves = [allCurves[0]]
    let toProcess = allCurves.slice(1)

    while (toProcess.length > 0) {
      let minDistSq = Number.MAX_VALUE
      let bbox = new BBox(0, 0, 13333, 10000) // start with the bbox that contains everything
      let candidateIdx
      let targetPoint = curves[curves.length - 1].curve.endpoint()
      let lastI = curves[curves.length - 1].i
      for (let i = 0; i < toProcess.length; i++) {
        let candidate = toProcess[i]
        if (lastI == candidate.i) {
          continue // don't add duplicates back in
        }
        if (!bbox.inside(candidate.curve.startpoint())) {
          continue // the point is too far
        }
        let distanceSq = curves[curves.length - 1].curve
          .endpoint()
          .distanceSquared(candidate.curve.startpoint())
        if (distanceSq < minDistSq) {
          candidateIdx = i
          minDistSq = distanceSq
          let distance = Math.sqrt(distanceSq)
          bbox = new BBox(
            targetPoint.x - distance,
            targetPoint.y - distance,
            targetPoint.x + distance,
            targetPoint.y + distance,
          )
        }
      }
      let candidate = toProcess[candidateIdx]
      toProcess.splice(candidateIdx, 1)
      curves.push(candidate)
    }
    this.curves = curves.map(({ curve }) => curve)
    console.info(`done optimizing ${this.curves.length} curves`)
    return this // allow chaining
  }

  attachChild(layer) {
    if (layer.type != 'Layer') {
      throw `Layer.attachLayer called with unexpected argument ${layer}`
    }
    this.child = layer
    layer.parent = this
  }

  statistics(spacing, showFill) {
    // TODO: take curvature into account when computing down distance, the pen moves slower on curves
    if (!showFill && this.hasFillCurves()) {
      // don't compute statistics if fill is off, since there might be ClosedCurveWithMinus in the input, which doesn't have a well
      // defined .startpoint() (remember, the minuses are distinct curves)
      return {}
    }
    let downLength = 0
    let curves = this.getAllCurves(spacing, showFill)
    for (let curve of curves) {
      downLength += curve.length()
    }
    let upLength = 0
    let upDownCount = 0
    console.log('curves', curves)
    for (let [a, b] of pairs(curves)) {
      let distance = a.endpoint().vectTo(b.startpoint()).len()
      if (distance > 0) {
        upDownCount += 1
      }
      upLength += distance
    }
    if (curves.length > 0) {
      // add distance from origin to startpoint, and from last line back to origin
      upLength +=
        curves[0].startpoint().vectTo(Point2DOrigin).len() +
        curves[curves.length - 1].endpoint().vectTo(Point2DOrigin).len()
    }
    let totalDistance = downLength + upLength
    let meters = imageSpaceToMeters(totalDistance)
    let seconds = metersToSeconds(meters) + upDownCount * 0.5 // each up-down action takes some time as well
    let ret = {
      downLength,
      upLength,
      total: totalDistance,
      time: seconds,
      meters,
      upDownCount, // number of times the pen has to lift and descend
      nCurves: this.curves.length, // number of curves, some may be continuous
    }
    console.info(`layer ${this.name} statistics`, ret)
    return ret
  }
}

export { Layer }
