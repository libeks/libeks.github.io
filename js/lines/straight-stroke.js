import { pairs, reduceIntervals, enumerate, crossProduct } from '/js/utils.js'
import { Point, Vector, Line, Point2DOrigin } from '/js/geometry.js'
import { average, quadratic, cubic } from '/js/math.js'
import { BBox, bboxFromPointCloud } from '/js/bbox.js'

const THRESHOLD = 1 // used to determine the length of Bezier curves
const DELTA_DERIVATIVE = 0.01

class StraightStroke {
  constructor(from, to) {
    if (from.type != 'Point') {
      throw `StraighStroke received invalid argument ${from.type}`
    }
    if (to.type != 'Point') {
      throw `StraighStroke received invalid argument ${to.type}`
    }
    this.from = from
    this.to = to
    this.type = 'StraightStroke'
  }

  at(t) {
    return this.from.addVect(this.vect().mult(t))
  }

  vect() {
    return this.from.vectTo(this.to)
  }

  startpoint() {
    return this.from
  }

  endpoint() {
    return this.to
  }

  reverse() {
    // return the stroke in reverse order
    return new StraightStroke(this.to, this.from)
  }

  midpoint() {
    return this.from.midpoint(this.to)
  }

  move(v) {
    // move the stroke by a vector v
    return new StraightStroke(this.from.addVect(v), this.to.addVect(v))
  }

  contour() {
    return this
  }

  // shorten the line by px units off both ends
  stripPx(px) {
    let vect = this.vect().unit()
    return new StraightStroke(this.from.addVect(vect.mult(px)), this.to.addVect(vect.mult(-px)))
  }

  transform2D(matrix) {
    if (matrix.type != 'Matrix2DHomo') {
      throw `StraightStroke.transform2D got unexpected argument ${matrix.type}`
    }
    return new StraightStroke(matrix.multPoint(this.from), matrix.multPoint(this.to))
  }

  line() {
    return new Line(this.from, this.from.vectTo(this.to))
  }

  // intersect this line segment with the line, returning, possibly, a list of t-values of that line (there can only one at most one)
  intersectLineU(line) {
    let l = this.line()
    let ans = l.intersectTU(line)
    if (ans == null) {
      return []
    }
    let { t, u } = ans
    if (t >= 0 && t <= 1) {
      // console.log('intersectLineU StraightStroke', t, u, this)
      return [u]
    }
    return []
  }

  // clip line to bbox
  clip(bbox) {
    if (bbox.inside(this.from) && bbox.inside(this.to)) {
      return [this]
    }
    let l = this.line()
    let ts = [] // t-values relative to this segment
    for (let bboxLine of bbox.lines()) {
      let t = l.intersectT(bboxLine)
      if (t >= 0 && t <= 1) {
        ts.push(t)
      }
    }
    if (ts.length == 0) {
      // appears that the line is completely outside the bbox
      return []
    }
    ts.push(0, 1)
    ts.sort((a, b) => a - b)
    let intervals = reduceIntervals(ts, (t) => bbox.inside(this.at(t)))
    return intervals.map(([a, b]) => new StraightStroke(this.at(a), this.at(b)))

    // for (let [a, b] of pairs(ts)) {
    //   let midpoint = average(a, b)
    //   if (bbox.inside(this.at(midpoint))) {
    //     return [new StraightStroke(this.at(a), this.at(b))]
    //   }
    // }
    // return []
  }

  tangentAt(t) {
    return this.from.vectTo(this.to).unit() // tangent is constant to t for a straight stroke
  }

  bbox() {
    return bboxFromPointCloud(this.from, this.to)
  }

  // if the original line goes from t=[0,1], return a new line that goes from t=[from, to]
  subsection(from, to) {
    return new StraightStroke(this.at(from), this.at(to))
  }

  length() {
    return this.vect().len()
  }

  dContinued() {
    // when rendering a sequence of strokes, skip the MOVE operation
    return `L ${this.to.string()}`
  }

  // return a string representation of this curve, so that it can be plugged back into code to get an equivalent curve
  repr() {
    return `new StraightStroke(${[this.from, this.to].map((point) => point.repr()).join(', ')})`
  }

  d() {
    return `M ${this.from.string()} ${this.dContinued()}`
  }
}

export { StraightStroke }
