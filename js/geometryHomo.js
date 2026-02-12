import { Point3D, Vector3D } from './geometry3D.js'

const THRESHOLD = 0.01

class PointHomo {
  constructor(x, y, z, t) {
    this.x = x
    this.y = y
    this.z = z
    this.t = t
    this.type = 'PointHomo'
  }

  addVect(v) {
    return new PointHomo(this.x + v.x, this.y + v.y, this.z + v.z, this.t + v.t)
  }

  subPt(p) {
    return new VectorHomo(this.x - p.x, this.y - p.y, this.z - p.z, this.t - p.t)
  }

  vectTo(p) {
    // more intuitive than subPt, gives a vector from this point to the other point
    return p.subPt(this)
  }

  distance(p) {
    return this.subPt(p).len()
  }

  string() {
    return `${this.x} ${this.y} ${this.z} ${this.t}`
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

  to3D() {
    const v = PointHomoOrigin.vectTo(this)
    const scaled = v.mult(1 / v.len())
    const ret = new Point3D(scaled.x, scaled.y, scaled.z)
    return ret
  }

  display() {
    // to display for human readability on the screen, with one decimal digit
    return `(${this.x.toFixed(1)}, ${this.y.toFixed(1)}, ${this.z.toFixed(1)} ,${this.t.toFixed(1)} )`
  }
}

const PointHomoOrigin = new PointHomo(0, 0, 0, 1)

class VectorHomo {
  constructor(x, y, z, t) {
    this.x = x
    this.y = y
    this.z = z
    this.t = t
  }

  len() {
    return Math.sqrt(this.dot(this))
  }

  add(v) {
    return new VectorHomo(this.x + v.x, this.y + v.y, this.z + v.z, this.t + v.t)
  }

  mult(t) {
    // return the vector scaled by scalar t
    if (t == 1) {
      return this
    }
    return new VectorHomo(this.x * t, this.y * t, this.z * t, this.t * t)
  }

  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z + this.t * v.t
  }

  unit() {
    // return a vector pointing in the same direction, but of length 1
    if (this.len() == 0) {
      // degenerate case, return nil vector
      return this
    }
    return this.mult(1 / this.len())
  }

  to3D() {
    const scaled = this.mult(1 / this.t)
    const ret = new Vector3D(scaled.x, scaled.y, scaled.z)
    return ret
  }
}

const VectorHomoNull = new VectorHomo(0, 0, 0, 1)

class MatrixHomo {
  constructor(...vals) {
    if (vals.length != 16) {
      throw 'Incorrect number or arguments to MatrixHomo'
    }
    this.vals = vals
  }

  add(m) {
    return new MatrixHomo(
      this.vals[0] + m.vals[0],
      this.vals[1] + m.vals[1],
      this.vals[2] + m.vals[2],
      this.vals[3] + m.vals[3],
      this.vals[4] + m.vals[4],
      this.vals[5] + m.vals[5],
      this.vals[6] + m.vals[6],
      this.vals[7] + m.vals[7],
      this.vals[8] + m.vals[8],
      this.vals[9] + m.vals[9],
      this.vals[10] + m.vals[10],
      this.vals[11] + m.vals[11],
      this.vals[12] + m.vals[12],
      this.vals[13] + m.vals[13],
      this.vals[14] + m.vals[14],
      this.vals[15] + m.vals[15],
    )
  }

  multVect(v) {
    if (v.type != 'VectorHomo') {
      throw `Invalid parameter to MatrixHomo.multVect: ${v.type}`
    }

    const ret = new VectorHomo(
      this.vals[0] * v.x + this.vals[1] * v.y + this.vals[2] * v.z + this.vals[3] * v.t,
      this.vals[4] * v.x + this.vals[5] * v.y + this.vals[6] * v.z + this.vals[7] * v.t,
      this.vals[8] * v.x + this.vals[9] * v.y + this.vals[10] * v.z + this.vals[11] * v.t,
      this.vals[12] * v.x + this.vals[13] * v.y + this.vals[14] * v.z + this.vals[15] * v.t,
    )
    return ret
  }

  multPt(p) {
    if (p.type != 'PointHomo') {
      throw `Invalid parameter type to MatrixHomo.multPt ${p.type}`
    }
    const ret = new PointHomo(
      this.vals[0] * p.x + this.vals[1] * p.y + this.vals[2] * p.z + this.vals[3] * p.t,
      this.vals[4] * p.x + this.vals[5] * p.y + this.vals[6] * p.z + this.vals[7] * p.t,
      this.vals[8] * p.x + this.vals[9] * p.y + this.vals[10] * p.z + this.vals[11] * p.t,
      this.vals[12] * p.x + this.vals[13] * p.y + this.vals[14] * p.z + this.vals[15] * p.t,
    )
    return ret
  }

  matrixMult(v) {
    return new MatrixHomo(
      this.vals[0] * v.vals[0] +
        this.vals[1] * v.vals[4] +
        this.vals[2] * v.vals[8] +
        this.vals[3] * v.vals[12],
      this.vals[0] * v.vals[1] +
        this.vals[1] * v.vals[5] +
        this.vals[2] * v.vals[9] +
        this.vals[3] * v.vals[13],
      this.vals[0] * v.vals[2] +
        this.vals[1] * v.vals[6] +
        this.vals[2] * v.vals[10] +
        this.vals[3] * v.vals[14],
      this.vals[0] * v.vals[3] +
        this.vals[1] * v.vals[7] +
        this.vals[2] * v.vals[11] +
        this.vals[3] * v.vals[15],
      this.vals[4] * v.vals[0] +
        this.vals[5] * v.vals[4] +
        this.vals[6] * v.vals[8] +
        this.vals[7] * v.vals[12],
      this.vals[4] * v.vals[1] +
        this.vals[5] * v.vals[5] +
        this.vals[6] * v.vals[9] +
        this.vals[7] * v.vals[13],
      this.vals[4] * v.vals[2] +
        this.vals[5] * v.vals[6] +
        this.vals[6] * v.vals[10] +
        this.vals[7] * v.vals[14],
      this.vals[4] * v.vals[3] +
        this.vals[5] * v.vals[7] +
        this.vals[6] * v.vals[11] +
        this.vals[7] * v.vals[15],
      this.vals[8] * v.vals[0] +
        this.vals[9] * v.vals[4] +
        this.vals[10] * v.vals[8] +
        this.vals[11] * v.vals[12],
      this.vals[8] * v.vals[1] +
        this.vals[9] * v.vals[5] +
        this.vals[10] * v.vals[9] +
        this.vals[11] * v.vals[13],
      this.vals[8] * v.vals[2] +
        this.vals[9] * v.vals[6] +
        this.vals[10] * v.vals[10] +
        this.vals[11] * v.vals[14],
      this.vals[8] * v.vals[3] +
        this.vals[9] * v.vals[7] +
        this.vals[10] * v.vals[11] +
        this.vals[11] * v.vals[15],
      this.vals[12] * v.vals[0] +
        this.vals[13] * v.vals[4] +
        this.vals[14] * v.vals[8] +
        this.vals[15] * v.vals[12],
      this.vals[12] * v.vals[1] +
        this.vals[13] * v.vals[5] +
        this.vals[14] * v.vals[9] +
        this.vals[15] * v.vals[13],
      this.vals[12] * v.vals[2] +
        this.vals[13] * v.vals[6] +
        this.vals[14] * v.vals[10] +
        this.vals[15] * v.vals[14],
      this.vals[12] * v.vals[3] +
        this.vals[13] * v.vals[7] +
        this.vals[14] * v.vals[11] +
        this.vals[15] * v.vals[15],
    )
  }

  isHomo() {
    return this.val[12] == 0 && this.val[13] == 0 && this.val[14] == 0
  }
}

const MatrixProjectionHomo = new MatrixHomo(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0)
const MatrixProjectionI = new MatrixHomo(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
const NoopTransformHomo = MatrixProjectionI

function TranslateHomo(v) {
  if (v.type != 'Vector3D') {
    console.log('invalid')
    throw `Invalid parameter type ${v.type}`
  }
  return new MatrixHomo(
    1,
    0,
    0,
    v.x,

    0,
    1,
    0,
    v.y,

    0,
    0,
    1,
    v.z,

    0,
    0,
    0,
    1,
  )
}

function ScaleHomo(t) {
  return new MatrixHomo(
    t,
    0,
    0,
    0,

    0,
    t,
    0,
    0,

    0,
    0,
    t,
    0,

    0,
    0,
    0,
    1,
  )
}

function RotateXHomo(t) {
  return new MatrixHomo(
    1,
    0,
    0,
    0,

    0,
    Math.cos(t),
    -Math.sin(t),
    0,

    0,
    Math.sin(t),
    Math.cos(t),
    0,

    0,
    0,
    0,
    1,
  )
}

function RotateYHomo(t) {
  return new MatrixHomo(
    Math.cos(t),
    0,
    Math.sin(t),
    0,

    0,
    1,
    0,
    0,

    -Math.sin(t),
    0,
    Math.cos(t),
    0,

    0,
    0,
    0,
    1,
  )
}

function RotateZHomo(t) {
  return new MatrixHomo(
    Math.cos(t),
    -Math.sin(t),
    0,
    0,

    Math.sin(t),
    Math.cos(t),
    0,
    0,

    0,
    0,
    1,
    0,

    0,
    0,
    0,
    1,
  )
}

export {
  PointHomo,
  PointHomoOrigin,
  VectorHomo,
  VectorHomoNull,
  MatrixHomo,
  MatrixProjectionHomo,
  MatrixProjectionI,
  NoopTransformHomo,
  TranslateHomo,
  ScaleHomo,
  RotateXHomo,
  RotateYHomo,
  RotateZHomo,
}
