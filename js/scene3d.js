import { MatrixProjectionHomo, NoopTransformHomo } from './geometryHomo.js'
import { LineSegment, Vector, Point, Line } from './geometry.js'
import { Triangle, Plane, Ray, Line3D, Point3DOrigin } from './geometry3D.js'
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
      // console.log('face3d', this.plane.intersectRay(ray), pt.point.to3D())
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
        continue
      }
      // console.log('intersectRay', intersect)
      let { a, b, depth, point } = intersect

      return { point, depth: point.z }
    }
    return null
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

  getVisibleFaceSurfaces() {
    let ret = []
    for (let face of this.getFaceObjs()) {
      if (!('visibleSurfaces' in face)) {
        continue
      }
      for (let surface of face.visibleSurfaces) {
        surface.color = face.color
        ret.push(surface)
      }
    }
    return ret
  }

  computeFacePointOverlap(screen) {
    for (let point of this.getPointObjs()) {
      let ray = screen.reverseRay(point.projected.point)
      let overlayStack = this.getPixelFaceOverlays(ray)

      // console.log('stack before', overlayStack)
      // filter out the faces that this point adjoins
      overlayStack = overlayStack.filter(
        (entry) => !point.faces.map((face) => face.key).includes(entry.face.key),
      )
      // console.log('stack after', overlayStack)
      point.overlapFaceStack = overlayStack
      // console.log('stack', point, point.overlapFaceStack, point.projected.point)

      if (point.overlapFaceStack.length > 0 && point.overlapFaceStack[0].depth < point.point.z) {
        point.obscured = true
      }
      // for (let face of this.getFaceObjs()) {
      //   console.log('face', face)
      //   if (!face.facesCamera) {
      //     continue
      //   }
      //   if (face.face.points.some((pt) => pt.key == point.key)) {
      //     console.log('face contains the point', face.key, point.key)
      //     continue
      //   }
      //   console.log('computeFacePointOverlap.ray', ray, point.key)
      //   let intersection = face.face.intersectRay(ray)
      //   console.log('intersection is', intersection)
      //   if (intersection != null) {
      //     let { depth } = intersection

      //     console.log('point face depth', depth, point, face)
      //     if (!depth) {
      //       continue
      //       // throw `Depth is undefined`
      //     }
      //     if (depth < point.point.z) {
      //       console.log('setting point as obscured', point.key)
      //       point.obscured = true
      //     } else {
      //       console.log('point overlays face', point.key, face.key, depth)
      //       point.overlapFaceStack.push({ face, depth })
      //     }
      //   }
      // }
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
      for (let iA = 0; iA < line.intersections.length - 1; iA++) {
        let interA = line.intersections[iA]
        let interB = line.intersections[iA + 1]

        let visible = false
        if (
          interA.intersectionType == 'come_out' ||
          interB.intersectionType == 'duck_under' ||
          interA.intersectionType == 'pass-over'
        ) {
          visible = true
        }
        if (interA.intersectionType == 'endpoint' && interA.visible) {
          visible = true
        }
        if (interB.intersectionType == 'endpoint' && interB.visible) {
          visible = true
        }
        let faces = []
        if (visible) {
          // console.log(
          //   'computeLineSegmentVisibility.intersection',
          //   line.key,
          //   interA.key,
          //   interB.key,
          //   'start:',
          //   interA.intersectionType,
          //   // '[' + interA.faces.before.map((face) => face.key).join(',') + ']',
          //   // '->',
          //   '[' + interA.faces.after.map((face) => face.key).join(',') + ']',

          //   'end:',
          //   interB.intersectionType,
          //   '[' + interB.faces.before.map((face) => face.key).join(',') + ']',
          //   // '->',
          //   // '[' + interB.faces.after.map((face) => face.key).join(',') + ']',
          // )
          if (interA.faces.after.length != interB.faces.before.length) {
            throw `Faces between the two endpoints of a segment do not match`
          }
          faces = interA.faces.after
        }
        segments.push({
          a: interA.point,
          b: interB.point,
          line,
          tA: interA.t,
          tB: interB.t,
          keyA: interA.key,
          keyB: interB.key,
          // the line segment is in the foreground if at least one of the endpoints is visible from the camera
          // FIXME: This doesn't work for line segments that are between two intersections and are in the background
          inFront: interA.inFront || interB.inFront,
          // inFront:
          visible,
          faces,
        })
      }
      line.segments = segments
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
        if (!seg.visible) {
          continue
        }
        let allFaces = Object.entries(line.faces).filter(([direction, face]) => face.facesCamera)
        let allFaceKeys = allFaces.map(([direction, face]) => face.key)
        let additionalFaces = seg.faces.filter((face) => !allFaceKeys.includes(face.key))
        let allFacesKeys = allFaces.map(([direction, face]) => direction)
        let outsideKey = allFacesKeys[0] == 'right' ? 'leftOutside' : 'rightOutside'
        allFaces = [...allFaces, ...additionalFaces.map((face) => [outsideKey, face])]

        for (let [direction, face] of allFaces) {
          if (!face.facesCamera) {
            continue
          }
          if (!(face.key in lineSegmentsByFace)) {
            lineSegmentsByFace[face.key] = []
          }
          let newSegment
          if (direction == 'left' || direction == 'leftOutside') {
            newSegment = reverseSegment(seg)
          } else {
            newSegment = seg
          }
          lineSegmentsByFace[face.key].push(newSegment)
        }
      }
    }

    for (let face of this.getFaceObjs()) {
      let retObjects = []
      if (!(face.key in lineSegmentsByFace)) {
        continue
      }
      let segments = lineSegmentsByFace[face.key]
      // console.log(
      //   'face',
      //   face.key,
      //   'has segments',
      //   segments.map((seg) => `${seg.keyA}->${seg.keyB}`),
      // )
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
      for (let seg of segments) {
        if (!(seg.keyB in byStartPoint)) {
          throw `endpoint ${seg.keyB} does not appear among startpoints ${byStartPoint} for face ${face.key}`
        }
      }
      while (Object.keys(unprocessed).length > 0) {
        let lineSegments = []
        let current = Object.values(unprocessed)[0]
        let firstKey = current.keyA
        while (current) {
          // console.log('current', current.keyA, current.keyB, firstKey, unprocessed)
          lineSegments.push(new StraightStroke(current.a, current.b))
          delete unprocessed[current.keyA]
          current = unprocessed[current.keyB]
          nProcessed += 1
        }
        // console.log(
        //   'Adding face',
        //   face.key,
        //   lineSegments.map((seg) => `${seg.from.string()} ${seg.to.string()}`),
        // )
        retObjects.push(new CompositeCurve(...lineSegments))
      }
      face.visibleSurfaces = retObjects
    }
  }

  getPixelFaceOverlays(ray) {
    if (ray.type != 'Ray') {
      console.trace()
      throw `getPixelFaceOverlays got unexpected argument ${ray.type}`
    }
    // WARNING: this might miss faces that the ray slices exactly on the edge, due to floating point arithmetic quirks
    let depthStack = []
    for (let face of this.getFaceObjs()) {
      // console.log('face', face)
      if (!face.facesCamera) {
        continue
      }
      // console.log('computeFacePointOverlap.ray', ray, point.key)
      let intersection = face.face.intersectRay(ray)
      // console.log('intersection is', intersection)
      if (intersection != null) {
        let { depth, point } = intersection

        if (!depth) {
          continue
        }
        depthStack.push({ face, depth, point })
      }
    }
    depthStack.sort((a, b) => a.depth - b.depth)
    return depthStack
  }

  computeLineIntersections(screen) {
    let allLines = Object.values(this.getLineObjs())
    for (let a = 0; a < allLines.length; a++) {
      let lineA = allLines[a]

      // console.log('linseA', lineA.pointObjs[0])
      if (!lineA.visible) {
        continue
      }
      let facesA = Object.values(lineA.faces).filter((face) => face.facesCamera)

      let startPoint = lineA.pointObjs[0]
      // console.log('startPoint', startPoint)
      let startFaces = facesA
      if (startFaces.length < 2) {
        if (startPoint.overlapFaceStack.length > 0) {
          startFaces = [...facesA, startPoint.overlapFaceStack[0].face]
        }
      }
      let endPoint = lineA.pointObjs[1]
      let endFaces = facesA
      if (endFaces.length < 2) {
        if (endPoint.overlapFaceStack.length > 0) {
          endFaces = [...facesA, endPoint.overlapFaceStack[0].face]
        }
      }
      // let faces = Object.values(lineA.faces).filter((face) => face.facesCamera)
      lineA.intersections.push({
        with: null,
        t: 0,
        point: startPoint.projected.point,
        inFront: startPoint.visible && !startPoint.obscured,
        visible: startPoint.visible && !startPoint.obscured,
        key: startPoint.key,
        overlapStack: lineA.pointObjs[0].overlapFaceStack,
        intersectionType: 'endpoint',
        faces: { before: [], after: startFaces },
      })
      lineA.intersections.push({
        with: null,
        t: 1,
        point: endPoint.projected.point,
        inFront: endPoint.visible && !endPoint.obscured,
        visible: endPoint.visible && !endPoint.obscured,
        key: endPoint.key,
        overlapStack: endPoint.overlapFaceStack,
        intersectionType: 'endpoint',
        faces: { before: endFaces, after: [] },
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
            // the two lines share a point, they canonically already intersect at endpoints, no need to recompute
            continue
          }
        }
        let facesB = Object.values(lineB.faces).filter((face) => face.facesCamera)
        let intersection = lineA.lineSegment.intersectTU(lineB.lineSegment)
        if (intersection != null) {
          let intersectionKey = `${lineA.key}x${lineB.key}`
          let { t, u } = intersection
          let point = lineA.lineSegment.at(t)
          let ray = screen.reverseRay(point)

          let allFaces = [...facesA, ...facesB]
          let allFaceKeys = allFaces.map((face) => face.key)
          // console.log('all faces', allFaces, allFaceKeys)
          let pt = facesA[0].face.plane.intersectLine(new Line3D(ray.p, ray.v))
          let ray2 = new Ray(Point3DOrigin, Point3DOrigin.vectTo(pt))
          let depthA = facesA[0].face.intersectApproxRayDepth(ray)
          let depthB = facesB[0].face.intersectApproxRayDepth(ray)
          // console.log(
          //   'computeLineIntersections.intersection',
          //   t,
          //   depthA,
          //   depthB,
          //   facesA.length,
          //   facesB.length,
          // )

          if (depthA < depthB && facesA.length == 2) {
            // the line in front has both faces visible, meaning that lineB is out of view and we can ignore this intersection
            // console.log('exiting early, lineA is way in front of the intersection')
            continue
          }
          if (depthA > depthB && facesB.length == 2) {
            // the line in front has both faces visible, meaning that lineB is out of view and we can ignore this intersection
            // console.log('exiting early, lineB is way in front of the intersection')
            continue
          }

          let overlapStack = this.getPixelFaceOverlays(ray) // this includes the faces adjoining the two lines
          let bareOverlapStack = overlapStack.filter(({ face }) => !allFaceKeys.includes(face.key))
          let visibleA = true
          let visibleB = true
          if (bareOverlapStack.length > 0) {
            visibleA = depthA < bareOverlapStack[0].depth
            visibleB = depthB < bareOverlapStack[0].depth
          }
          if (!visibleA || !visibleB) {
            // at least one of the intersection lines is obscured at the intersection point by an unrelated face, can ignore
            continue
          }
          let remainingFace = null
          if (bareOverlapStack.length > 0) {
            remainingFace = bareOverlapStack[0].face
          }

          let lineOver = depthA < depthB ? lineA : lineB
          let overFace = depthA < depthB ? facesA[0] : facesB[0]
          let underFaces = depthA < depthB ? facesB : facesA
          // the line is not correctly ordered from the perspective of the overlaying face, so we need to figure out
          // if it needs to be flipped to perform the logic. Critically, a face is on the left of the directed line
          // that is on its side
          let lineOverReverse = overFace.lines.filter((line) => line.line.key == lineOver.key)[0]
            .reverse
          // console.log('lineOverReversed', lineOverReverse)
          let lineUnder = depthA < depthB ? lineB : lineA
          // console.log('lineOverUnder', lineOver, lineUnder)
          let lineOverSegment = lineOverReverse
            ? lineOver.lineSegment.reverse()
            : lineOver.lineSegment
          let lineUnderDirection =
            lineOverSegment.line().pointOnSide(lineUnder.lineSegment.p) < 0
              ? 'come_out'
              : 'duck_under'

          // console.log(
          //   'line under direction',
          //   overFace,
          //   lineUnderDirection,
          //   lineOver.key,
          //   lineUnder.key,
          //   lineUnder.lineSegment.p,
          //   lineUnder.pointObjs.map((obj) => obj.projected.point),
          //   lineOver.lineSegment.line().pointOnSide(lineUnder.lineSegment.p),
          // )

          // {
          //   let testLine = new Line(new Point(0, 0), new Vector(100, 0))
          //   let ptA = new Point(0, 100)
          //   let ptB = new Point(0, -100)
          //   console.log('debugdebug', testLine.pointOnSide(ptA), testLine.pointOnSide(ptB))
          // }
          // console.log(
          //   'overlap stack for intersection',
          //   intersectionKey,
          //   depthA,
          //   depthB,
          //   allFaceKeys,
          //   overlapStack.map(({ face, depth }) => `${face.key}: ${depth}`),
          //   bareOverlapStack,
          // )
          let underFaceMap =
            lineUnderDirection == 'come_out'
              ? { before: [overFace], after: underFaces }
              : { before: underFaces, after: [overFace] }

          let underLeft = lineUnder.faces.left.facesCamera ? lineUnder.faces.left : remainingFace
          let underRight = lineUnder.faces.right.facesCamera ? lineUnder.faces.right : remainingFace

          // this is some funky logic, to do with the direction of the over line and the under line. There are four cases
          // and they effectively form an XOR. The first case is when the under line is coming out and the over line is not reversed
          // it also holds if the under line is dipping down and the over line is reversed. Otherwise, the second case applies
          let overFaceMap =
            (lineUnderDirection == 'come_out') == !lineOverReverse
              ? {
                  before: underLeft != null ? [overFace, underLeft] : [overFace],
                  after: underRight != null ? [overFace, underRight] : [overFace],
                }
              : {
                  before: underRight != null ? [overFace, underRight] : [overFace],
                  after: underLeft != null ? [overFace, underLeft] : [overFace],
                }
          lineA.intersections.push({
            with: lineB,
            t,
            u,
            point,
            ray,
            inFront: depthA < depthB,
            visible: visibleA,
            key: intersectionKey,
            overlapStack: overlapStack,
            intersectionType: depthA < depthB ? 'pass-over' : lineUnderDirection,
            faces: depthA < depthB ? overFaceMap : underFaceMap,
          })
          lineB.intersections.push({
            with: lineA,
            t: u,
            u: t,
            point,
            ray,
            visible: visibleB,
            inFront: depthA > depthB,
            key: intersectionKey,
            overlapFaceStack: overlapStack,
            intersectionType: depthA > depthB ? 'pass-over' : lineUnderDirection,
            faces: depthA < depthB ? underFaceMap : overFaceMap,
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
      // console.log('line intersections', line.intersections)
    }
  }

  getIntersectionPoints() {
    let ret = []
    for (let intersections of this.getLineObjs().map((l) => l.intersections)) {
      ret.push(...intersections)
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
        overlapFaceStack: [], // a list of faces that this point is in front of, along with their depths
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
        // console.log(
        //   'face appears in direction of line',
        //   faceObj.key,
        //   lines[key].key,
        //   side,
        //   pointIDs[ptAID],
        //   pointIDs[ptBID],
        // )
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
      // this visibility ignores obstruction, it only measures whether any of the point's faces face the camera
      pt.visible = visible
    }
    for (let line of Object.values(lines)) {
      let visible = false
      // console.log('line.faces', line.faces)
      for (let face of Object.values(line.faces)) {
        if (face.facesCamera) {
          visible = true
        }
      }
      // this visibility ignores obstruction, it only measures whether either of the two adjoining faces face the camera
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
