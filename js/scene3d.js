import { MatrixProjectionHomo, NoopTransformHomo } from './geometryHomo.js'
import { Triangle } from './geometry3D.js'
import { Pixel } from './pixelSpace.js'

class Face3D {
  // represents a planar face of a convex planar polygon in  3D
  constructor(...pts) {
    this.points = pts
    let triangles = []
    for (let i = 1; i < this.points.length - 1; i++) {
      triangles.push(
        new Triangle(
          this.points[0].point.to3D(),
          this.points[i].point.to3D(),
          this.points[i + 1].point.to3D(),
        ),
      )
    }
    this.triangles = triangles // this will be wrong for non-convex polygons
  }

  facesCamera(camera) {
    let norm = this.points[0].point
      .to3D()
      .vectTo(this.points[1].point.to3D())
      .cross(this.points[0].point.to3D().vectTo(this.points[2].point.to3D()))
    let ray = camera.rayTo3DPoint(this.points[0].point.to3D())

    // console.log('facesCamera', norm, ray, norm.dot(ray.v), norm.dot(ray.v) < 0)
    return norm.dot(ray.v) < 0
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
    this.faces = faces // faces of this object, array of faces, each an array of indices of the points
    this.points = points // a list of the unique points of this object, in 3d
    this.transform = new StaticTransform(NoopTransformHomo) // function from (t) to the homogeneous matrix that all points should be mutated with
  }

  withTransform(t) {
    this.transform = this.transform.leftCombine(t)
    return this // allow chaining
  }

  getFrame(t) {
    const transform = this.transform.getFrame(t)
    return new FrameObject3D(
      this.faces,
      this.points.map((pt) => transform.multPt(pt.toHomo())),
    )
  }
}

class SceneFrame {
  constructor(screen, ...objects) {
    this.objects = objects
    this.screen = screen
    this.projectedObjects = this.computeObjects(screen)
    // console.log(this.projectedObjects)
  }

  computeObjects(screen) {
    return this.objects.map((obj) => this.computeObject(screen, obj))
  }

  computeObject(screen, obj) {
    let points = []
    for (let [ptID, pt] of obj.points.entries()) {
      let projectedPt = this.screen.homoToPixel(pt)
      points.push({
        // objID,
        ptID,
        point: pt,
        projected: projectedPt,
        lines: [],
        faces: [],
      })
    }
    let faces = []
    let lines = {}
    for (let [faceID, pointIDs] of obj.faces.entries()) {
      let pts = pointIDs.map((ptID) => points[ptID])
      let face = new Face3D(...pts)
      let faceObj = {
        points,
        faceID,
        // objID,
        face,
        facesCamera: face.facesCamera(this.screen.camera),
        pointIDs,
        lines: [],
      }
      for (let ptAID = 0; ptAID < pointIDs.length; ptAID++) {
        let ptBID = (ptAID + 1) % pointIDs.length
        let a = pointIDs[ptAID]
        let b = pointIDs[ptBID]
        if (b < a) {
          let temp = a
          a = b
          b = temp
        }
        let key = `${a},${b}`
        if (!(key in lines)) {
          let lineObj = {
            a,
            b,
            points: [a, b],
            pointObjs: [points[a], points[b]],
            faces: [],
          }
          lines[key] = lineObj
          points[a].lines.push(lineObj)
          points[b].lines.push(lineObj)
        }
        lines[key].faces.push(faceObj)
      }
      faces.push(faceObj)
      for (let pt of pts) {
        pt.faces.push(faceObj)
      }
    }

    console.log(
      'visible',
      faces.map((face) => face.facesCamera),
    )

    return {
      points,
      faces,
      lines,
    }
  }
}

class Scene3D {
  constructor(...objects) {
    this.objects = objects
  }

  add(object) {
    this.objects.push(object)
  }

  getFrame(screen, t) {
    return new SceneFrame(screen, ...this.objects.map((obj) => obj.getFrame(t)))
  }
}

export { Object3D, Scene3D, StaticTransform, ParameterizedTransform }
