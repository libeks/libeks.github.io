import { pairs, reduceIntervals, enumerate, crossProduct } from '/js/utils.js'
import { Point, Vector, Line, Point2DOrigin } from '/js/geometry.js'
import { StraightStroke } from '/js/lines/straight-stroke.js'
import { QuadraticBezier } from '/js/lines/quadratic-bezier.js'
import { CubicBezier } from '/js/lines/cubic-bezier.js'
import { CircleArc } from '/js/lines/circle-arc.js'
import { CompositeCurve } from '/js/lines/composite-curve.js'
import { ClosedCurve } from '/js/lines/closed-curve.js'
import { ClosedCurveWithMinus } from '/js/lines/closed-curve-with-minus.js'
import { MetaFragment } from '/js/lines/meta-fragment.js'

// given an array of closed, non-intersecting curves, return an array of ClosedCurvesWithMinus,
// such that each closed curve appears in one of the trees, and they are properly nested
function nestClosedCurves(curves) {
  if (curves.length == 0) {
    return []
  }
  if (curves.some((curve) => curve.type != 'ClosedCurve')) {
    throw `nestClosedCurves got non-closed element (${curves.map((curve) => curve.type)})`
  }
  if (curves.some((curve) => !curve.closed())) {
    throw `nestClosedCurves got non-closed element`
  }
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
    if (curveA.id == '78.0') {
      let abox = curveA.bbox()
      let bbox = curveB.bbox()
    }
    let ptA = curveA.at(t)
    let ptB = curveB.at(t)
    if (curveB.bbox().inside(ptA) && curveB.inside(ptA)) {
      // get at 0.34 to not coincide with boundaries
      // curveA is a descendant of curveB
      descendants[b].push(a)
      ancestors[a].push(b)
    } else if (curveA.bbox().inside(ptB) && curveA.inside(ptB)) {
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

// return a curve that starts and ends with a ray, and touches the line in the middle
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

    let endpointDistance = r1.p.distance(r2.p)
    // console.log('endpointDistance', endpointDistance, r1.v.len())

    let secondPointDistance = endpointDistance / (3 * r1.v.len())
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
  MetaFragment,
}
