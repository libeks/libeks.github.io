const THRESHOLD = 0.01

class Point {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.type = 'Point'
  }

  addVect(v) {
    return new Point(this.x + v.x, this.y + v.y)
  }

  d(x, y) {
    // shorthand for .addVect(new Vector(x,y))
    return new Point(this.x + x, this.y + y)
  }

  subPt(p) {
    return new Vector(this.x - p.x, this.y - p.y)
  }

  vectTo(p) {
    // more intuitive than subPt, gives a vector from this point to the other point
    return p.subPt(this)
  }

  distance(p) {
    return this.subPt(p).len()
  }

  string() {
    return `${this.x} ${this.y}`
  }

  // return the midpoint between two points
  midpoint(p) {
    return this.towards(p, 1 / 2)
  }

  // from this point towards p, travel t of the distance
  towards(p, t) {
    return this.addVect(p.subPt(this).mult(t))
  }

  // returns true if the two points are close enough, within tolerance
  same(p) {
    return this.distance(p) < THRESHOLD
  }

  display() {
    // to display for human readability on the screen, with one decimal digit
    return `(${this.x.toFixed(1)}, ${this.y.toFixed(1)})`
  }

  // when needed for cx and cy props (usually <cricle> element)
  cxcyProps() {
    return { cx: this.x, cy: this.y }
  }

  // when needed for x and y props (like <text> element, etc)
  xyProps() {
    return { x: this.x, y: this.y }
  }
}

class Vector {
  constructor(x, y) {
    this.x = x
    this.y = y
  }

  len() {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  add(v) {
    return new Vector(this.x + v.x, this.y + v.y)
  }

  mult(t) {
    // return the vector scaled by scalar t
    if (t == 1) {
      return this
    }
    return new Vector(this.x * t, this.y * t)
  }

  dot(v) {
    return this.x * v.x + this.y * v.y
  }

  unit() {
    // return a vector pointing in the same direction, but of length 1
    if (this.x == 0 && this.y == 0) {
      // degenerate case, return nil vector
      return this
    }
    return this.mult(1 / this.len())
  }

  angle() {
    // return the angle from 0-x, counterclockwise, in degrees
    throw 'Unimplemented'
  }

  rotate(angle) {
    // rotate the vector by angle in degrees, counterclockwise
    const radians = (2 * Math.PI * angle) / 360
    const cos = Math.cos(radians)
    const sin = Math.sin(radians)
    const ret = new Vector(cos * this.x + sin * this.y, -sin * this.x + cos * this.y)
    return ret
  }

  // do the two vectors point in the same direction?
  // I wonder whether this is the rigth approach, should I measure the angle instead?
  sameDirection(v) {
    u1 = this.unit()
    u2 = v.unit()
    return u1.add(u2.mult(-1)).len() < THRESHOLD
  }

  same(v) {
    return this.sameDirection(v) && Math.abs(this.len() - v.len()) < THRESHOLD
  }
}

// a line
class Line {
  constructor(p, v) {
    this.p = p
    this.v = v
  }

  at(t) {
    return this.p.addVect(this.v.mult(t))
  }

  // intersect another line, or null if they're parallel
  // from https://github.com/libeks/go-plotter-svg/blob/main/lines/line.go
  // and https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection
  intersectT(l) {
    const x1x2 = -this.v.x
    const x3x4 = -l.v.x
    const y1y2 = -this.v.y
    const y3y4 = -l.v.y
    const x1x3 = this.p.x - l.p.x
    const y1y3 = this.p.y - l.p.y

    const divisor = x1x2 * y3y4 - y1y2 * x3x4
    if (divisor == 0) {
      return null
    }
    return (x1x3 * y3y4 - y1y3 * x3x4) / divisor
  }

  intersect(l) {
    const t = this.intersectT(l)
    if (t === null) {
      return null
    }
    return this.at(t)
  }
}

export { Point, Vector, Line }
