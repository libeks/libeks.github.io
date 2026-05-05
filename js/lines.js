import { pairs } from '/js/utils.js'

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

  dContinued() {
    // when rendering a sequence of strokes, skip the MOVE operation
    return `L ${this.to.string()}`
  }

  d() {
    return `M ${this.from.string()} ${this.dContinued()}`
  }

  move(v) {
    // move the stroke by a vector v
    return new StraightStroke(this.from.addVect(v), this.to.addVect(v))
  }

  contour() {
    return this
  }

  transform2D(matrix) {
    if (matrix.type != 'Matrix2DHomo') {
      throw `StraightStroke.transform2D got unexpected argument ${matrix.type}`
    }
    return new StraightStroke(matrix.multPoint(this.from), matrix.multPoint(this.to))
  }
}

class QuadraticBezier {
  constructor(from, c1, to) {
    this.from = from
    this.c1 = c1
    this.to = to
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

  dContinued() {
    // when rendering a sequence of strokes, skip the MOVE operation
    return `Q ${this.c1.string()} ${this.to.string()}`
  }

  d() {
    return `M ${this.from.string()} ${this.dContinued()}`
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

  dContinued() {
    // when rendering a sequence of strokes, skip the MOVE operation
    return `C ${this.c1.string()} ${this.c2.string()} ${this.to.string()}`
  }

  d() {
    return `M ${this.from.string()} ${this.dContinued()}`
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

  d() {
    return `M ${this.from.string()} ${this.dContinued()}`
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
}

class CompositeCurve {
  constructor(...args) {
    this.curves = args
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
    if (this.curves.lenght == 0) {
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
}

// class RayLineRayCurve {
//   // a curve defined by two rays, with a line in between
//   constructor(r1, line, r2) {
//     if (r1.type != 'Ray' || line.type != 'Line' || r2.type != 'Ray') {
//       throw `RayLineRayCurve got unexpected arguments ${r1.type}, ${line.type}, ${r2.type}`
//     }
//     this.r1 = r1
//     this.line = line
//     this.r2 = r2
//   }

//   d() {
//     let r1LineT = this.r1.intersectLineT(this.line)
//     let r2LineT = this.r2.intersectLineT(this.line)
//     let r1r2T = this.r1.intersectRayT(this.r2)
//     if (r1r2T == null) {
//       // the two rays are parallel, or point in non-intersecting directions
//     }
//     if (r1LineT == null) {
//       // the first ray doesn't intersect the line, they could be parallel, or the ray could be pointing in the wrong direction
//     }
//     if (r1LineT > r1r2T) {
//       // the intersection of the rays is closer, so do a simple quadratic curve between them
//       return new CompositeQuadraticBezier(
//         { point: this.r1.p, onCurve: true },
//         { point: this.r1.at(r1r2T), onCurve: false },
//         { point: this.r2.p, onCurve: true },
//       ).d()
//     }
//     return new CompositeQuadraticBezier(
//       { point: this.r1.p, onCurve: true },
//       { point: this.r1.at(r1LineT), onCurve: false },
//       { point: this.r2.at(r2LineT), onCurve: false },
//       { point: this.r2.p, onCurve: true },
//     )
//   }
// }

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
  if (r1LineT == null) {
    // the first ray doesn't intersect the line, they could be parallel, or the ray could be pointing in the wrong direction
  }
  if (r1LineT > r1r2T) {
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

// class CompositeQuadraticBezier {
//   // a composite curve of lines and quadratic beziers in between a set of points, each of which is either on or off the curve
//   // this is very similar to the TrueType curve specification
//   constructor(...pointsWithTags) {
//     // each point with tags is an object of {point:Point, onCurve:bool}
//     if (pointsWithTags.length == 0) {
//       this.pointsWithTags = []
//       return
//     }
//     if (!pointsWithTags[0].onCurve || !pointsWithTags[pointsWithTags.length - 1].onCurve) {
//       throw `CompositeQuadraticBezier with first or last point not on curve ${pointsWithTags[0].onCurve}, ${pointsWithTags[pointsWithTags.length - 1].onCurve}`
//     }
//     this.pointsWithTags = CompositeQuadraticBezier.insertMidpoints(pointsWithTags)
//   }

//   static insertMidpoints(points) {
//     // process the list of points so that there would be at most one not-on-curve point in sequence
//     // this is accomplished by adding midpoints between any two not-on-curve points
//     let newList = []
//     for (let [a, b] of pairs(points)) {
//       if (!a.onCurve && !b.onCurve) {
//         newList.push(a)
//         newList.push({ point: a.point.midpoint(b.point) })
//       } else {
//         newList.push(a)
//       }
//     }
//     newList.push(points[points.length - 1])
//     return newList
//   }

//   d() {
//     // assume that insertMidpoints has been run, i.e. that no two subsequent points are not-on-curve
//     let components = new CompositeCurve()
//     let start = this.pointsWithTags[0].point
//     let idx = 1
//     while (idx < this.pointsWithTags.length) {
//       if (this.pointsWithTags[idx].onCurve) {
//         components.add(new StraightStroke(start, this.pointsWithTags[idx].point))
//         start = this.pointsWithTags[idx].point
//         idx += 1
//       } else {
//         // point at idx is not on line, but then point at idx+1 is guaranteed to be on line
//         components.add(
//           new QuadraticBezier(
//             start,
//             this.pointsWithTags[idx].point,
//             this.pointsWithTags[idx + 1].point,
//           ),
//         )
//         start = this.pointsWithTags[idx + 1].point
//         idx += 2
//       }
//     }
//     return components.d()
//   }
// }

function compositeQuadraticBezier(...pointsWithTags) {
  if (pointsWithTags.length == 0) {
    // pointsWithTags = []
    return
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
  constructor(points) {
    this.points = points
  }

  d() {
    let components = new CompositeCurve()
    for (let i = 0; i < this.points.length; i++) {
      components.add(new StraightStroke(this.points[i], this.points[(i + 1) % this.points.length]))
    }
    return components.d()
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
