import { MatrixProjectionHomo, NoopTransformHomo } from './geometryHomo.js'
import { LineSegment } from './geometry.js'
import { Triangle, Plane, Ray, Line, Point3DOrigin } from './geometry3D.js'
import { Pixel } from './pixelSpace.js'
import { StraightStroke, CompositeCurve } from './lines.js'

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
    this.plane = new Plane(
      this.points[0].point.to3D(),
      this.points[1].point.to3D(),
      this.points[2].point.to3D(),
    )
    for (let pt of pts) {
      let ray = new Ray(Point3DOrigin, Point3DOrigin.vectTo(pt.point.to3D()))
      console.log('face3d', this.plane.intersectRay(ray), pt.point.to3D())
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

class ObjectLine {
  constructor(pointAID, pointBID, points, obj) {
    this.from = points[pointAID]
    this.to = points[pointBID]
    this.pointAID = pointAID
    this.pointBID = pointBID
    this.lineSegment = new LineSegment(
      points[a].projected.point,
      points[a].projected.point.vectTo(points[b].projected.point),
    )
    this.obj = obj
    this.faces = { left: null, right: null }
    this.intersections = []
    this.segments = []
    this.key = `${Math.min(pointAID, pointBID)},${Math.max(pointAID, pointBID)}`
  }
}

function reverseSegment(seg) {
  return {
    a: seg.b,
    b: seg.a,
    inFront: seg.inFront,
    line: seg.line,
    tA: seg.tB,
    tB: seg.tA,
    keyA: seg.keyB,
    keyB: seg.keyA,
  }
}

class SceneFrame {
  constructor(screen, ...objects) {
    this.objects = objects
    for (let i = 0; i < objects.length; i++) {
      this.objects[i].objectID = i
    }
    this.debugPoints = []
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
    return segments
  }

  computeLineSegmentVisibility(screen) {
    for (let [lineID, line] of Object.entries(this.getLineObjs())) {
      let segments = []
      console.log('line', line)
      for (let iA = 0; iA < line.intersections.length - 1; iA++) {
        let interA = line.intersections[iA]
        let interB = line.intersections[iA + 1]
        console.log('intersection', interA, interB)
        segments.push({
          a: interA.point,
          b: interB.point,
          line,
          tA: interA.t,
          tB: interB.t,
          keyA: interA.key,
          keyB: interB.key,
          // the line segment is in the foreground if at least one of the endpoints is visible from the camera
          inFront: interA.inFront || interB.inFront,
        })
      }
      line.segments = segments
      console.log('segments', line.segments)
    }
  }

  computeFaceDisplay() {
    let lineSegmentsByFace = {}
    // group all visible segments by the faces that they touch
    for (let line of this.getLineObjs()) {
      if (!line.visible) {
        continue
      }

      for (let seg of line.segments) {
        if (!seg.inFront) {
          continue
        }
        console.log(
          'segment',
          seg,
          line.key,
          Object.entries(line.faces).map(([key, value]) => `${key}: ${value.key}`),
        )

        for (let [direction, face] of Object.entries(line.faces)) {
          if (!face.facesCamera) {
            continue
          }
          console.log('segment appears in the direction', seg.keyA, seg.keyB, face.key, direction)
          let faceHash = `${line.obj.objectID}:${face.faceID}`
          if (!(faceHash in lineSegmentsByFace)) {
            lineSegmentsByFace[faceHash] = []
          }
          let newSegment
          if (direction == 'left') {
            console.log('segment will be reversed', seg)
            newSegment = reverseSegment(seg)
          } else {
            console.log('segment will not be reversed', seg, direction)
            newSegment = seg
          }
          lineSegmentsByFace[faceHash].push(newSegment)
        }
      }
    }

    for (let face of this.getFaceObjs()) {
      let retObjects = []
      console.log('computeFaceDisplay.face', face)
      let faceHash = `${face.obj.objectID}:${face.faceID}`
      if (!(faceHash in lineSegmentsByFace)) {
        console.log('face', faceHash, 'has no visible segments')
        continue
      }
      let segments = lineSegmentsByFace[faceHash]
      console.log(
        'face',
        faceHash,
        'has segments',
        segments.map((seg) => `${seg.keyA}->${seg.keyB}`),
      )
      let byStartPoint = {}
      let unprocessed = {}
      let nProcessed = 0
      for (let seg of segments) {
        if (seg.keyA in byStartPoint) {
          throw `Segment startpoint ${seg.keyA} appears multiple times for face ${face.key}`
        }
        byStartPoint[seg.keyA] = seg
        unprocessed[seg.keyA] = seg
      }
      let lineSegments = []
      while (nProcessed < segments.length) {
        console.log('while', nProcessed, segments.length)
        let current = Object.values(unprocessed)[0]
        console.log('current', current)
        let firstKey = current.keyA
        while (current.keyB != firstKey) {
          console.log('current', current, firstKey, unprocessed)
          lineSegments.push(new StraightStroke(current.a, current.b))
          delete unprocessed[current.keyA]
          if (!(current.keyB in byStartPoint)) {
            // yeah, because lines where one face is invisible don't know what face appears on the other side
            throw `endpoint ${current.keyB} does not appear among startpoints ${byStartPoint}`
          }
          current = byStartPoint[current.keyB]
          console.log('current', current, firstKey, unprocessed)
          nProcessed += 1
        }
        console.log('Adding face', lineSegments)
        retObjects.push(new CompositeCurve(...lineSegments))
      }
      face.visibleSurfaces = retObjects
      console.log('face has surfaces', face.visibleSurfaces)
    }
  }

  computeLineIntersections(screen) {
    let allLines = Object.values(this.getLineObjs())
    for (let a = 0; a < allLines.length; a++) {
      let lineA = allLines[a]
      console.log('lineA', lineA)
      if (!lineA.visible) {
        continue
      }
      lineA.intersections.push({
        with: null,
        t: 0,
        point: lineA.pointObjs[0].projected.point,
        inFront: lineA.pointObjs[0].visible,
        key: lineA.pointObjs[0].key,
      })
      lineA.intersections.push({
        with: null,
        t: 1,
        point: lineA.pointObjs[1].projected.point,
        inFront: lineA.pointObjs[1].visible,
        key: lineA.pointObjs[1].key,
      })
      for (let b = a + 1; b < allLines.length; b++) {
        let lineB = allLines[b]
        if (!lineB.visible) {
          continue
        }
        if (lineA.obj.objectID == lineB.obj.objectID) {
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

          let facesA = Object.values(lineA.faces).filter((face) => face.facesCamera)
          let facesB = Object.values(lineB.faces).filter((face) => face.facesCamera)
          let pt = facesA[0].face.plane.intersectLine(new Line(ray.p, ray.v))
          let ray2 = new Ray(Point3DOrigin, Point3DOrigin.vectTo(pt))
          let depthA = facesA[0].face.intersectApproxRayDepth(ray)
          let depthB = facesB[0].face.intersectApproxRayDepth(ray)
          console.log('intersection', t, depthA, depthB)

          lineA.intersections.push({
            with: lineB,
            t,
            u,
            point,
            inFront: depthA < depthB,
            key: `${lineA.key}x${lineB.key}`,
          })
          lineB.intersections.push({
            with: lineA,
            t: u,
            u: t,
            point,
            inFront: depthA > depthB,
            key: `${lineA.key}x${lineB.key}`,
          })
        }
      }
    }
    // ensure that intersections are ordered along the t-value
    for (let [lineID, line] of Object.entries(allLines)) {
      line.intersections.sort((a, b) => a.t - b.t)
      // console.log(
      //   'line',
      //   lineID,
      //   line.pointObjs.map((p) => p.projected.point.string()),
      //   line.intersections.map((l) => `${l.t} ${l.inFront}`),
      // )
      console.log('line intersections', line.intersections)
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
        key: `pt(${obj.objectID}:${ptID})`,
      })
    }
    let faces = []
    let lines = {}
    for (let [faceID, { points: pointIDs, color }] of obj.faces.entries()) {
      let pts = pointIDs.map((ptID) => points[ptID])
      let face = new Face3D(...pts)
      // debug

      // for (let ptID = 0; ptID < pts.length - 1; ptID++) {
      //   let pt2ID = ptID + 1
      //   let ptA = pts[ptID]
      //   let ptB = pts[pt2ID]
      //   console.log('pta', ptA.point, ptB.point)
      //   let pixA = screen.homoToPixel(ptA.point)
      //   let pixB = screen.homoToPixel(ptB.point)
      //   let line = new LineSegment(pixA.point, pixA.point.vectTo(pixB.point))
      //   let t = 0
      //   console.log('line', line)
      //   let pt = line.at(t)
      //   let ray = screen.reverseRay(pt)
      //   for (let i = 1; i < 5; i++) {
      //     let rayPoint = ray.at(i)
      //     console.log('ray point', rayPoint)
      //     let pixel = this.screen.homoToPixel(rayPoint.toHomo())
      //     this.debugPoints.push(pixel)
      //   }
      //   let depth = face.intersectApproxRayDepth(ray)
      //   console.log('tval', t, ray, pt, ptA.projected.point)
      //   console.log('tval', t, depth, pixA.depth, pixB.depth)
      //   // project the point onto the screen, then for each line on the face, project the point along that line back onto the scene, see what the depths are
      // }

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
        key: `face(${obj.objectID}_${faceID})`,
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
            faces: { left: null, right: null },
            intersections: [],
            key: `line(${obj.objectID}:${a}-${b})`,
          }
          lines[key] = lineObj
          points[a].lines.push(lineObj)
          points[b].lines.push(lineObj)
        }
        // lines[key].faces.push(faceObj)
        let side = a == pointIDs[ptAID] ? 'right' : 'left'
        console.log(
          'face appears in direction of line',
          faceObj.key,
          lines[key].key,
          side,
          pointIDs[ptAID],
          pointIDs[ptBID],
        )
        if (lines[key].faces[side] != null) {
          throw `Two faces cannot be on the same side of a line: ${lines[key].faces[side]} and ${faceObj}`
        }
        lines[key].faces[side] = faceObj
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
      console.log('line.faces', line.faces)
      for (let face of Object.values(line.faces)) {
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
