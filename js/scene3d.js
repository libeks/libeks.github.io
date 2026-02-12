import { MatrixProjectionHomo, NoopTransformHomo } from './geometryHomo.js'
import { Pixel } from './pixelSpace.js'

class Face3D {
  // represents a planar face of a 3D polyhedron
  constructor(...pts) {
    this.pts = pts
  }

  transform(homoMat) {
    return this.pts.map((pt) => homoMat.apply(pt))
  }
}

// an object positioned within a specific frame
class FrameObject3D {
  constructor(faces, points) {
    this.faces = faces
    this.points = points
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
    this.points = points // a list of the unique points of this object
    this.transform = new StaticTransform(NoopTransformHomo) // function from (t) to the homogeneous matrix that all points should be mutated with
  }

  withTransform(t) {
    this.transform = this.transform.leftCombine(t)
    return this // allow chaining
  }

  // facePts() {
  //   return this.faces.map((face) => face.map((ptIdx) => this.transform.mult(this.points[ptIdx])))
  // }

  // getPoints(t) {
  //   // return all the unique points describing this object
  //   return this.points
  // }

  // lines() {}

  getFrame(t) {
    const transform = this.transform.getFrame(t)
    return new FrameObject3D(
      this.faces,
      this.points.map((pt) => transform.multPt(pt.toHomo()).to3D()),
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

// given a homogeneous coordinate, return the 2-d pixel value, along with the depth z-coordinate
function cameraTransform(homoCoords, screen) {
  const point2d = MatrixProjectionHomo.multPt(homoCoords).to3D().to2D()
  return screen.getPixel(point2d, homoCoords.z)
}

export { Object3D, Scene3D, cameraTransform, StaticTransform, ParameterizedTransform }
