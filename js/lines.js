import { pairs } from '/js/utils.js'
import { Point, Line } from '/js/geometry.js'
import { average } from '/js/math.js'
import { BBox, bboxFromPointCloud } from '/js/bbox.js'

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
    // throw `QuadraticBezier.clip not implemented`
    if (!bbox.boxHasIntersection(this.bbox())) {
      return []
    }
    return [this]
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

  // if the original line goes from t=[0,1], return a new line that goes from t=[from, to]
  subsection(from, to) {
    // p0 := c.Start
    // p1 := c.End
    // a1 := LineChunk{Start: c.Start, End: c.P1}.At(t)
    // a2 := LineChunk{Start: c.P1, End: c.End}.At(t)
    // b1 := LineChunk{Start: a1, End: a2}.At(t)
    // return QuadraticBezierChunk{Start: p0, P1: a1, End: b1}, QuadraticBezierChunk{Start: b1, P1: a2, End: p1}

    let start = this.at(from)
    let end = this.at(to)

    let a1 = new StraightStroke(this.from, this.c1).at(t)
    let a2 = new StraightStroke(this.c1, this.to).at(t)
    let b1 = new StraightStroke(a1, a2).at(t)

    // let a1 = new StraightStroke(this.from, this.c1).at(t)
    // let a2 = new StraightStroke(this.c1, this.to).at(t)
    // let b1 = new StraightStroke(a1, a2).at(t)
    // return new QuadraticBezier(this.from, a1, b1)
    return new QuadraticBezier(start, b1, end)
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

  clip(bbox) {
    // throw `CubicBezier.clip not implemented`
    if (!bbox.boxHasIntersection(this.bbox())) {
      return []
    }
    return [this]
  }

  bbox() {
    return bboxFromPointCloud(this.from, this.c1, this.c2, this.to)
  }

  at(t) {
    let a1 = StraightStroke(this.from, this.c1).at(t)
    let a2 = StraightStroke(this.c1, this.c2).at(t)
    let a3 = StraightStroke(this.c2, this.to).at(t)

    let b1 = StraightStroke(a1, a2).at(t)
    let b2 = StraightStroke(a2, a3).at(t)
    return new StraightStroke(b1, b2).at(t)
  }

  // if the original line goes from t=[0,1], return a new line that goes from t=[from, to]
  subsection(from, to) {
    let start = this.at(from)
    let end = this.at(to)

    let a1 = new StraightStroke(this.from, this.c1).at(t)
    let a2 = new StraightStroke(this.c1, this.c2).at(t)
    let a3 = new StraightStroke(this.c2, this.to).at(t)
    let b1 = new StraightStroke(a1, a2).at(t)
    let b2 = new StraightStroke(a2, a3).at(t)

    // let a1 = new StraightStroke(this.from, this.c1).at(t)
    // let a2 = new StraightStroke(this.c1, this.to).at(t)
    // let b1 = new StraightStroke(a1, a2).at(t)
    // return new QuadraticBezier(this.from, a1, b1)
    return new CubicBezier(start, b1, b2, end)
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
    this.curves = args
    this.type = 'CompositeCurve'
  }

  withColor(color) {
    this.color = color
    return this
  }

  add(curve) {
    if (
      this.curves.length > 0 &&
      !curve.startpoint().same(this.curves[this.curves.length - 1].endpoint())
    ) {
      console.trace()
      throw `Adding a new curve that is not continuous ${curve.d()}`
    }
    this.curves.push(curve)
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

  // return whether the current curve is continuous (except for endpoints)
  continuous() {
    if (this.curves.length < 2) {
      // trivially true, including the empty case
      return true
    }
    for (let i = 1; i < this.curves.length; i++) {
      if (!this.curves[i - 1].endpoint().same(this.curves[i].startpoint())) {
        return false
      }
    }
    return true
  }

  // return whether the curve is closed, i.e. it is continuous and its start and end points are connected
  closed() {
    if (!this.continuous()) {
      return false
    }
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
    return clipped // the result will NOT be a CompositeCurve, since the segments will no longer be guaranteed to be connected
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
