const THRESHOLD = 0.1

class Point {
  constructor(x, y) {
    this.x = x
    this.y = y
  }

  addVect(v) {
    // console.log("adding vector to point", this, v)
    return new Point(this.x + v.x, this.y + v.y)
  }

  subPt(p) {
    return new Vector(this.x - p.x, this.y - p.y)
  }

  distance(p) {
    return this.subPt(p).len()
  }

  string() {
    return `${this.x} ${this.y}`
  }

  // returns true if the two points are close enough, within tolerance
  same(p) {
    return this.distance(p) < THRESHOLD
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
    // console.log("rotating", this, "by angle", angle, radians)
    const cos = Math.cos(radians)
    const sin = Math.sin(radians)
    // console.log(cos, sin)
    const ret = new Vector(cos * this.x + sin * this.y, -sin * this.x + cos * this.y)
    // console.log(ret)
    return ret
  }
}

export { Point, Vector }
