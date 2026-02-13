import { MatrixProjectionHomo, NoopTransformHomo } from './geometryHomo.js'
import { Pixel } from './pixelSpace.js'

class Face3D {
  // represents a planar face of a convex planar polygon in  3D
  constructor(...pts) {
    this.pts = pts
    triangles = []
    for (let i = 1; i < this.pts.length - 1; i++) {
      triangles.push(new Triangle(this.pts[0], this.pts[i], this.pts[i + 1]))
    }
    this.triangles = triangles // this will be wrong for non-convex polygons
  }

  transform(homoMat) {
    return this.pts.map((pt) => homoMat.apply(pt))
  }

  intersectRay(ray) {
    for (let tri of this.triangles) {
      let intersect = tri.intersectRay(ray)
      if (intersect !== null) {
        let { a, b, depth } = intersect
        return { point: tri.at(a, b), depth }
      }
    }
    return null
  }
}

// an object positioned within a specific frame
class FrameObject3D {
  constructor(faces, points) {
    this.faces = faces
    this.points = points // homo coordinates
  }
}

class StaticTransform {
  constructor(matrix) {
    this.matrix = matrix
    this.type = 'StaticTransform'
  }

  leftCombine(transform) {
    if (transform.type == 'ParameterizedTransform') {
      return new ParameterizedTransform((t) => transform.funcMatrix(t).matrixMult(this.matrix))
    }
    return new StaticTransform(transform.matrix.matrixMult(this.matrix))
  }

  getFrame(t) {
    return this.matrix
  }
}

class ParameterizedTransform {
  constructor(fn) {
    this.funcMatrix = fn
    this.type = 'ParameterizedTransform'
  }

  leftCombine(transform) {
    if (transform.type == 'ParameterizedTransform') {
      return new ParameterizedTransform((t) =>
        transform.funcMatrix(t).matrixMult(this.funcMatrix(t)),
      )
    }
    return new ParameterizedTransform((t) => transform.matrix.matrixMult(this.funcMatrix(t)))
  }

  getFrame(t) {
    return this.funcMatrix(t)
  }
}

class Object3D {
  constructor(faces, points) {
    this.faces = faces // faces of this object, each referring to the indices of the points
    this.points = points // a list of the unique points of this object, in 3d
    this.transform = new StaticTransform(NoopTransformHomo) // function from (t) to the homogeneous matrix that all points should be mutated with
  }

  withTransform(t) {
    this.transform = this.transform.leftCombine(t)
    return this // allow chaining
  }

  getFrame(t) {
    const transform = this.transform.getFrame(t)
    // console.log('transform', transform)
    return new FrameObject3D(
      this.faces,
      this.points.map((pt) => transform.multPt(pt.toHomo())),
    )
  }
}

class SceneFrame {
  constructor(...objects) {
    this.objects = objects
  }
}

class Scene3D {
  constructor(...objects) {
    this.objects = objects
  }

  add(object) {
    this.objects.push(object)
  }

  getT(t) {
    return this.objects.map((obj) => obj.getT(t))
  }
}

export { Object3D, Scene3D, StaticTransform, ParameterizedTransform }
