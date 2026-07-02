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

  d() {
    return `M ${this.from.string()} ${this.dContinued()}`
  }
}

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
      return []
    }
    if (bbox.boxInside(this.bbox())) {
      return [this]
    }

    let ts = []
    for (let line of bbox.lines()) {
      let roots = this.intersectLineT(line)
      for (let root of roots) {
        if (root >= 0 && root <= 1) {
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
    return reduceIntervals(ts, (t) => bbox.inside(this.at(t))).map(([a, b]) =>
      this.subsection(a, b),
    )
  }

  intersectLineT(line) {
    if (line.type != 'Line') {
      throw `Invalid parameter to QuadraticBezier.intersectLineT: ${line.type}`
    }
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
    // console.log('solving quadratic for ', a, b, c, 'got', roots)
    roots = roots.filter((t) => t >= 0 && t <= 1) // filter out intersections outside the span of this curve
    return roots
  }

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

  d() {
    return `M ${this.from.string()} ${this.dContinued()}`
  }
}

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
    // if (roots.length == 0) {
    // if (this.from.x == 729.0230484541327) {
    //   console.log('solving cubic with', a, b, c, d, roots, this)
    // }
    roots = roots.filter((t) => t >= 0 && t <= 1) // filter out intersections outside the span of this curve
    return roots
  }

  clip(bbox) {
    if (!bbox.boxHasIntersection(this.bbox())) {
      return []
    }
    if (bbox.boxInside(this.bbox())) {
      return [this]
    }

    let ts = []
    for (let line of bbox.lines()) {
      let roots = this.intersectLineT(line)
      for (let root of roots) {
        if (root >= 0 && root <= 1) {
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
    return reduceIntervals(ts, (t) => bbox.inside(this.at(t))).map(([a, b]) =>
      this.subsection(a, b),
    )
  }

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

  d() {
    return `M ${this.from.string()} ${this.dContinued()}`
  }
}

class CircleArc {
  constructor(from, to, radius, largeArc, sweep) {
    this.from = from
    this.to = to
    this.radius = radius
    this.largeArc = largeArc
    this.sweep = sweep
  }

  move(v) {
    return new CircleArc(
      this.from.addVect(v),
      this.to.addVect(v),
      this.radius,
      this.largeArc,
      this.sweep,
    )
  }

  startpoint() {
    return this.from
  }

  endpoint() {
    return this.to
  }

  dContinued() {
    return `A ${this.radius} ${this.radius} 0 ${this.largeArc} ${this.sweep} ${this.to.string()}`
  }

  transform2D(matrix) {
    if (matrix.type != 'Matrix2DHomo') {
      throw `CircleArc.transform2D got unexpected argument ${matrix.type}`
    }
    return new CircleArc(
      matrix.multPoint(this.from),
      matrix.multPoint(this.to),
      this.radius,
      this.largeArc,
      this.sweep,
    )
  }

  d() {
    return `M ${this.from.string()} ${this.dContinued()}`
  }

  clip(bbox) {
    throw `CircleArc.clip not implemented`
  }
}

class CompositeCurve {
  // Composite Curve is a continuous curve composed of StraightStrokes, quadratic-, and cubic- bezier curves. Circle arcs are not fully supported
  // it is not necessarily closed; for that, use ClosedCurve

  constructor(...args) {
    // console.log('args', args)
    // console.log(
    //   'Composite curve continuous',
    //   pairs(args).map(([a, b]) => a.endpoint().same(b.startpoint())),
    // )
    for (let [a, b] of pairs(args)) {
      // console.log('a,b', a.endpoint(), b.endpoint())

      if (!a.endpoint().same(b.startpoint())) {
        console.trace()

        throw `Composite Curve called with non-connected segments`
      }
    }
    let curves = []
    for (let curve of args) {
      if (
        ![
          'StraightStroke',
          'QuadraticBezier',
          'CubicBezier',
          'CompositeCurve',
          'CatalanFragment',
        ].includes(curve.type)
      ) {
        console.trace()
        throw `CompositeCurve got unexpected argument ${curve.type}`
      }
      if (curve.type == 'CompositeCurve') {
        curves.push(...curve.curves)
      } else {
        curves.push(curve)
      }
    }

    this.curves = curves
    this.type = 'CompositeCurve'
  }

  withColor(color) {
    this.color = color
    return this
  }

  // append curve segment at the end of the list. The segment's startpoint must match the endpoint of the composite curve
  add(curve) {
    if (this.curves.length == 0) {
      this.curves.push(curve)
      return this
    }
    if (!curve.startpoint().same(this.curves[this.curves.length - 1].endpoint())) {
      console.trace()
      throw `Adding a new curve that is not continuous ${curve.d()}`
    }
    if (curve.type == 'CompositeCurve') {
      this.curves.push(...curve.curves)
    } else {
      this.curves.push(curve)
    }
  }

  // prepend a curve segment to the front of the list. The segment's endpoint must match the startpoint of the composite curve
  prepend(curve) {
    if (this.curves.length == 0) {
      this.curves.push(curve)
      return this
    }
    if (!curve.endpoint().same(this.curves[0].startpoint())) {
      console.trace()
      throw `Prepending a new curve that is not continuous ${curve.d()}`
    }
    this.curves.unshift(curve) // prepend the curve item to the list
  }

  startpoint() {
    if (this.curves.lenght == 0) {
      return null
    }
    return this.curves[0].startpoint()
  }

  endpoint() {
    if (this.curves.length == 0) {
      return null
    }
    return this.curves[this.curves.length - 1].endpoint()
  }

  // linearly interpolate, each segment takes up equal proportion of [0,1]
  at(t) {
    if (this.curves.length == 0) {
      return null
    }
    let i = Math.floor(t * this.curves.length)
    let miniT = (t * this.curves.length) % 1
    // console.log('this.curves[i]', this.curves[i])
    return this.curves[i].at(miniT)
  }

  tangentAt(t) {
    if (this.curves.length == 0) {
      return null
    }
    let i = Math.floor(t * this.curves.length)
    let miniT = (t * this.curves.length) % 1
    // console.log('this.curves[i]', this.curves[i])
    return this.curves[i].tangentAt(miniT)
  }

  // given a line, return the list of t-values of it intersecting with the composite curve
  intersectLineU(line) {
    let answers = []
    for (let curve of this.curves) {
      answers.push(...curve.intersectLineU(line))
      // let lineT = line.pointProjectionTValue(l.at(t))
      // if (lineT >= 0 && lineT <= 1) {
      //   answers.push(lineT)
      // }
    }
    return answers
  }

  insideExtended(pt) {
    if (pt.type != 'Point') {
      throw `CompositeCurve.inside() got unexpected argument ${pt.type}`
    }
    if (!this.closed()) {
      return false // non-closed curves don't have an "inside"
    }
    if (!this.bbox().inside(pt)) {
      return false
    }
    let line = new Line(pt, new Vector(1, 0))
    let intersections = this.intersectLineU(line)
    // console.log('intersections', intersections)
    intersections = intersections.filter((t) => t > 0)
    intersections = [...new Set(intersections)]
    // console.log('intersections after removing negatives', intersections)
    // return intersections.length % 2 == 1 // TODO: detect identical or close-enough t-values
    let inside = intersections.length % 2 == 1
    // console.log('ts', intersections)
    return {
      inside,
      intersections: intersections.map((t) => line.at(t)),
    }
  }
  inside(pt) {
    // return true if the point is inside the closed Composite Curve
    if (pt.type != 'Point') {
      throw `CompositeCurve.inside() got unexpected argument ${pt.type}`
    }
    if (!this.closed()) {
      return false // non-closed curves don't have an "inside"
    }
    if (!this.bbox().inside(pt)) {
      return false
    }
    // extend a ray from the point in the 0x direction, count the number of intersections with the closed curve
    // if odd, the point must be inside (modulo floating-point imprecisions)
    let line = new Line(pt, new Vector(1, 0))
    let intersections = this.intersectLineU(line)
    intersections = intersections.filter((t) => t > 0)
    intersections = [...new Set(intersections)]
    return intersections.length % 2 == 1
  }

  // return whether the curve is closed, i.e. it is continuous and its start and end points are connected
  closed() {
    return this.startpoint().same(this.endpoint())
  }

  isEmpty() {
    return this.curves.length == 0
  }

  d() {
    if (!this.curves || this.curves.length == 0) {
      return ''
    }
    let components = [this.curves[0].d()]
    let end = this.curves[0].endpoint()
    for (let i = 1; i < this.curves.length; i++) {
      if (this.curves[i - 1].endpoint().same(this.curves[i].startpoint())) {
        components.push(this.curves[i].dContinued())
      } else {
        console.warn(
          'curves are not continuous',
          this.curves[i - 1].endpoint(),
          this.curves[i].startpoint(),
        )
        components.push(this.curves[i].d())
      }
      end = this.curves[i].endpoint()
    }
    return components.join(' ')
  }

  // render all but the first point
  dContinued() {
    if (this.curves.lenght == 0) {
      return ''
    }
    let components = []
    let end
    // let end = this.curves[0].endpoint()
    for (let i = 0; i < this.curves.length; i++) {
      if (i > 0) {
        if (this.curves[i - 1].endpoint().same(this.curves[i].startpoint())) {
          components.push(this.curves[i].dContinued())
        } else {
          console.warn(
            'curves are not continuous',
            this.curves[i - 1].endpoint(),
            this.curves[i].startpoint(),
          )
          components.push(this.curves[i].d())
        }
        end = this.curves[i].endpoint()
      } else {
        components.push(this.curves[i].dContinued())
        end = this.curves[i].endpoint()
      }
    }
    return components.join(' ')
  }

  contour() {
    let contours = []
    for (let component of this.curves) {
      contours.push(component.contour())
    }
    return new CompositeCurve(...contours)
  }

  transform2D(matrix) {
    if (matrix.type != 'Matrix2DHomo') {
      throw `CompositeCurve.transform2D got unexpected argument ${matrix.type}`
    }
    return new CompositeCurve(...this.curves.map((curve) => transform2D(matrix)))
  }

  clip(bbox) {
    if (bbox.boxInside(this.bbox())) {
      return [this]
    }
    let clipped = []
    for (let component of this.curves) {
      let result = component.clip(bbox)
      // console.log(
      //   'composite clipping',
      //   component,
      //   component.startpoint(),
      //   component.endpoint(),
      //   result,
      //   result.length,
      //   result.map((c) => [c.startpoint(), c.endpoint()]),
      //   bbox,
      // )
      clipped.push(...result)
    }
    // join continuous elements back together
    if (clipped.length == 0) {
      // console.log('clipping returned nothing')
      return []
    }
    let joined = []
    let current
    for (let elt of clipped) {
      if (current == null) {
        current = elt
        continue
      }
      if (current.endpoint().same(elt.startpoint())) {
        // if (current.type == 'CompositeCurve') {
        //   current.add(elt) // FIXME: This might modify the underlying curve?
        //   console.log('current.add', current)
        // } else {
        //   current = new CompositeCurve(current, elt)
        // }
        current = new CompositeCurve(current, elt)
      } else {
        joined.push(current)
        current = elt
      }
    }
    if (current != null) {
      joined.push(current)
    }
    if (joined.length == 1) {
      // don't try to combine endpoints if there is only one curve
      return joined
    }
    if (joined[0].startpoint().same(joined[joined.length - 1].endpoint())) {
      // console.log(
      //   'joining endpoints!',
      //   joined,
      //   joined.map((c) => [c.startpoint(), c.endpoint()]),
      //   joined[0],
      //   joined[joined.length - 1],
      // )
      // joined[0] = new CompositeCurve(joined[joined.length - 1], joined[0])
      // joined.splice(joined.length - 1, 1) //remove the last item, it has been merged with the first one
      joined = [
        new CompositeCurve(joined[joined.length - 1], joined[0]),
        ...joined.slice(1, joined.length - 1),
      ]
      // console.log('joined after splicing', joined)
      // console.log(
      //   'clip joining',
      //   pairs(joined).map(([a, b]) => a.startpoint().same(b.endpoint())),
      // )
    }
    // the result will be a list of curves (some primitive, some composite curves), each disjoint
    // console.log('clip() returning', joined)
    // console.log(
    //   'ccc',
    //   joined.map((curve) => curve.type != 'CompositeCurve' || curve.isContinousDebug()),
    // )
    return joined
  }

  length() {
    let sum = 0
    for (let chunk of this.curves) {
      // console.log('chunk', chunk)
      sum += chunk.length()
    }
    return sum
  }

  // return a this curve reversed, such that the endpoints are flipped
  reverse() {
    // console.log(
    //   'before reverse()',
    //   this,
    //   this.closed(),
    //   pairs(this.curves).map(([a, b]) => a.endpoint().same(b.startpoint())),
    // )
    // let reversed = this.curves.toReversed().map((curve) => curve.reverse())
    let partial = this.curves.map((curve) => curve.reverse())
    // console.log(
    //   'partial',
    //   partial,
    //   pairs(partial).map(([a, b]) => a.startpoint().same(b.endpoint())),
    // )
    let reversed = this.curves.map((curve) => curve.reverse()).toReversed()
    // console.log(
    //   'after reverse()',
    //   pairs(reversed).map(([a, b]) => a.endpoint().same(b.startpoint())),
    // )
    let ret = new CompositeCurve(...reversed)
    // console.log('ret', ret, ret.closed())
    return ret
  }

  // all CompositeCurves should be continuous by constructor, unless the component curves are manually modified.
  // This is a helper to determine whether the curve in its current state is continuous
  isContinousDebug() {
    return pairs(this.curves).every(([a, b]) => a.endpoint().same(b.startpoint()))
  }

  bbox() {
    if (this.curves.length == 0) {
      return new BBox(0, 0, 0, 0)
    }
    let bbox = this.curves[0].bbox()
    for (let i = 1; i < this.curves.length; i++) {
      bbox = bbox.add(this.curves[i].bbox())
    }
    return bbox
  }
}

class ClosedCurve {
  constructor(curve) {
    if (!curve.closed()) {
      throw `ClosedCurve got non-closed curve`
    }
    this.curve = curve
    this.type = 'ClosedCurve'
  }

  at(t) {
    return this.curve.at(t)
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
    let val = this.curve.curves
      .map((curve) => this.inside(curve.at(t).addVect(curve.tangentAt(t).perp().withLength(-2))))
      .filter((v) => v).length
    return val > this.curve.curves.length / 2
  }

  debugCounterClockwisePoints() {
    const t = 0.34
    const length = 50
    let tangents = this.curve.curves.map(
      (curve) =>
        new StraightStroke(curve.at(t), curve.at(t).addVect(curve.tangentAt(t).mult(length))),
    )
    let tangentPerps = this.curve.curves.map(
      (curve) =>
        new StraightStroke(
          curve.at(t),
          curve.at(t).addVect(curve.tangentAt(t).perp().mult(length)),
        ),
    )
    let points = this.curve.curves.map((curve) =>
      curve.at(t).addVect(curve.tangentAt(t).perp().withLength(2)),
    )
    let annotatedPoints = points.map((pt) => ({ pt, inside: this.inside(pt) }))
    let contours = this.curve.curves.map((curve) => curve.contour())
    console.log('contours', contours)
    return {
      tangents,
      tangentPerps,
      annotatedPoints,
      contours,
    }
  }

  reverse() {
    // console.log('this.curve', this.curve.type, this.curve.reverse().type)
    // console.log('Closed curve reverse', this.curve.closed(), this.curve.reverse().curve.closed())
    return new ClosedCurve(this.curve.reverse())
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
    return ret
  }

  d() {
    return this.curve.d()
  }
}

class ClosedCurveWithMinus {
  constructor(curve, minus) {
    if (curve.type != 'ClosedCurve') {
      throw `ClosedCurve got a non-ClosedCurve argument ${curve.type}`
    }
    for (let m of minus) {
      if (m.type != 'ClosedCurveWithMinus') {
        throw `ClosedCurve got a non-ClosedCurveWithMinus minus component ${m.type}`
      }
    }
    this.curve = curve // the basic "positive curve"
    // closed curves that should be removed from the current one. They usually are completely contained inside the closed curve
    // note that doubly nested minus curves will result in the inner one being filled, using fill-rule="evenodd"
    this.minus = minus
    this.type = 'ClosedCurveWithMinus'
  }

  bbox() {
    return this.curve.bbox()
  }

  closed() {
    // true by definition of it being a ClosedCurveWithMinus
    return true
  }

  inside(point) {
    if (!this.curve.inside(point)) {
      return false
    }
    for (let m of this.minus) {
      if (m.inside(point)) {
        return false
      }
    }
    return true
  }

  // return a copy of the curve that is counter-clockwise, including all of the minuses being clockwise
  counterClockwise() {
    let minuses = this.minus.map((minus) => minus.clockwise())
    return new ClosedCurveWithMinus(this.curve.counterClockwise(), minuses)
  }

  clockwise() {
    let minuses = this.minus.map((minus) => minus.counterClockwise()) // minuses need to oriented in reverse, i.e. clounter clockwise
    return new ClosedCurveWithMinus(this.curve.clockwise(), minuses)
  }

  // gather all of the closed curves together, walking through the full minus-tree of this component
  allComponents() {
    let components = [this.curve]
    for (let minus of this.minus) {
      components.push(...minus.allComponents())
    }
    return components
  }

  // fill fills the closed curve with parallel lines, all at 'directionDeg' angle (degrees)
  fill(gap, directionDeg) {
    let vect = new Vector(1, 0).rotateDeg(directionDeg).mult(gap)
    let perpVect = vect.perp()
    let perpLine = new Line(Point2DOrigin, perpVect)
    // get the t-values of the corners of the bbox with respect to the vector
    let tValues = this.bbox()
      .corners()
      .map((corner) => perpLine.pointProjectionTValue(corner))
    tValues.sort((a, b) => a - b)
    let allCurves = [this.curve, ...this.minus]
    let lines = []
    for (let i = tValues[0]; i < tValues[tValues.length - 1]; i++) {
      let line = new Line(perpLine.at(i), vect)
      let tvalues = []
      for (let curve of allCurves) {
        tvalues.push(...curve.intersectLineU(line))
      }
      tvalues.sort((a, b) => a - b)
      let intervals = reduceIntervals(tvalues, (t) => {
        let midpoint = line.at(t)
        return this.curve.inside(midpoint) && !this.minus.some((c) => c.inside(midpoint))
      })
      for (let [t1, t2] of intervals) {
        let p1 = line.at(t1)
        let p2 = line.at(t2)
        lines.push(new StraightStroke(p1, p2))
      }
    }
    return lines
  }

  // TODO: remove
  // used in experimentation.html to debug fill logic, may be removed later
  fillDebug(gap, directionDeg) {
    let vect = new Vector(1, 0).rotateDeg(directionDeg).mult(gap)
    let perpVect = vect.perp()
    let perpLine = new Line(Point2DOrigin, perpVect)
    // get the t-values of the corners of the bbox with respect to the vector
    let tValues = this.bbox()
      .corners()
      .map((corner) => perpLine.pointProjectionTValue(corner))
    tValues.sort((a, b) => a - b)
    // console.log('tvalues', tValues)
    // tValues = [216.86693101272223, 217]
    let allCurves = [this.curve, ...this.minus]
    let lines = []
    for (let i = tValues[0]; i < tValues[tValues.length - 1]; i++) {
      let line = new Line(perpLine.at(i), vect)
      let linelines = []
      let tvalues = []
      let intersections = []
      for (let curve of allCurves) {
        tvalues.push(...curve.intersectLineU(line))
      }
      tvalues.sort((a, b) => a - b)
      let intervals = reduceIntervals(tvalues, (t) => {
        let midpoint = line.at(t)
        // return this.curve.inside(midpoint) && !this.minus.some((c) => c.inside(midpoint))
        let inside = this.curve.insideExtended(midpoint)
        intersections.push(...inside.intersections)
        return inside.inside && !this.minus.some((c) => c.inside(midpoint))
      })
      // insideExtended
      for (let [t1, t2] of intervals) {
        let p1 = line.at(t1)
        let p2 = line.at(t2)
        linelines.push(new StraightStroke(p1, p2))
      }
      // console.log('intersections', intersections)
      lines.push({
        line,
        linelines,
        points: tvalues.map((t) => line.at(t)),
        intersections,
      })
    }
    // console.log('fill returning lines', lines)
    return lines
  }

  intersectLineU(line) {
    let values = this.curve.intersectLineU(line)
    for (let m of this.minus) {
      values.push(...m.intersectLineU(line))
    }
    return values
  }

  // fillCrosshatch fills the closed curve with two sets of lines, one in 'directionDeg', the other perpendicular
  fillCrosshatch(gap, directionDeg) {
    return [...fill(gap, directionDeg), ...fill(gap, directionDeg + 90)]
  }

  clip(bbox) {
    // TODO: filter out empty curves. note that this could split the main curve into multiple
    // console.log(
    //   'clip closed continuity',
    //   pairs(this.curve.curve.curves).map(([a, b]) => a.endpoint().same(b.startpoint())),
    // )
    if (bbox.boxInside(this.bbox())) {
      // nothing to clip
      return [this]
    }
    let curveClip = this.curve.clipComponents(bbox)
    if (curveClip.length == 1 && curveClip[0].type == 'ClosedCurve') {
      // main curve was not clipped, so the minus curves are also preserved, the curve is not affected
      return [this]
    }
    let counterClockwise = this.counterClockwise()
    let components = counterClockwise.allComponents()

    let bits = []
    // all the clipped components should have their endpoints on the perimeter of the bbox
    for (let component of components) {
      let clipped = component.clipComponents(bbox)
      bits.push(...clipped)
    }
    let debugClip = components[0].curve.curves
    let debugBits = components[0].curve.curves.map((curve) => curve.clip(bbox)).flat()
    let debugBits2 = components[0].curve.clip(bbox)

    let closed = bits.filter((bit) => bit.closed && bit.closed())
    let closedBits = [...closed]
    let open = bits.filter((bit) => !(bit.closed && bit.closed()))
    let openBits = [...open]
    if (open.length + closed.length != bits.length) {
      throw `Open and closed curves don't add up ${closed.length} ${open.length} ${bits.length}`
    }
    // let startpoints = []
    // let endpoints = []
    let allpoints = []
    for (let [i, curve] of enumerate(open)) {
      // processed[i] = false
      // console.log('open curve', open[i], open[i].startpoint(), open[i].endpoint())
      let start = bbox.perimeterPointT(open[i].startpoint())
      let end = bbox.perimeterPointT(open[i].endpoint())
      // startpoints.push([start, i])
      // endpoints.push([end, i])
      allpoints.push([start, i, 'start'], [end, i, 'end'])
    }
    if (allpoints.length % 2 == 1) {
      throw `allpoints is of odd length ${allpoints.length}`
    }
    // startpoints.sort(([a, aID], [b, bID]) => a - b)
    // endpoints.sort(([a, aID], [b, bID]) => a - b)
    allpoints.sort(([a, aid, at], [b, bid, bt]) => a - b)
    // console.log('start-end points', startpoints, endpoints)
    // console.log('allpoints', allpoints)
    for (let [[a, aid, at], [b, bid, bt]] of pairs(allpoints)) {
      if (at == bt) {
        // console.log('this', this, this.d())
        throw `Allpoints appear in non-alternating order`
      }
    }
    if (allpoints.length > 0 && allpoints[0][2] != 'end') {
      // if first element is not an 'end' (i.e. it is a start), move it to the end, so that the sequence always starts with 'end'
      // allpoints.push(allpoints[allpoints.length - 1]) // add first element to the end
      // allpoints.splice(0, 1) // remove first element ('start'), it now is at the end
      // console.log('allpoints: moving beginning to end', allpoints)
      allpoints = [...allpoints.slice(1), allpoints[0]]
      // console.log('allpoints2', allpoints)
    }

    let pairMapping = {} // mapping from the id of the endpoint to the id of the startpoint
    let connectors = {}
    for (let [[a, aid, at], [b, bid, bt]] of pairs(allpoints)) {
      if (at != 'end') {
        continue // skip odd pairs
      }
      pairMapping[aid] = bid
      connectors[aid] = bbox.perimeterPath(a, b)
    }
    // console.log('pairMapping, connectors', pairMapping, connectors)

    let loops = []
    let processed = {}
    for (let [i, elt] of enumerate(open)) {
      if (processed[i]) {
        // the component already is part of another loop
        continue
      }
      let start = i
      processed[i] = true
      let loop = [i]
      i = pairMapping[i]
      while (i != start) {
        processed[i] = true
        loop.push(i)
        i = pairMapping[i]
      }
      loops.push(loop)
    }

    // console.log('loops', loops)

    for (let loop of loops) {
      let components = []
      for (let id of loop) {
        components.push(open[id], connectors[id])
      }
      // console.log('components', components)
      closed.push(new ClosedCurve(new CompositeCurve(...components)))
    }

    let trueClosed = closed
      .filter((curve) => curve.closed && curve.closed())
      .map((curve) => new ClosedCurve(curve))

    let answer = nestClosedCurves(trueClosed).flat()

    return answer
  }

  clipDebug(bbox) {
    // TODO: filter out empty curves. note that this could split the main curve into multiple
    if (bbox.boxInside(this.bbox())) {
      // nothing to clip
      return [this]
    }
    let curveClip = this.curve.clipComponents(bbox)
    if (curveClip.length == 1 && curveClip[0].type == 'ClosedCurve') {
      // main curve was not clipped, so the minus curves are also preserved, the curve is not affected
      return [this]
    }
    let counterClockwise = this.counterClockwise()
    console.log('counterClockwise', counterClockwise)
    let components = counterClockwise.allComponents()
    console.log(
      'components',
      components.map((c) => c.type),
    )
    if (components.length > 0) {
      components = [components[0]]
    }
    // let minuses = [] // closed clipped versions of minus, these were not clipped at all
    // let elements = []
    // for (let minus of counterClockwise.minus) {
    //   let clip = curve.clip(bbox)
    //   if (clip.length == 1) {
    //     minuses.push(clip[0])
    //   }
    // }
    // let minuses = counterClockwise.minus.map((curve) => curve.clip(bbox)).flat()

    // let clipped = counterClockwise.curve.clip(bbox)
    // if (clipped.length == 1) {
    //   // main curve is completely inside the bbox,
    //   return [new ClosedCurve(clipped[0], minuses)]
    // }
    let bits = []
    // all the clipped components should have their endpoints on the perimeter of the bbox
    for (let component of components) {
      console.log('component', component)
      let clipped = component.clipComponents(bbox)
      console.log('clipped', clipped)
      bits.push(...clipped)
    }
    let debugClip = components[0].curve.curves
    let debugBits = components[0].curve.curves.map((curve) => curve.clip(bbox)).flat()
    let debugBits2 = components[0].curve.clip(bbox)

    // console.log('bits', bit)

    console.log(
      'bits',
      bits,
      debugBits,
      bits.map((b) => b.type),
      bits.map((b) => b.closed && b.closed()),
    )
    let closed = bits.filter((bit) => bit.closed && bit.closed())
    let closedBits = [...closed]
    let open = bits.filter((bit) => !(bit.closed && bit.closed()))
    let openBits = [...open]
    if (open.length + closed.length != bits.length) {
      throw `Open and closed curves don't add up ${closed.length} ${open.length} ${bits.length}`
    }

    // let startpoints = []
    // let endpoints = []
    let allpoints = []
    for (let [i, curve] of enumerate(open)) {
      // processed[i] = false
      console.log('open curve', open[i], open[i].startpoint(), open[i].endpoint())
      let start = bbox.perimeterPointT(open[i].startpoint())
      let end = bbox.perimeterPointT(open[i].endpoint())
      // startpoints.push([start, i])
      // endpoints.push([end, i])
      allpoints.push([start, i, 'start'], [end, i, 'end'])
    }
    // startpoints.sort(([a, aID], [b, bID]) => a - b)
    // endpoints.sort(([a, aID], [b, bID]) => a - b)
    allpoints.sort(([a, aid, at], [b, bid, bt]) => a - b)
    // console.log('start-end points', startpoints, endpoints)
    console.log('allpoints', allpoints)
    return {
      bits,
      components,
      debugBits,
      closed,
      closedBits,
      open,
      openBits,
      allpoints,
    }
    for (let [[a, aid, at], [b, bid, bt]] of pairs(allpoints)) {
      if (at == bt) {
        throw `Allpoints appear in non-alternating order`
      }
    }
    if (allpoints.length > 0 && allpoints[0][2] != 'end') {
      // if first element is not an 'end' (i.e. it is a start), move it to the end, so that the sequence always starts with 'end'
      // allpoints.push(allpoints[allpoints.length - 1]) // add first element to the end
      // allpoints.splice(0, 1) // remove first element ('start'), it now is at the end
      allpoints = [...allpoints.slice(1, allpoints.lenght - 1), allpoints[0]]
    }

    let pairMapping = {} // mapping from the id of the endpoint to the id of the startpoint
    let connectors = {}
    for (let [[a, aid, at], [b, bid, bt]] of pairs(allpoints)) {
      if (at != 'end') {
        continue // skip odd pairs
      }
      pairMapping[aid] = bid
      connectors[aid] = bbox.perimeterPath(a, b)
    }

    let loops = []
    let processed = {}
    for (let [i, elt] of enumerate(open)) {
      if (processed[i]) {
        // the component already is part of another loop
        continue
      }
      let start = i
      processed[i] = true
      let loop = [i]
      i = pairMapping[i]
      while (i != start) {
        processed[i] = true
        loop.push(i)
        i = pairMapping[i]
      }
      loops.push(loop)
    }

    console.log('loops', loops)
    for (let loop of loops) {
      let components = []
      for (let id of loop) {
        components.push(open[id], connectors[id])
      }
      console.log('components', components)
      closed.push(new ClosedCurve(new CompositeCurve(...components)))
    }

    let trueClosed = closed
      .filter((curve) => curve.closed && curve.closed())
      .map((curve) => new ClosedCurve(curve))

    let answer = nestClosedCurves(trueClosed).flat()
    // let answer = []

    return {
      answer,
      bits,
      closed,
      closedBits,
      openBits,
    }
  }

  d() {
    // this is to be displayed with fill-rule="evenodd", the clockwiseness of the curves doesn't matter. Triple nested minus curves will be filled
    let minusString = this.minus.map((m) => m.d()).join(' ')
    return this.curve.d() + ' ' + minusString
  }
}

// given an array of closed, non-intersecting curves, return an array of ClosedCurvesWithMinus,
// such that each closed curve appears in one of the trees, and they are properly nested
function nestClosedCurves(curves) {
  // let curves = continuousTruchetCurves.filter((curve) => curve.closed())
  if (curves.some((curve) => curve.type != 'ClosedCurve')) {
    throw `nestClosedCurves got non-closed element (${curves.map((curve) => curve.type)})`
  }
  // if (curves.some((curve) => !curve.closed())) {
  //   throw `nestClosedCurves got non-closed element`
  // }
  const t = 0.34 // t-value to check for inside-ness. This should be neither 0 nor 1 to avoid edge cases with inside floating point math
  let ancestors = {}
  let descendants = {}
  let children = {}
  let depth = {}
  for (let [i, c] of enumerate(curves)) {
    ancestors[i] = []
    descendants[i] = []
    children[i] = []
  }
  for (let [[a, curveA], [b, curveB]] of crossProduct(enumerate(curves))) {
    if (curveB.bbox().boxInside(curveA.bbox()) && curveB.inside(curveA.at(t))) {
      // get at 0.34 to not coincide with boundaries
      // curveA is a descendant of curveB
      descendants[b].push(a)
      ancestors[a].push(b)
    } else if (curveA.bbox().boxInside(curveB.bbox()) && curveA.inside(curveB.at(t))) {
      // get at 0.35 to not fall on a boundary
      // curveB is a descendant of curveA
      descendants[a].push(b)
      ancestors[b].push(a)
    }
  }

  for (let [i, curve] of enumerate(curves)) {
    if (ancestors[i].length > 0) {
      let depth = ancestors[i].length
      for (let j of ancestors[i]) {
        if (ancestors[j].length == depth - 1) {
          children[j].push(i)
        }
      }
    }
  }
  let closed = curves.map((curve) => new ClosedCurveWithMinus(curve, []))
  for (let [i, curve] of enumerate(closed)) {
    for (let childID of children[i]) {
      curve.minus.push(closed[childID])
    }
  }

  let topLevel = enumerate(closed)
    .filter(([i, curve]) => ancestors[i].length == 0)
    .map(([i, curve]) => curve)

  return topLevel
}

function rayLineRayCurve(r1, line, r2) {
  if (r1.type != 'Ray' || line.type != 'Line' || r2.type != 'Ray') {
    throw `RayLineRayCurve got unexpected arguments ${r1.type}, ${line.type}, ${r2.type}`
  }
  let r1LineT = r1.intersectLineT(line)
  let r2LineT = r2.intersectLineT(line)
  let r1r2T = r1.intersectRayT(r2)
  if (r1r2T == null) {
    // the two rays are parallel, or point in non-intersecting directions
  }
  if (r1LineT == null || r2LineT == null) {
    // the first ray doesn't intersect the line, they could be parallel, or the ray could be pointing in the wrong direction
    // return compositeQuadraticBezier({ point: r1.p, onCurve: true }, { point: r2.p, onCurve: true })

    const secondPointDistance = 1.6
    return compositeQuadraticBezier(
      { point: r1.p, onCurve: true },
      { point: r1.at(1), onCurve: false },
      { point: line.projectPoint(r1.at(secondPointDistance)), onCurve: false },
      { point: line.projectPoint(r2.at(secondPointDistance)), onCurve: false },
      { point: r2.at(1), onCurve: false },
      { point: r2.p, onCurve: true },
    )
  }
  if (r1r2T != null && r1LineT != null && r1LineT > r1r2T) {
    // the intersection of the rays is closer, so do a simple quadratic curve between them
    return compositeQuadraticBezier(
      { point: r1.p, onCurve: true },
      { point: r1.at(r1r2T), onCurve: false },
      { point: r2.p, onCurve: true },
    )
  }
  return compositeQuadraticBezier(
    { point: r1.p, onCurve: true },
    { point: r1.at(r1LineT), onCurve: false },
    { point: r2.at(r2LineT), onCurve: false },
    { point: r2.p, onCurve: true },
  )
}

function compositeQuadraticBezier(...pointsWithTags) {
  if (pointsWithTags.length == 0) {
    // pointsWithTags = []
    return
  }
  for (let pt of pointsWithTags) {
    if (pt.point.type != 'Point') {
      throw `compositeQuadraticBezier got point with unexpected type ${pt.point.type}`
    }
  }
  if (!pointsWithTags[0].onCurve || !pointsWithTags[pointsWithTags.length - 1].onCurve) {
    throw `CompositeQuadraticBezier with first or last point not on curve ${pointsWithTags[0].onCurve}, ${pointsWithTags[pointsWithTags.length - 1].onCurve}`
  }
  // process the list of points so that there would be at most one not-on-curve point in sequence
  // this is accomplished by adding midpoints between any two not-on-curve points
  let newList = []
  for (let [a, b] of pairs(pointsWithTags)) {
    if (!a.onCurve && !b.onCurve) {
      newList.push(a)
      newList.push({ point: a.point.midpoint(b.point) })
    } else {
      newList.push(a)
    }
  }
  newList.push(pointsWithTags[pointsWithTags.length - 1])
  // return newList
  pointsWithTags = newList
  let components = new CompositeCurve()
  let start = pointsWithTags[0].point
  let idx = 1
  while (idx < pointsWithTags.length) {
    if (pointsWithTags[idx].onCurve) {
      components.add(new StraightStroke(start, pointsWithTags[idx].point))
      start = pointsWithTags[idx].point
      idx += 1
    } else {
      // point at idx is not on line, but then point at idx+1 is guaranteed to be on line
      components.add(
        new QuadraticBezier(start, pointsWithTags[idx].point, pointsWithTags[idx + 1].point),
      )
      start = pointsWithTags[idx + 1].point
      idx += 2
    }
  }
  return components
}

// Polygon is a wrapper around CompositeCurve for when we have a polygon around a set of points
class Polygon {
  constructor(...points) {
    for (let pt of points) {
      if (pt.type != 'Point') {
        throw `Polygon received unexpected argument ${pt.type}`
      }
    }
    this.points = points
    this.type = 'Polygon'
  }

  d() {
    let components = new CompositeCurve()
    for (let i = 0; i < this.points.length; i++) {
      components.add(new StraightStroke(this.points[i], this.points[(i + 1) % this.points.length]))
    }
    return components.d()
  }

  midpoint() {
    let x = 0
    let y = 0
    let n = this.points.length
    for (let pt of this.points) {
      x += pt.x
      y += pt.y
    }
    return new Point(x / n, y / n)
  }

  transform2D(matrix) {
    if (matrix.type != 'Matrix2DHomo') {
      throw `Polygon.transform2D got unexpected argument ${matrix.type}`
    }
    return new Polygon(...this.points.map((point) => matrix.multPt(point)))
  }
}

class CurveSet {
  constructor(curves) {
    this.curves = curves // map from square coordinate to list of curves (line, ends)
  }

  get(coord, edge) {
    for (let { curve: line, ends } of this.curves[coord]) {
      if (ends.includes(edge)) {
        if (edge === ends[1]) {
          return [line.reverse(), ends[0]]
        } else {
          return [line, ends[1]]
        }
      }
    }
    return [null, null]
  }
}

export {
  StraightStroke,
  QuadraticBezier,
  CubicBezier,
  CircleArc,
  CompositeCurve,
  ClosedCurve,
  ClosedCurveWithMinus,
  CurveSet,
  Polygon,
  rayLineRayCurve,
  compositeQuadraticBezier,
  nestClosedCurves,
}
