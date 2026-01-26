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

  string() {
    return `${this.x} ${this.y}`
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
    throw 'Unimplemented'
  }
}

export { Point, Vector }
