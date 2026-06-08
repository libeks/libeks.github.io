import { Point2DOrigin } from '/js/geometry.js'
import { pairs } from '/js/utils.js'
import { pens } from '/js/plotter/pens.js'

// func metersToTime(m float64) time.Duration {
//   return time.Duration(22.6 * float64(time.Second) * m)
// }

function metersToSeconds(m) {
  return 22.6 * m
}

// given a distance in image space (10000 units = 8 in), return the length in meters
function imageSpaceToMeters(l) {
  return l / 44092
}

// func imageSpaceToMeters(l float64) float64 {
//   const unitPerMeter = 44092.0
//   return l / unitPerMeter
// }

class Layer {
  constructor(name) {
    this.name = name
    this.curves = []
    this.drawGuides = false
    this.color = 'black'
    this.pen = pens.Micron005
  }

  withGuides() {
    this.drawGuides = true
    return this // allow chaining
  }

  withCurves(curves) {
    // check that each curve can be rendered, i.e. it has a '.d()' method
    // console.log('withCurves', curves.length)
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

  withPen(pen) {
    if (pen.type != 'Pen') {
      throw `Layer.withPen got unexpected argument ${pen.type}`
    }
    this.pen = pen
    return this // allow chaining
  }

  // rearrange the layer to minimize pen uptime
  optimize() {
    return this
  }

  statistics() {
    // TODO: take curvature into account when computing down distance, the pen moves slower on curves
    // console.log('this.curves', this.name, this.curves)
    // let downLength = this.curves.reduce((acc, current) => acc + current.length(), 0)
    let downLength = 0
    for (let curve of this.curves) {
      // console.log('curve lenght', curve, curve.length())
      downLength += curve.length()
    }
    let upLength = 0
    for (let [a, b] of pairs(this.curves)) {
      // console.log('a,b', a, b)
      let distance = a.endpoint().vectTo(b.startpoint()).len()
      upLength += distance
    }
    // console.log('startpoint', this.curves[0].startpoint().vectTo(Point2DOrigin))
    upLength +=
      this.curves[0].startpoint().vectTo(Point2DOrigin).len() +
      this.curves[this.curves.length - 1].endpoint().vectTo(Point2DOrigin).len()
    let totalDistance = downLength + upLength
    let meters = imageSpaceToMeters(totalDistance)
    let seconds = metersToSeconds(meters)
    // console.log('totalDistance', downLength, upLength, totalDistance, meters, seconds)
    return {
      downLength,
      upLength,
      total: totalDistance,
      time: seconds,
      nCurves: this.curves.length,
    }
  }

  // the transform property of the <g> element, to position the pen correctly relative to the comb
  transform() {
    return `translate(${this.pen.xOffset} ${this.pen.yOffset})`
  }
}

export { Layer }
