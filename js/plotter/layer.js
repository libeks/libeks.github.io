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
    this.curves = []
    this.drawGuides = false // can be changed with .withGuides()
    this.color = 'black' // can be changed with .withColor(color)
    this.pen = pens.Micron005 // can be changed with .withPen(pen)
    this.canOptimize = true // whether curves should be rearranged to minimine uptime, can be disabled with .withoutOptimize()

    // child/parent relationships, used to render time table, set with .attachChild(child)
    this.child = null
    this.parent = null

    this.type = 'Layer'
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

  withColor(color) {
    this.color = color
    return this // allow chaining
  }

  withoutOptimize() {
    this.canOptimize = false
    return this
  }

  withPen(pen) {
    if (pen.type != 'Pen') {
      throw `Layer.withPen got unexpected argument ${pen.type}`
    }
    this.pen = pen
    return this // allow chaining
  }

  // rearrange the layer to minimize pen uptime
  optimize() {
    if (!this.canOptimize) {
      return this
    }
    if (this.curves.length == 0) {
      return this
    }
    console.log(`optimizing ${this.curves.length} curves`)
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
      // toProcess = [...toProcess.slice(0, candidateIdx - 1), ...toProcess.slice(candidateIdx + 1)]
      curves.push(candidate)
    }
    this.curves = curves.map(({ curve }) => curve)
    console.log(`done optimizing ${this.curves.length} curves`)
    return this // allow chaining
  }

  attachChild(layer) {
    if (layer.type != 'Layer') {
      throw `Layer.attachLayer called with unexpected argument ${layer}`
    }
    this.child = layer
    layer.parent = this
  }

  statistics() {
    // TODO: take curvature into account when computing down distance, the pen moves slower on curves
    let downLength = 0
    // console.log('this.curves', this.curves)
    for (let curve of this.curves) {
      // console.log('curve.length', curve)
      // console.log('curve.length2', curve.length())
      downLength += curve.length()
    }
    let upLength = 0
    let upDownCount = 0
    for (let [a, b] of pairs(this.curves)) {
      let distance = a.endpoint().vectTo(b.startpoint()).len()
      if (distance > 0) {
        upDownCount += 1
      }
      upLength += distance
    }
    if (this.curves.length > 0) {
      upLength +=
        this.curves[0].startpoint().vectTo(Point2DOrigin).len() +
        this.curves[this.curves.length - 1].endpoint().vectTo(Point2DOrigin).len()
    }
    let totalDistance = downLength + upLength
    let meters = imageSpaceToMeters(totalDistance)
    let seconds = metersToSeconds(meters) + upDownCount * 0.5 // each up-down action takes some time as well
    return {
      downLength,
      upLength,
      total: totalDistance,
      time: seconds,
      upDownCount, // number of times the pen has to lift and descend
      nCurves: this.curves.length, // number of curves, some may be continuous
    }
  }

  // the transform property of the <g> element, to position the pen correctly relative to the comb
  transform() {
    return `translate(${-this.pen.xOffset} ${-this.pen.yOffset})`
  }
}

export { Layer }
