import { pairs, reduceIntervals, enumerate, crossProduct } from '/js/utils.js'
import { Point, Vector, Line, Point2DOrigin } from '/js/geometry.js'
import { average, quadratic, cubic } from '/js/math.js'
import { BBox, bboxFromPointCloud } from '/js/bbox.js'

const THRESHOLD = 1 // used to determine the length of Bezier curves
const DELTA_DERIVATIVE = 0.01

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
    // console.log('CompositeCurve args', args)
    // console.trace()
    for (let curve of args) {
      if (
        ![
          'StraightStroke',
          'QuadraticBezier',
          'CubicBezier',
          'CompositeCurve',
          'MetaFragment',
        ].includes(curve.type)
      ) {
        console.trace()
        throw `CompositeCurve got unexpected argument ${curve.type}`
      }
      if (curve.type == 'CompositeCurve') {
        if ('meta' in curve) {
          curve.curves.forEach((c) => (c.meta = curve.meta)) // TODO: merge metas
        }
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
    // console.log('adding curve', curve)
    if (!curve.startpoint().same(this.curves[this.curves.length - 1].endpoint())) {
      console.trace()
      throw `Adding a new curve that is not continuous ${curve.repr()}`
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
    // let lines = [new Line(pt, new Vector(1, 0)), new Line(pt, new Vector(0, 1))]
    let lines = [0, 1].map((n) => new Line(pt, new Vector(1, 0).rotateDeg(180 * Math.random()))) // temporary solution, randomly rotate the rays
    let lengths = lines.map(
      (line) => [...new Set(this.intersectLineU(line).filter((t) => t > 0))].length,
    )
    let parities = lengths.map((l) => l % 2 == 1)
    let allEqual = parities.every((p) => p === parities[0])
    if (!allEqual) {
      console.warn(`CompositeCurve.inside got ambiguous results`, lengths)
      throw `CompositeCureve.inside got ambiguous results`
    }
    // let intersections = this.intersectLineU(line)
    // intersections = intersections.filter((t) => t > 0)
    // intersections = [...new Set(intersections)]
    return parities[0]
  }

  // return whether the curve is closed, i.e. it is continuous and its start and end points are connected
  closed() {
    return this.startpoint().same(this.endpoint())
  }

  isEmpty() {
    return this.curves.length == 0
  }

  move(v) {
    return new CompositeCurve(...this.curves.map((curve) => curve.move(v)))
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
    // console.log('this.curves', this.curves)
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

  // return a string representation of this curve, so that it can be plugged back into code to get an equivalent curve
  repr() {
    // console.log('this.curves', this.curves)
    return `new CompositeCurve(${this.curves.map((curve) => curve.repr()).join(', ')})`
  }
}

export { CompositeCurve }
