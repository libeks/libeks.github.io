import { pairs, reduceIntervals, enumerate, crossProduct, reversed } from '/js/utils.js'
import { Point, Vector, Line, Point2DOrigin } from '/js/geometry.js'
import { average, quadratic, cubic } from '/js/math.js'
import { BBox, bboxFromPointCloud } from '/js/bbox.js'
import { StraightStroke } from '/js/lines/straight-stroke.js'
import { ClosedCurve } from '/js/lines/closed-curve.js'
import { CompositeCurve } from '/js/lines/composite-curve.js'
import { nestClosedCurves, MetaFragment } from '/js/lines.js'

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

  move(v) {
    return new ClosedCurveWithMinus(
      this.curve.move(v),
      this.minus.map((curve) => curve.move(v)),
    )
  }

  length() {
    console.log('this.curve', this.curve)
    let sum = this.curve.length()
    for (let chunk of this.minus) {
      console.log('chunk', chunk)
      sum += chunk.length()
    }
    return sum
  }

  // return a copy of the curve that is counter-clockwise, including all of the minuses being clockwise
  counterClockwise() {
    let minuses = this.minus.map((minus) => minus.clockwise())
    let ret = new ClosedCurveWithMinus(this.curve.counterClockwise(), minuses)
    if (this.id) {
      ret.id = this.id
    }
    return ret
  }

  clockwise() {
    let minuses = this.minus.map((minus) => minus.counterClockwise()) // minuses need to oriented in reverse, i.e. clounter clockwise
    let ret = new ClosedCurveWithMinus(this.curve.clockwise(), minuses)
    if (this.id) {
      ret.id = this.id
    }
    return ret
  }

  // gather all of the closed curves together, walking through the full minus-tree of this component
  allComponents() {
    let components = [this.curve]
    for (let minus of this.minus) {
      components.push(...minus.allComponents())
    }
    return components
  }

  contour() {
    return this.allComponents()
      .map((curve) => curve.contour())
      .flat()
  }

  // fill fills the closed curve with parallel lines, all at 'directionDeg' angle (degrees)
  fillWide(gap, directionDeg) {
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
    let min = Math.ceil(tValues[0]) // round up to an integer
    for (let i = min; i < tValues[tValues.length - 1]; i++) {
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
      if (i % 2 == 0) {
        // reverse even lines so the fill follows a back-and-forth pattern
        intervals = reversed(intervals.map((int) => int.reverse()))
      }
      for (let [t1, t2] of intervals) {
        let p1 = line.at(t1)
        let p2 = line.at(t2)
        lines.push(new StraightStroke(p1, p2))
      }
    }
    return lines
  }

  // fill fills the closed curve with parallel lines, all at 'directionDeg' angle (degrees)
  // it is 'conservative' in that it models the line as a rectangle, and only returns rectangles that are fully inside the curve
  fill(gap, directionDeg) {
    // console.log('fillConservative')
    const ratio = 0.8 // ratio of the width of the rectangle to the gap
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
    let min = Math.ceil(tValues[0]) // round up to an integer
    for (let i = min; i < tValues[tValues.length - 1]; i++) {
      let a = i - ratio / 2
      let b = i + ratio / 2
      let line = new Line(perpLine.at(i), vect)
      let lineA = new Line(perpLine.at(a), vect)
      let lineB = new Line(perpLine.at(b), vect)
      let tvalues = []
      for (let curve of allCurves) {
        tvalues.push(...curve.intersectLineU(lineA))
        tvalues.push(...curve.intersectLineU(lineB))
      }
      tvalues.sort((a, b) => a - b)
      let intervals = reduceIntervals(tvalues, (t) => {
        let midpointA = lineA.at(t)
        let midpointB = lineB.at(t)
        return (
          this.curve.inside(midpointA) &&
          this.curve.inside(midpointB) &&
          !this.minus.some((c) => c.inside(midpointA)) &&
          !this.minus.some((c) => c.inside(midpointB))
        )
      })
      if (i % 2 == 0) {
        // reverse even lines so the fill follows a back-and-forth pattern
        intervals = reversed(intervals.map((int) => int.reverse()))
      }
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
    // let counterClockwise = this
    let components = counterClockwise.allComponents()
    // console.log('components', components)

    let bits = []
    // all the clipped components should have their endpoints on the perimeter of the bbox
    for (let component of components) {
      let clipped = component.clipComponents(bbox)
      // console.log('pushing to bits', clipped)
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
    // console.log('open', open)
    for (let [i, curve] of enumerate(open)) {
      // processed[i] = false
      // console.log('open curve', open[i], open[i].startpoint(), open[i].endpoint())
      // console.log('this.repr', this.repr(), bbox)
      // console.log('perimeter point for', i, curve)
      let start = bbox.perimeterPointT(open[i].startpoint())
      let end = bbox.perimeterPointT(open[i].endpoint())
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
        console.log('this', this, this.repr())
        console.log('allpoints', allpoints)
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
      let perimeter = new MetaFragment(bbox.perimeterPath(a, b)).withMeta({
        isConnector: true,
        type: 'framePerimeter',
      })
      connectors[aid] = perimeter
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
    if (this.id) {
      enumerate(trueClosed).forEach(([id, curve]) => (curve.id = `${this.id}.${id}`))
    }

    // for (let a of trueClosed) {
    //   // console.log('aaa', a.curve.curves[0])
    //   if (
    //     a.curve.curves[0].type == 'CubicBezier' &&
    //     a.curve.curves[0].from.x == 1466.4999999999986
    //   ) {
    //     // console.log('match', this, this.repr())
    //   }
    // }
    // if (this.id == '78') {
    //   console.log('trueClosed', trueClosed)
    // }
    let answer = nestClosedCurves(trueClosed).flat()
    // if (this.id == '78') {
    //   console.log('answer', answer)
    // }
    if (this.id) {
      enumerate(answer).forEach(([id, curve]) => (curve.id = `${this.id}.${id}`))
    }

    return answer
  }

  clipDebug(bbox) {
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
    // console.log('counterClockwise', counterClockwise)
    let components = counterClockwise.allComponents()
    // console.log(
    //   'components',
    //   components.map((c) => c.type),
    // )
    // if (components.length > 0) {
    //   components = [components[0]]
    // }
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
      // console.log('component', component)
      let clipped = component.clipComponents(bbox)
      // console.log('clipped', clipped)
      bits.push(...clipped)
    }
    let debugClip = components[0].curve.curves
    let debugBits = components[0].curve.curves.map((curve) => curve.clip(bbox)).flat()
    let debugBits2 = components[0].curve.clip(bbox)

    // console.log('bits', bit)

    // console.log(
    //   'bits',
    //   bits,
    //   debugBits,
    //   bits.map((b) => b.type),
    //   bits.map((b) => b.closed && b.closed()),
    // )
    let closed = bits.filter((bit) => bit.closed && bit.closed())
    let closedBits = [...closed]
    let open = bits.filter((bit) => !(bit.closed && bit.closed()))
    let openBits = [...open]
    if (open.length + closed.length != bits.length) {
      throw `Open and closed curves don't add up ${closed.length} ${open.length} ${bits.length}`
    }
    // return {
    //   bits,
    //   components,
    //   // debugBits,
    //   closed,
    //   closedBits,
    //   open,
    //   openBits,
    //   // allpoints,
    // }

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
    // console.log('allpoints', allpoints)
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

  // return the boundary curve of this curve, with box perimeter connectors removed
  boundaryCurve() {
    let curves = this.allComponents()
    return curves.map((curve) => curve.boundaryCurve()).flat()
  }

  // return a string representation of this curve, so that it can be plugged back into code to get an equivalent curve
  repr() {
    return `new ClosedCurveWithMinus(${this.curve.repr()}, [${this.minus.map((curve) => curve.repr()).join(', ')}])`
  }

  d() {
    // this is to be displayed with fill-rule="evenodd", the clockwiseness of the curves doesn't matter. Triple nested minus curves will be filled
    let minusString = this.minus.map((m) => m.d()).join(' ')
    return this.curve.d() + ' ' + minusString
  }
}

export { ClosedCurveWithMinus }
