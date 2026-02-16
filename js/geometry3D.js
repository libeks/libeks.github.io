import { PointHomo, VectorHomo } from './geometryHomo.js'
import { Point } from './geometry.js'

const THRESHOLD = 0.01

class Point3D {
  constructor(x, y, z) {
    this.x = x
    this.y = y
    this.z = z
    this.type = 'Point3D'
  }

  addVect(v) {
    return new Point3D(this.x + v.x, this.y + v.y, this.z + v.z)
  }

  d(x, y, z) {
    // shorthand for .addVect(new Vector(x,y))
    return new Point3D(this.x + x, this.y + y, this.z + z)
  }

  subPt(p) {
    return new Vector3D(this.x - p.x, this.y - p.y, this.z - p.z)
  }

  vectTo(p) {
    // more intuitive than subPt, gives a vector from this point to the other point
    return p.subPt(this)
  }

  distance(p) {
    return this.subPt(p).len()
  }

  string() {
    return `${this.x} ${this.y} ${this.z}`
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
    return `(${this.x.toFixed(1)}, ${this.y.toFixed(1)}, ${this.z.toFixed(1)})`
  }

  toHomo() {
    return new PointHomo(this.x, this.y, this.z, 1)
  }

  to2D() {
    // shear off the z coordinate
    return new Point(this.x, this.y)
  }
}

const Point3DOrigin = new Point3D(0, 0, 0)

class Vector3D {
  constructor(x, y, z) {
    this.x = x
    this.y = y
    this.z = z
    this.type = 'Vector3D'
  }

  len() {
    return Math.sqrt(this.x * this.x + this.y * this.y, this.z * this.z)
  }

  add(v) {
    if (v.type != 'Vector3D') {
      throw `Invalid argument to cross: ${v.type}`
    }
    return new Vector3D(this.x + v.x, this.y + v.y, this.z + v.z)
  }

  mult(t) {
    // return the vector scaled by scalar t
    if (t == 1) {
      return this
    }
    return new Vector(this.x * t, this.y * t, this.z * t)
  }

  dot(v) {
    if (v.type != 'Vector3D') {
      throw `Invalid argument to cross: ${v.type}`
    }
    return this.x * v.x + this.y * v.y + this.z * v.z
  }

  unit() {
    // return a vector pointing in the same direction, but of length 1
    if (this.len() == 0) {
      // degenerate case, return nil vector
      return this
    }
    return this.mult(1 / this.len())
  }

  // cross product between two vectors
  cross(v) {
    if (v.type != 'Vector3D') {
      throw `Invalid argument to cross: ${v.type}`
    }
    return new Vector3D(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x,
    )
  }

  toHomo() {
    return new VectorHomo(this.x, this.y, this.z, 1)
  }
}

const Vector3DNull = new Vector3D(0, 0, 0)

class Matrix3D {
  constructor(...vals) {
    if (vals.length != 9) {
      throw 'Invalid Matrix3D argument count'
    }
    this.vals = vals
  }

  string() {
    return `Matrix3D((${this.vals[0]}, ${this.vals[1]}, ${this.vals[2]}),\n\t(${this.vals[3]}, ${this.vals[4]}, ${this.vals[5]})\n\t(${this.vals[6]}, ${this.vals[7]}, ${this.vals[8]}))`
  }

  add(m) {
    return new Matrix3D(
      this.vals[0] + m.vals[0],
      this.vals[1] + m.vals[1],
      this.vals[2] + m.vals[2],
      this.vals[3] + m.vals[3],
      this.vals[4] + m.vals[4],
      this.vals[5] + m.vals[5],
      this.vals[6] + m.vals[6],
      this.vals[7] + m.vals[7],
      this.vals[8] + m.vals[8],
    )
  }

  multVect(v) {
    // console.log('multVect', this, v)
    if (v.type != 'Vector3D') {
      throw `Invalid parameter type ${v.type}`
    }
    return new Vector3D(
      this.val[0] * v.x + this.val[1] * v.y + this.val[2] * v.z,
      this.val[3] * v.x + this.val[4] * v.y + this.val[5] * v.z,
      this.val[6] * v.x + this.val[7] * v.y + this.val[8] * v.z,
    )
  }

  multPt(p) {
    // console.log('multPt', this, p)
    if (v.type != 'Point3D') {
      throw `Invalid parameter type ${v.type}`
    }
    return new Point3D(
      this.val[0] * v.x + this.val[1] * v.y + this.val[2] * v.z,
      this.val[3] * v.x + this.val[4] * v.y + this.val[5] * v.z,
      this.val[6] * v.x + this.val[7] * v.y + this.val[8] * v.z,
    )
  }

  scalarMult(t) {
    return new Matrix3D(
      this.vals[0] * t,
      this.vals[1] * t,
      this.vals[2] * t,
      this.vals[3] * t,
      this.vals[4] * t,
      this.vals[5] * t,
      this.vals[6] * t,
      this.vals[7] * t,
      this.vals[8] * t,
    )
  }

  matMult(m) {
    return new Matrix3D(
      this.vals[0] * m.vals[0] + this.vals[1] * m.vals[3] + this.vals[2] * m.vals[6],
      this.vals[0] * m.vals[1] + this.vals[1] * m.vals[4] + this.vals[2] * m.vals[7],
      this.vals[0] * m.vals[2] + this.vals[1] * m.vals[5] + this.vals[2] * m.vals[8],

      this.vals[3] * m.vals[0] + this.vals[4] * m.vals[3] + this.vals[5] * m.vals[6],
      this.vals[3] * m.vals[1] + this.vals[4] * m.vals[4] + this.vals[5] * m.vals[7],
      this.vals[3] * m.vals[2] + this.vals[4] * m.vals[5] + this.vals[5] * m.vals[8],

      this.vals[6] * m.vals[0] + this.vals[7] * m.vals[3] + this.vals[8] * m.vals[6],
      this.vals[6] * m.vals[1] + this.vals[7] * m.vals[4] + this.vals[8] * m.vals[7],
      this.vals[6] * m.vals[2] + this.vals[7] * m.vals[5] + this.vals[8] * m.vals[8],
    )
  }

  // transpose the matrix
  T() {
    return new Matrix3D(
      this.vals[0],
      this.vals[3],
      this.vals[6],
      this.vals[1],
      this.vals[4],
      this.vals[7],
      this.vals[2],
      this.vals[5],
      this.vals[8],
    )
  }

  // the determinant of the matrix
  det() {
    return (
      this.vals[0] * this.vals[4] * this.vals[8] +
      this.vals[1] * this.vals[5] * this.vals[6] +
      this.vals[2] * this.vals[3] * this.vals[7] -
      this.vals[2] * this.vals[4] * this.vals[6] -
      this.vals[1] * this.vals[3] * this.vals[8] -
      this.vals[0] * this.vals[5] * this.vals[7]
    )
  }

  inv() {
    const d = this.det()
    if (d == 0) {
      return Matrix3DNull
    }
    return new Matrix3D(
      this.vals[4] * this.vals[8] - this.vals[5] * this.vals[7],
      -this.vals[3] * this.vals[8] + this.vals[5] * this.vals[6],
      this.valls[3] * this.vals[7] - this.vals[4] * this.vals[6],

      -this.vals[1] * this.vals[8] + this.vals[7] * this.vals[2],
      this.vals[0] * this.vals[8] - this.vals[2] * this.vals[6],
      -this.vals[0] * this.vals[7] + this.vals[6] * this.vals[1],

      this.vals[1] * this.vals[5] - this.vals[2] * this.vals[4],
      -this.vals[0] * this.vals[5] + this.vals[3] * this.vals[2],
      this.vals[0] * this.vals[4] - this.vals[1] * this.vals[3],
    )
      .T()
      .ScalarMult(1 / d)
  }

  toHomo() {
    return MatrixHomo(
      this.vals[0],
      this.vals[1],
      this.vals[2],
      0,
      this.vals[3],
      this.vals[4],
      this.vals[5],
      0,
      this.vals[6],
      this.vals[7],
      this.vals[8],
      0,
      0,
      0,
      0,
      1,
    )
  }
}

class Ray {
  constructor(p, v) {
    if (p.type != 'Point3D') {
      throw `Invalid argument to Ray ${p}`
    }
    if (v.type != 'Vector3D') {
      throw `Invalid argument to Ray ${v}`
    }
    this.p = p
    this.v = v
  }

  at(t) {
    return this.p.addVect(this.v.mult(t))
  }
}

class Plane {
  constructor(n, d) {
    if (n.type != 'Vector3D') {
      throw `Invalid argument to Plane ${n}`
    }
    this.n = n
    this.d = d
  }

  intersectRay(r) {
    const denominator = this.n.dot(d)
    if (denominator == 0) {
      return null // ray is parallel to plane, no intersection
    }
    const t = (this.d - this.n.dot(r.p.subPt(Point3DOrigin))) / denominator
    if (t < 0.0) {
      return null // ray intersects plane before ray's starting point
    }
    const point = r.at(t)
    return point
  }
}

class Triangle {
  constructor(a, b, c) {
    if (a.type != 'Point3D' || a.type != 'Point3D' || a.type != 'Point3D') {
      throw `Invalid argument to Triangle ${a.type}, ${b.type}, ${c.type}`
    }
    this.a = a
    this.b = b
    this.c = c
  }

  bVect() {
    return a.towards(b)
  }

  cVect() {
    return a.towards(c)
  }

  // return a point inside the triangle with parameters a and b, where a+b < 1 and a>0 and b>0
  at(a, b) {
    return this.a.addVect(this.bVect().mult(a)).addVect(this.cVect().mult(c))
  }

  getPlane() {
    const nVector = this.bVect().CrossProduct(this.cVect())
    return new Plane(nVector, Origin3D.vectTO(this.a).dot(nVector))
  }

  rayIntersectLocalCoords(ray) {
    const bVect = this.bVect()
    const cVect = this.cVect()
    const plane = this.getPlane()
    const normal = this.plane.n
    const normalMagSq = this.normal.len() ** 2
    let intersectPt = this.plane.intersectRay(ray)
    if (intersectPt === null) {
      return null
    }
    const iVect = intersectPt.subPt(this.a)
    // const zDepth = -intersectDot.z

    const b = iVect.cross(cVect).dot(normal) / normalMagSq
    const c = bVect.cross(iVect).dot(normal) / normalMagSq
    // check if vector (b,c) is inside the triangle [(0,0), (1,0), (0,1)]
    if (b < 0 || b > 1 || c < 0 || c > 1) {
      // outside the unit square
      return null
    }
    if (b + c > 1) {
      // inside unit square, but on far side of hypotenuse
      return null
    }
    // inside unit square and inside the hypotenuse
    return { b, c, depth: ray.p.distance(intersectPt) }
  }
}

const Matrix3DI = new Matrix3D(1, 0, 0, 0, 1, 0, 0, 0, 1)
const Matrix3DNull = new Matrix3D(0, 0, 0, 0, 0, 0, 0, 0, 0)

export {
  Point3D,
  Point3DOrigin,
  Vector3D,
  Vector3DNull,
  Matrix3D,
  Matrix3DI,
  Matrix3DNull,
  Ray,
  Triangle,
  Plane,
}
