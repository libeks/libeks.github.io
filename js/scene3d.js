import { MatrixProjectionHomo, NoopTransformHomo } from './geometryHomo.js'
import { LineSegment } from './geometry.js'
import { Triangle, Plane, Ray, Line, Point3DOrigin } from './geometry3D.js'
import { Pixel } from './pixelSpace.js'
import { StraightStroke } from './lines.js'

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
    // console.log('Face3D plane', this.points)
    this.plane = new Plane(
      this.points[0].point.to3D(),
      this.points[1].point.to3D(),
      this.points[2].point.to3D(),
    )
    for (let pt of pts) {
      console.log('pt', pt)
      let ray = new Ray(Point3DOrigin, Point3DOrigin.vectTo(pt.point.to3D()))
      console.log('plane intersection', this.plane.intersectRayT(ray))
    }
  }

  facesCamera(camera) {
    let norm = this.points[0].point
      .to3D()
      .vectTo(this.points[1].point.to3D())
      .cross(this.points[0].point.to3D().vectTo(this.points[2].point.to3D()))
    let ray = camera.rayTo3DPoint(this.points[0].point.to3D())
    let dotProduct = norm.dot(ray.v)
    return dotProduct < 0
  }

  // intersect the ray precisely
  intersectRay(ray) {
    for (let tri of this.triangles) {
      let intersect = tri.intersectRay(ray)
      if (intersect == null) {
        return null
      }
      let { a, b, depth } = intersect
      return { point: tri.at(a, b), depth }
    }
  }

  intersectApproxRayDepth(ray) {
    // given a ray (likely from the camera), compute the 3D point where plane of this face intersects the ray, possibly outside of the Face
    let pt = this.plane.intersectRay(ray)
    console.log('depth', ray, this.plane, pt)
    if (pt == null) {
      return null
    }
    return pt.z
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
    for (let i = 0; i < objects.length; i++) {
      this.objects[i].id = i
    }
    this.screen = screen
    this.projectedObjects = this.computeObjects(screen)
    this.computeFacePointOverlap(screen)
    this.computeLineIntersections(screen)
    this.computeLineSegmentVisibility(screen)
    this.computeFaceDisplay(screen)
  }

  computeObjects(screen) {
    return this.objects.map((obj) => this.computeObject(screen, obj))
  }

  getWireframe() {
    let ret = []
    for (let obj of this.projectedObjects) {
      ret.push(obj.lines.values().map((line) => new StraightStroke(line.a.point, line.b.point)))
    }
    return ret
  }

  getVisibleWireframe() {
    let ret = []
    for (let obj of this.projectedObjects) {
      ret.push(obj.lines.values().map((line) => new StraightStroke(line.a.point, line.b.point)))
    }
    return ret
  }

  getPointsInCamera() {
    let ret = []
    for (let point of this.getPointObjs()) {
      if (point.inFrontOfCamera) {
        ret.push(point.projected.point)
      }
    }
    return ret
  }

  getPointObjs() {
    let ret = []
    for (let obj of this.projectedObjects) {
      ret.push(...obj.points)
    }
    return ret
  }

  getFaceObjs() {
    let ret = []
    for (let obj of this.projectedObjects) {
      ret.push(...obj.faces)
    }
    return ret
  }

  getLineObjs() {
    let ret = []
    for (let obj of this.projectedObjects) {
      ret.push(...Object.values(obj.lines))
    }
    return ret
  }

  computeFacePointOverlap(screen) {
    for (let point of this.getPointObjs()) {
      let ray = screen.reverseRay(point.projected.point)
      for (let face of this.getFaceObjs()) {
        let intersection = face.face.intersectRay(ray)
        if (intersection != null) {
          let { depth } = intersection
          if (depth < point.z) {
            point.obscured = true
          }
        }
      }
    }
  }

  getAllSegments() {
    let segments = []
    for (let line of this.getLineObjs()) {
      segments.push(...line.segments)
    }
    console.log(segments)
    return segments
  }

  computeLineSegmentVisibility(screen) {
    let segments = []
    console.log('computeLineSegmentVisibility', Object.entries(this.getLineObjs()))
    for (let [lineID, line] of Object.entries(this.getLineObjs())) {
      // console.log(line)
      // console.log(lineID, line.intersections)
      console.log(
        lineID,
        line.pointObjs.map((pt) => pt.projected.point.string()),
      )
      console.log('intersections', line.intersections)
      for (let iA = 0; iA < line.intersections.length - 1; iA++) {
        let interA = line.intersections[iA]
        let interB = line.intersections[iA + 1]
        console.log('inters', interA, interB)
        if (interA.inFront || interB.inFront) {
          segments.push({
            a: interA.point,
            b: interB.point,
            color: lineID == 0 ? 'red' : 'black',
          })
        }
      }
      console.log('line segments', segments)
      line.segments = segments
    }
  }

  computeFaceDisplay() {
    // FIXME: This algorithm is a mess, I need to better understand what I'm dealing with
    //
    // for (let face of this.getFaceObjs()) {
    //   let points = [face.face.points[0].projected.point]
    //   console.log('face', face)
    //   // walk the lines of the face
    //   // FIXME: the first point might be obscured
    //   for (let line of face.lines) {
    //     let intersections = face.lines.intersections
    //     if (intersections.lenght == 0) {
    //       points.push(line.line.pointObjs[0].projected.point)
    //     } else {
    //       for (let inter of intersections) {
    //         if (!inter.inFront) {
    //           // follow the other end of the line in the opposite direction
    //         }
    //       }
    //     }
    //   }
    //   face.visiblePoly = points
    // }
  }

  computeLineIntersections(screen) {
    let allLines = Object.values(this.getLineObjs())
    for (let a = 0; a < allLines.length; a++) {
      let lineA = allLines[a]
      // console.log('line', lineA)
      if (!lineA.visible) {
        continue
      }
      // console.log(lineA.pointObjs[1])
      lineA.intersections.push({
        with: null,
        t: 0,
        point: lineA.pointObjs[0].projected.point,
        inFront: lineA.pointObjs[0].visible,
      })
      lineA.intersections.push({
        with: null,
        t: 1,
        point: lineA.pointObjs[1].projected.point,
        inFront: lineA.pointObjs[1].visible,
      })
      for (let b = a + 1; b < allLines.length; b++) {
        let lineB = allLines[b]
        if (!lineB.visible) {
          continue
        }
        if (lineA.obj.id == lineB.obj.id) {
          if (
            lineA.a == lineB.a ||
            lineA.b == lineB.a ||
            lineA.a == lineB.b ||
            lineA.b == lineB.b
          ) {
            // the two lines share a point, they canonically don't intersect
            continue
          }
        }
        let intersection = lineA.lineSegment.intersectTU(lineB.lineSegment)
        if (intersection != null) {
          let { t, u } = intersection
          let point = lineA.lineSegment.at(t)
          let ray = screen.reverseRay(point)
          console.log('reverse ray', ray, 'to', point)

          let facesA = lineA.faces.filter((face) => face.facesCamera)
          let facesB = lineB.faces.filter((face) => face.facesCamera)
          console.log('faces', lineA, facesA)
          // console.log('face', facesA[0].facesCamera, lineB.faces[0].facesCamera)
          let pt = facesA[0].face.plane.intersectLine(new Line(ray.p, ray.v))
          console.log('point from line', pt)
          let ray2 = new Ray(Point3DOrigin, Point3DOrigin.vectTo(pt))
          let depthA = facesA[0].face.intersectApproxRayDepth(ray)
          let depthB = facesB[0].face.intersectApproxRayDepth(ray)

          console.log(
            'depths',
            depthA,
            depthB,
            facesA[0].face.intersectApproxRayDepth(ray2),
            facesB[0].face.intersectApproxRayDepth(ray2),
          )
          lineA.intersections.push({
            with: lineB,
            t,
            u,
            point,
            inFront: depthA < depthB,
          })
          lineB.intersections.push({
            with: lineA,
            t: u,
            u: t,
            point,
            inFront: depthA > depthB,
          })
        }
      }
    }
    for (let line of allLines) {
      line.intersections.sort((a, b) => a.t - b.t)
    }
  }

  getIntersectionPoints() {
    let ret = []
    for (let intersections of this.getLineObjs().map((l) => l.intersections)) {
      ret.push(...intersections.map((inter) => inter.point))
    }
    return ret
  }

  computeObject(screen, obj) {
    let points = []
    for (let [ptID, pt] of obj.points.entries()) {
      let projectedPt = this.screen.homoToPixel(pt)
      points.push({
        // objID,
        obj,
        ptID,
        point: pt,
        projected: projectedPt,
        lines: [],
        faces: [],
        inFrontOfCamera: projectedPt.depth > 0,
        ray: screen.reverseRay(projectedPt.point),
      })
    }
    let faces = []
    let lines = {}
    for (let [faceID, { points: pointIDs, color }] of obj.faces.entries()) {
      let pts = pointIDs.map((ptID) => points[ptID])
      let face = new Face3D(...pts)
      // debug
      for (let ptID = 0; ptID < pts.length - 1; ptID++) {
        let pt2ID = ptID + 1
        let ptA = pts[ptID]
        let ptB = pts[pt2ID]
        console.log('pta', ptA.point, ptB.point)
        let pixA = screen.homoToPixel(ptA.point)
        let pixB = screen.homoToPixel(ptB.point)
        let line = new LineSegment(pixA.point, pixA.point.vectTo(pixB.point))
        let t = Math.random()
        console.log('line', line)
        let pt = line.at(t)
        let ray = screen.reverseRay(pt)
        let depth = face.intersectApproxRayDepth(ray)
        console.log('tval', t, pt, ptA.projected.point)
        console.log('tval', t, depth, pixA.depth, pixB.depth)

        // project the point onto the screen, then for each line on the face, project the point along that line back onto the scene, see what the depths are
      }
      // end debug
      let faceObj = {
        pointIDs,
        faceID,
        obj,
        face,
        facesCamera: face.facesCamera(this.screen.camera),
        pointIDs,
        lines: [],
        color,
      }
      for (let ptAID = 0; ptAID < pointIDs.length; ptAID++) {
        let ptBID = (ptAID + 1) % pointIDs.length
        let a = pointIDs[ptAID]
        let b = pointIDs[ptBID]
        let reverse = false
        if (b < a) {
          reverse = true
          let temp = a
          a = b
          b = temp
        }
        let key = `${a},${b}`
        if (!(key in lines)) {
          let lineObj = {
            a,
            b,
            obj,
            lineSegment: new LineSegment(
              points[a].projected.point,
              points[a].projected.point.vectTo(points[b].projected.point),
            ),
            points: [a, b],
            pointObjs: [points[a], points[b]],
            faces: [],
            intersections: [],
          }
          lines[key] = lineObj
          points[a].lines.push(lineObj)
          points[b].lines.push(lineObj)
        }
        lines[key].faces.push(faceObj)
        faceObj.lines.push({
          line: lines[key],
          reverse,
        })
      }
      faces.push(faceObj)
      for (let pt of pts) {
        pt.faces.push(faceObj)
      }
    }
    for (let pt of points) {
      let visible = false
      for (let face of pt.faces) {
        if (face.facesCamera) {
          visible = true
        }
      }
      pt.visible = visible
    }
    for (let line of Object.values(lines)) {
      let visible = false
      for (let face of line.faces) {
        if (face.facesCamera) {
          visible = true
        }
      }
      line.visible = visible
    }

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
