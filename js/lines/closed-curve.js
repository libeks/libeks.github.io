import { pairs, reduceIntervals, enumerate, crossProduct } from '/js/utils.js'
import { Point, Vector, Line, Point2DOrigin } from '/js/geometry.js'
import { average, quadratic, cubic } from '/js/math.js'
import { BBox, bboxFromPointCloud } from '/js/bbox.js'
import { StraightStroke } from '/js/lines/straight-stroke.js'

const THRESHOLD = 1 // used to determine the length of Bezier curves
const DELTA_DERIVATIVE = 0.01

// ClosedCurve is a wrapper around CompositeCurve only if it is closed
class ClosedCurve {
  constructor(curve) {
    if (curve.type == 'ClosedCurve') {
      return curve
    }
    if (curve.type != 'CompositeCurve') {
      throw `ClosedCurve called with unexpected argument ${curve.type}`
    }
    if (!curve.closed()) {
      throw `ClosedCurve got non-closed curve`
    }
    this.curve = curve
    this.type = 'ClosedCurve'
  }

  at(t) {
    return this.curve.at(t)
  }

  move(v) {
    return new ClosedCurve(this.curve.move(v))
  }

  bbox() {
    return this.curve.bbox()
  }

  closed() {
    return true // true by definition
  }

  inside(point) {
    return this.curve.inside(point)
  }

  // return true if the closed curve curves counter-clockwise, false if clockwise
  isCounterClockwise() {
    const t = 0.34
    const length = -2 // negative since perp actually returns a vector 90degs clockwise from the tangent
    let val = this.curve.curves
      .map((curve) =>
        this.inside(curve.at(t).addVect(curve.tangentAt(t).perp().withLength(length))),
      )
      .filter((v) => v).length
    // console.log('isCounterClockwise', val, this.curve.curves.length)
    return val > this.curve.curves.length / 2
  }

  debugCounterClockwisePoints() {
    const t = 0.24
    const length = 50
    let tangents = this.curve.curves.map(
      (curve) =>
        new StraightStroke(curve.at(t), curve.at(t).addVect(curve.tangentAt(t).mult(length))),
    )
    let tangentPerps = this.curve.curves.map(
      (curve) =>
        new StraightStroke(
          curve.at(t),
          curve.at(t).addVect(curve.tangentAt(t).perp().mult(-length)),
        ),
    )
    let points = this.curve.curves.map((curve) =>
      curve.at(t).addVect(curve.tangentAt(t).perp().withLength(2)),
    )
    let annotatedPoints = points.map((pt) => ({ pt, inside: this.inside(pt) }))
    let contours = this.curve.curves.map((curve) => curve.contour())
    // console.log('contours', contours)
    return {
      tangents,
      tangentPerps,
      annotatedPoints,
      contours,
    }
  }

  contour() {
    return this.curve.contour()
  }

  reverse() {
    let rev = new ClosedCurve(this.curve.reverse())
    if (this.id) {
      rev.id = this.id
    }
    return rev
  }

  // return a copy of the curve that is counter-clockwise, including all of the minuses being clockwise
  counterClockwise() {
    return this.isCounterClockwise() ? this : this.reverse()
  }

  clockwise() {
    return this.isCounterClockwise() ? this.reverse() : this
  }

  intersectLineU(line) {
    return this.curve.intersectLineU(line)
  }

  // clip the closed curve to the bbox, return the components (may be non-closed)
  clipComponents(bbox) {
    if (bbox.boxInside(this.bbox())) {
      // nothing to clip
      return [this]
    }
    // the returned clipped curves should either be closed, or their start and endpoints lie on the perimeter of bbox

    let ret = this.curve.clip(bbox)
    // console.log('clipComponents', this, bbox, ret)
    return ret
  }

  // return a string representation of this curve, so that it can be plugged back into code to get an equivalent curve
  repr() {
    return `new ClosedCurve(${this.curve.repr()})`
  }

  d() {
    return this.curve.d()
  }
}

export { ClosedCurve }
