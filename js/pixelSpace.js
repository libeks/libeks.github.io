import { Point } from './geometry.js'
import { Ray, Point3DOrigin, Vector3D, Point3D } from './geometry3D.js'
import { MatrixProjectionHomo, MatrixHomo } from './geometryHomo.js'

class IsometricCamera {
  constructor(scale) {
    this.scale = scale // how wide of an element corresponds to one unit of screen space
  }

  getPixel(pointHomo) {
    if (pointHomo.type != 'PointHomo') {
      throw `getPixel recevied unrecognized argument ${pointHomo.type}`
    }
    return {
      point: new Point(pointHomo.x / this.scale, pointHomo.y / this.scale),
      depth: pointHomo.z,
    }
  }

  // given a pixel (in the x-y range (0,1); not scaled to the screen)
  reverseRay(pt) {
    if (pt.type != 'Point') {
      console.trace()
      throw `reverseRay recevied unrecognized argument ${pt.type}`
    }
    return new Ray(
      new Point3D((pt.x * this.scale) / 2, (pt.y * this.scale) / 2, 0), // why do we need to divide by 2 here?
      new Vector3D((pt.x * this.scale) / 2, (pt.y * this.scale) / 2, 1), // why do we need to divide by 2 here?
    )
  }

  // rayToPoint returns a ray from the camera to the point in 3d, this is used to decide whether a face is facing the camera
  rayTo3DPoint(pt) {
    if (pt.type != 'Point3D') {
      throw `rayTo3DPoint recevied unrecognized argument ${pt.type}`
    }
    return new Ray(new Point3D(pt.x, pt.y, 0), new Point3D(pt.x, pt.y, 0).vectTo(pt))
  }
}

class ProjectiveCamera {
  constructor(f) {
    this.f = f // focal length
    this.matrix = new MatrixHomo(
      1,
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
      0,

      0,
      0,
      1 / this.f,
      0,
    )
  }

  getPixel(pointHomo) {
    if (pointHomo.type != 'PointHomo') {
      throw `getPixel recevied unrecognized argument ${pointHomo.type}`
    }
    const point2d = this.matrix.multPt(pointHomo).to3D().to2D()
    return { point: point2d, depth: pointHomo.z }
  }

  // given a pixel (in the x-y range (0,1); not scaled to the screen)
  reverseRay(pt) {
    if (pt.type != 'Point') {
      console.trace()
      throw `reverseRay recevied unrecognized argument ${pt.type}`
    }
    return new Ray(Point3DOrigin, new Vector3D(pt.x, pt.y, this.f))
  }

  // rayToPoint returns a ray from the camera to the point in 3d, this is used to decide whether a face is facing the camera
  rayTo3DPoint(pt) {
    if (pt.type != 'Point3D') {
      throw `Invalid parameter for ProjectiveCamera.rayTo3DPoint ${pt.type}`
    }
    return new Ray(Point3DOrigin, Point3DOrigin.vectTo(pt))
  }
}

class Screen {
  constructor(width, height, camera) {
    this.width = width
    this.height = height
    this.scale = Math.min(width / 2, height / 2)
    this.camera = camera
  }

  // given a point in 3d, return its pixel representation
  getPixel(point, depth) {
    if (point.type != 'Point') {
      console.trace()
      throw `Screen.getPixel get unexpected argument ${point.type}`
    }
    const px = point.x * this.scale + this.width / 2
    const py = point.y * this.scale + this.height / 2
    return new Pixel(
      new Point(point.x * this.scale + this.width / 2, point.y * this.scale + this.height / 2),
      depth,
    )
  }

  // given a homogeneous coordinates, return the corresponding pixel value
  homoToPixel(pointHomo) {
    if (pointHomo.type != 'PointHomo') {
      console.trace()
      throw `Screen.homoToPixel get unexpected argument ${pointHomo.type}`
    }
    const { point, depth } = this.camera.getPixel(pointHomo)
    return this.getPixel(point, depth)
  }

  // given a screen pixel
  reverseRay(pt) {
    if (pt.type != 'Point') {
      console.trace()
      throw `Screen.reverseRay get unexpected argument ${pt.type}`
    }
    let ret = this.camera.reverseRay(
      new Point((pt.x - this.width / 2) / this.scale, (pt.y - this.height / 2) / this.scale),
    )
    return ret
  }
}

class Pixel {
  constructor(point, depth) {
    this.point = point
    this.depth = depth
  }

  cxcyProps() {
    return this.point.cxcyProps()
  }
}

export { Screen, Pixel, IsometricCamera, ProjectiveCamera }
