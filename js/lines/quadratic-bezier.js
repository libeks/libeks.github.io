import { pairs, reduceIntervals, enumerate, crossProduct } from '/js/utils.js'
import { Point, Vector, Line, Point2DOrigin } from '/js/geometry.js'
import { average, quadratic, cubic } from '/js/math.js'
import { BBox, bboxFromPointCloud } from '/js/bbox.js'
import { StraightStroke } from '/js/lines/straight-stroke.js'
import { CompositeCurve } from '/js/lines/composite-curve.js'

const THRESHOLD = 1 // used to determine the length of Bezier curves
const DELTA_DERIVATIVE = 0.01

class QuadraticBezier {
  constructor(from, c1, to) {
    this.from = from
    this.c1 = c1
    this.to = to
    this.type = 'QuadraticBezier'
  }

  startpoint() {
    return this.from
  }

  endpoint() {
    return this.to
  }

  reverse() {
    return new QuadraticBezier(this.to, this.c1, this.from)
  }

  move(v) {
    // move the stroke by a vector v
    return new QuadraticBezier(this.from.addVect(v), this.c1.addVect(v), this.to.addVect(v))
  }

  contour() {
    return new CompositeCurve(
      new StraightStroke(this.from, this.c1),
      new StraightStroke(this.c1, this.to),
    )
  }

  transform2D(matrix) {
    if (matrix.type != 'Matrix2DHomo') {
      throw `QuadraticBezier.transform2D got unexpected argument ${matrix.type}`
    }
    return new QuadraticBezier(
      matrix.multPoint(this.from),
      matrix.multPoint(this.c1),
      matrix.multPoint(this.to),
    )
  }

  // intersect this QuadraticBezier curve with the line, returning the t-values of the line at the intersection points
  intersectLineU(line) {
    let ans = this.intersectLineT(line)
    if (ans.length == 0) {
      return []
    }
    let answers = []
    for (let t of ans) {
      let lineT = line.pointProjectionTValue(this.at(t))
      // console.log('intersectLineU QuadraticStroke', t, lineT, this)
      answers.push(lineT)
    }
    return answers
  }

  clip(bbox) {
    if (!bbox.boxHasIntersection(this.bbox())) {
      // console.log('Quadratic: bbox has no intersection, returning empty')
      return []
    }
    if (bbox.boxInside(this.bbox())) {
      // console.log('Quadratic: bbox inside large bbox, returning self')
      return [this]
    }

    let ts = []
    for (let line of bbox.lines()) {
      let roots = this.intersectLineT(line)
      for (let root of roots) {
        if (root >= 0 && root <= 1) {
          let pt = this.at(root)
          let distance = pt.distance(line.projectPoint(pt))
          if (distance > 0.1) {
            console.log(this, root, pt)
            throw `Clip distance is too great ${distance}`
          }
          ts.push(root)
        }
      }
    }

    // if (ts.length == 0) {
    //   // appears that the bezier doesn't intersect the boundary of the box
    //   return []
    // }
    ts.push(0, 1)
    ts.sort((a, b) => a - b)
    // console.log('Quadratic: returning for ts', ts)
    let ret = reduceIntervals(ts, (t) => bbox.inside(this.at(t))).map(([a, b]) =>
      this.subsection(a, b),
    )
    // console.log(
    //   'ret',
    //   ret.map((curve) => [curve.startpoint(), curve.endpoint()]),
    // )
    return ret
  }

  intersectLineT(line) {
    if (line.type != 'Line') {
      throw `Invalid parameter to QuadraticBezier.intersectLineT: ${line.type}`
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

    // compute quadratic parameters (a,b,c), given the implicit notation of the line A⋅x=d, and the parametric equation of the Quadratic Bezier curve
    // X(t) = (1-t)^2 * P0 + 2t(1-t) * P1 + t^2 + P2

    // the math works out to doing math on points, which is intentionally not supported, so they need to be converted to vectors
    let v0 = Point2DOrigin.vectTo(this.from)
    let v1 = Point2DOrigin.vectTo(this.c1)
    let v2 = Point2DOrigin.vectTo(this.to)
    let [A, lineD] = line.implicit()
    let aVect = v0.add(v1.mult(-2).add(v2))
    let a = A.dot(aVect)
    let bVect = v0.mult(-1).add(v1).mult(2)
    let b = A.dot(bVect)
    let c = A.dot(v0) - lineD
    let roots = quadratic(a, b, c)
    // console.log('solving quadratic for ', a, b, c, 'got', roots, 'line', line)
    roots = roots.filter((t) => t >= 0 && t <= 1) // filter out intersections outside the span of this curve
    return roots
  }

  // TODO: Improve bbox logic, this over-estimates the bbox
  bbox() {
    return bboxFromPointCloud(this.from, this.c1, this.to)
  }

  at(t) {
    return new StraightStroke(
      new StraightStroke(this.from, this.c1).at(t),
      new StraightStroke(this.c1, this.to).at(t),
    ).at(t)
  }

  tangentAt(t) {
    let p1 = this.at(t)
    let p2 = this.at(t + DELTA_DERIVATIVE)
    let vect = p1.vectTo(p2).unit()
    // console.log('tangent vect', vect)
    return vect
    // if (Math.abs(t - 1) < THRESHOLD) {
    //   return this.c1.vectTo(this.to)
    // }
    // let a1 = new StraightStroke(this.from, this.c1).at(t)
    // let a2 = new StraightStroke(this.c1, this.to).at(t)
    // let b = new StraightStroke(a1, a2).at(t).vectTo(a2).mult(10)
  }

  // return two quadratic bezier curves, one from [0, t], the other from [t, 1]
  // this is helpful: https://pomax.github.io/bezierinfo/#splitting
  subdivide(t) {
    let start = this.from
    let end = this.to

    let a1 = new StraightStroke(this.from, this.c1).at(t)
    let a2 = new StraightStroke(this.c1, this.to).at(t)
    let b1 = new StraightStroke(a1, a2).at(t)
    return [new QuadraticBezier(this.from, a1, b1), new QuadraticBezier(b1, a2, end)]
  }

  length() {
    let firstLast = this.from.vectTo(this.to).len() // length of direct line from start to end
    let fullContour = this.from.vectTo(this.c1).len() + this.c1.vectTo(this.to).len() // length of the full contour
    if (fullContour - firstLast < THRESHOLD) {
      return firstLast
    }
    let [a, b] = this.subdivide(0.5)
    return a.length() + b.length()
  }

  // if the original line goes from t=[0,1], return a new line that goes from t=[from, to]
  subsection(from, to) {
    if (to < from) {
      throw `QuadraticBezier.subsection parameters out of order ${from} ${to}`
    }
    let [, subcurve] = this.subdivide(from)
    let [subtwo, _] = subcurve.subdivide((to - from) / (1 - from))
    return subtwo
  }

  dContinued() {
    // when rendering a sequence of strokes, skip the MOVE operation
    return `Q ${this.c1.string()} ${this.to.string()}`
  }

  // return a string representation of this curve, so that it can be plugged back into code to get an equivalent curve
  repr() {
    return `new QuadraticBezier(${[this.from, this.c1, this.to].map((point) => point.repr()).join(', ')})`
  }

  d() {
    return `M ${this.from.string()} ${this.dContinued()}`
  }
}

export { QuadraticBezier }
