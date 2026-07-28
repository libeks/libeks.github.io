import {
  pairs,
  reduceIntervals,
  enumerate,
  crossProduct,
  sortAndRemoveDuplicates,
} from '/js/utils.js'
import { Point, Vector, Line, Point2DOrigin } from '/js/geometry.js'
import { average, quadratic, cubic } from '/js/math.js'
import { BBox, bboxFromPointCloud } from '/js/bbox.js'
import { StraightStroke } from '/js/lines/straight-stroke.js'
import { CompositeCurve } from '/js/lines/composite-curve.js'

const THRESHOLD = 1 // used to determine the length of Bezier curves
const DELTA_DERIVATIVE = 0.01

class CubicBezier {
  constructor(from, c1, c2, to) {
    if (from.type != 'Point' || c1.type != 'Point' || c2.type != 'Point' || to.type != 'Point') {
      throw `CubicBezier with unexpected types ${from.type}, ${c1.type}, ${c2.type}, ${to.type}`
    }
    this.from = from
    this.c1 = c1
    this.c2 = c2
    this.to = to
    this.type = 'CubicBezier'
  }

  startpoint() {
    return this.from
  }

  endpoint() {
    return this.to
  }

  reverse() {
    return new CubicBezier(this.to, this.c2, this.c1, this.from)
  }

  move(v) {
    // move the stroke by a vector v
    return new CubicBezier(
      this.from.addVect(v),
      this.c1.addVect(v),
      this.c2.addVect(v),
      this.to.addVect(v),
    )
  }

  contour() {
    return new CompositeCurve(
      new StraightStroke(this.from, this.c1),
      new StraightStroke(this.c1, this.c2),
      new StraightStroke(this.c2, this.to),
    )
  }

  transform2D(matrix) {
    if (matrix.type != 'Matrix2DHomo') {
      throw `CubicBezier.transform2D got unexpected argument ${matrix.type}`
    }
    return new CubicBezier(
      matrix.multPoint(this.from),
      matrix.multPoint(this.c1),
      matrix.multPoint(this.c2),
      matrix.multPoint(this.to),
    )
  }

  // intersect this CubicBezier curve with the line, returning the t-values of the line at the intersection points
  intersectLineU(line) {
    let ans = this.intersectLineT(line)
    if (ans.length == 0) {
      return []
    }
    let answers = []
    for (let t of ans) {
      let lineT = line.pointProjectionTValue(this.at(t))
      // console.log('intersectLineU CubicStroke', t, lineT, this)
      answers.push(lineT)
    }
    return answers
  }

  // intersect this CubicBezier curve with the line, returning the t-values of the curve at the intersection points
  intersectLineT(line) {
    if (line.type != 'Line') {
      throw `Invalid parameter to CubicBezier.intersectLineT: ${line.type}`
    }
    // clip the line to be within the bbox of the current curve, thereby making floating point issues less apparent
    let lines = this.bbox().clipLine(line)
    if (lines.length == 0) {
      return [] // line doesn't appear to intersect the bbox, so it likely doesn't intersect the curve
    }
    if (lines.length > 1) {
      throw `bbox.clipLine returned more than one answer`
    }
    line = new Line(lines[0].from, lines[0].from.vectTo(lines[0].to))
    // compute cubic parameters (a,b,c,d), given the implicit notation of the line A⋅x=d, and the parametric equation of the Quadratic Bezier curve
    // X(t) = (1-t)^3 * P0 + 3t(1-t)^2 * P1 + 3t^2(1-t) * P2 + P3

    // the math works out to doing math on points, which is intentionally not supported, so they need to be converted to vectors
    let v0 = Point2DOrigin.vectTo(this.from)
    let v1 = Point2DOrigin.vectTo(this.c1)
    let v2 = Point2DOrigin.vectTo(this.c2)
    let v3 = Point2DOrigin.vectTo(this.to)
    let [A, lineD] = line.implicit()
    let aVect = v0.mult(-1).add(v1.mult(3).add(v2.mult(-3).add(v3))) // -P0 + 3P1 - 3P2 + P3
    let a = A.dot(aVect)
    let bVect = v0.mult(3).add(v1.mult(-6)).add(v2.mult(3)) // 3P0 - 6P1 + 3P2
    let b = A.dot(bVect)
    let cVect = v0.mult(-3).add(v1.mult(3))
    let c = A.dot(cVect)
    let d = A.dot(v0) - lineD
    let roots = cubic(a, b, c, d)

    // console.log('solving cubic with', a, b, c, d, roots, this)
    roots = roots.filter((t) => t >= 0 && t <= 1) // filter out intersections outside the span of this curve
    return roots
  }

  clip(bbox) {
    // console.log('Cubic.clip', this)
    if (!bbox.boxHasIntersection(this.bbox())) {
      // console.log('Cubic: bbox has no intersection, returning empty')
      return []
    }
    if (bbox.boxInside(this.bbox())) {
      // console.log('Cubic: bbox inside large bbox, returning self')
      return [this]
    }

    let ts = []
    for (let line of bbox.lines()) {
      let roots = this.intersectLineT(line)
      // console.log('roots', line, roots)
      for (let root of roots) {
        if (root >= 0 && root <= 1) {
          ts.push(root)
        }
      }
    }

    ts.push(0, 1)
    ts = sortAndRemoveDuplicates(ts)
    // ts.sort((a, b) => a - b)
    // for (let [a,b] of pairs(ts)) {
    //   if (a!=b) {

    //   }
    // }
    // console.log('Cubic: returning for ts', ts)
    // console.log('CubicBezier.clip', ts)
    let ret = reduceIntervals(ts, (t) => bbox.inside(this.at(t))).map(([a, b]) =>
      this.subsection(a, b),
    )
    // console.log('ret', ret)
    return ret
  }

  // TODO: Improve bbox logic, this over-estimates the bbox
  bbox() {
    return bboxFromPointCloud(this.from, this.c1, this.c2, this.to)
  }

  at(t) {
    let a1 = new StraightStroke(this.from, this.c1).at(t)
    let a2 = new StraightStroke(this.c1, this.c2).at(t)
    let a3 = new StraightStroke(this.c2, this.to).at(t)

    let b1 = new StraightStroke(a1, a2).at(t)
    let b2 = new StraightStroke(a2, a3).at(t)
    return new StraightStroke(b1, b2).at(t)
  }

  tangentAt(t) {
    let p1 = this.at(t)
    let p2 = this.at(t + DELTA_DERIVATIVE)
    let vect = p1.vectTo(p2).unit()
    // console.log('tangent vect', vect)
    return vect
    // if (Math.abs(t - 1) < THRESHOLD) {
    //   return this.c2.vectTo(this.to)
    // }
    // let a1 = new StraightStroke(this.from, this.c1).at(t)
    // let a2 = new StraightStroke(this.c1, this.c2).at(t)
    // let a3 = new StraightStroke(this.c2, this.to).at(t)
    // let b1 = new StraightStroke(a1, a2).at(t)
    // let b2 = new StraightStroke(a2, a3).at(t)
    // return new StraightStroke(b1, b2).at(t).vectTo(b2)
  }

  // return two cubic bezier curves, one from [0, t], the other from [t, 1]
  // this is helpful: https://pomax.github.io/bezierinfo/#splitting
  subdivide(t) {
    if (isNaN(t)) {
      console.trace()
      throw `CubicBezier.subdivide got NaN argument`
    }
    // console.log('CubicBezier subdivide', this, t)
    let start = this.from
    let end = this.to

    let a1 = new StraightStroke(this.from, this.c1).at(t)
    let a2 = new StraightStroke(this.c1, this.c2).at(t)
    let a3 = new StraightStroke(this.c2, this.to).at(t)
    let b1 = new StraightStroke(a1, a2).at(t)
    let b2 = new StraightStroke(a2, a3).at(t)
    let c = new StraightStroke(b1, b2).at(t)
    return [new CubicBezier(this.from, a1, b1, c), new CubicBezier(c, b2, a3, end)]
  }

  length() {
    let firstLast = this.from.vectTo(this.to).len()
    let fullContour =
      this.from.vectTo(this.c1).len() +
      this.c1.vectTo(this.c2).len() +
      this.c2.vectTo(this.to).len()
    if (fullContour - firstLast < THRESHOLD) {
      return firstLast
    }
    let [a, b] = this.subdivide(0.5)
    return a.length() + b.length()
  }

  // if the original line goes from t=[0,1], return a new line that goes from t=[from, to]
  subsection(from, to) {
    // console.log('CubicBezier.subsection', this, from, to)
    if (to < from) {
      throw `CubicBezier.subsection parameters out of order ${from} ${to}`
    }
    let [, subcurve] = this.subdivide(from)
    let [subtwo, _] = subcurve.subdivide((to - from) / (1 - from))
    return subtwo
  }

  dContinued() {
    // when rendering a sequence of strokes, skip the MOVE operation
    return `C ${this.c1.string()} ${this.c2.string()} ${this.to.string()}`
  }

  // return a string representation of this curve, so that it can be plugged back into code to get an equivalent curve
  repr() {
    return `new CubicBezier(${[this.from, this.c1, this.c2, this.to].map((point) => point.repr()).join(', ')})`
  }

  d() {
    return `M ${this.from.string()} ${this.dContinued()}`
  }
}

export { CubicBezier }
