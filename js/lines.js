import { pairs } from '/js/utils.js'
import { Point, Line, Point2DOrigin } from '/js/geometry.js'
import { average, quadratic, cubic } from '/js/math.js'
import { BBox, bboxFromPointCloud } from '/js/bbox.js'

const THRESHOLD = 1 // used to determine the length of Bezier curves

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

  // strip off px off of each end of the Line
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
    ts.sort()
    for (let [a, b] of pairs(ts)) {
      let midpoint = average(a, b)
      if (bbox.inside(this.at(midpoint))) {
        return [new StraightStroke(this.at(a), this.at(b))]
      }
    }
    return []
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
    // console.log('quadratic roots', ts)

    if (ts.length == 0) {
      // appears that the bezier doesn't intersect the boundary of the box
      return []
    }
    ts.push(0, 1)
    ts.sort()
    for (let [a, b] of pairs(ts)) {
      // TODO: allow for subsequent sections to be consecutive
      let midpoint = average(a, b)
      if (bbox.inside(this.at(midpoint))) {
        return [this.subsection(a, b)]
      }
    }
    return []
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
    // console.losg('cubic roots', ts)

    if (ts.length == 0) {
      // appears that the bezier doesn't intersect the boundary of the box
      return []
    }
    ts.push(0, 1)
    ts.sort()
    for (let [a, b] of pairs(ts)) {
      // TODO: allow for subsequent sections to be consecutive
      let midpoint = average(a, b)
      if (bbox.inside(this.at(midpoint))) {
        return [this.subsection(a, b)]
      }
    }
    return []
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
  constructor(...args) {
    for (let [a, b] of pairs(args)) {
      if (!a.endpoint().same(b.startpoint())) {
        throw `Composite Curve called with non-connected segments`
      }
    }
    for (let curve of args) {
      if (
        !['StraightStroke', 'QuadraticBezier', 'CubicBezier', 'CompositeCurve'].includes(curve.type)
      ) {
        console.trace()
        throw `CompositeCurve got unexpected argument ${curve.type}`
      }
    }
    this.curves = args
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
    this.curves.push(curve)
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

  // // return whether the current curve is continuous (except for endpoints)
  // continuous() {
  //   if (this.curves.length < 2) {
  //     // trivially true, including the empty case
  //     return true
  //   }
  //   for (let i = 1; i < this.curves.length; i++) {
  //     if (!this.curves[i - 1].endpoint().same(this.curves[i].startpoint())) {
  //       return false
  //     }
  //   }
  //   return true
  // }

  // return whether the curve is closed, i.e. it is continuous and its start and end points are connected
  closed() {
    // if (!this.continuous()) {
    //   return false
    // }
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
    let clipped = []
    for (let component of this.curves) {
      let result = component.clip(bbox)
      clipped.push(...result)
    }
    // join continuous elements back together
    if (clipped.length == 0) {
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
        if (current.type == 'CompositeCurve') {
          current.add(elt)
        } else {
          current = new CompositeCurve(current, elt)
        }
      } else {
        joined.push(current)
        current = elt
      }
    }
    if (current != null) {
      joined.push(current)
    }
    return joined // the result will be a list of curves, each disjoint
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
    let reversed = this.curves.toReversed().map((curve) => curve.reverse())
    return new CompositeCurve(...reversed)
  }

  bbox() {
    if (this.curves.length == 0) {
      return new BBox(0, 0, 0, 0)
    }
    let bbox = this.curves[0]
    for (let i = 1; i < this.curves.length; i++) {
      bbox = bbox.add(this.curves[i].bbox())
    }
    return bbox
  }
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
  CurveSet,
  Polygon,
  rayLineRayCurve,
  compositeQuadraticBezier,
}
