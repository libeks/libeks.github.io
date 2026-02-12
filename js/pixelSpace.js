import { Point } from './geometry.js'
import { MatrixProjectionHomo } from './geometryHomo.js'

class Screen {
  constructor(width, height, type) {
    this.width = width
    this.height = height
    const whRatio = width / height
    this.scale = Math.min(width / 2, height / 2)
    this.type = type
  }

  // given a point in 3d, return its pixel representation
  getPixel(point, depth) {
    return new Pixel(
      new Point(point.x * this.scale + this.width / 2, point.y * this.scale + this.height / 2),
      depth,
    )
  }

  // given a homogeneous coordinates, return the corresponding pixel value
  homoToPixel(pointHomo) {
    // console.log(this.type, this.projectivePixel(pointHomo), this.parallelPixel(pointHomo))
    if (this.type == 'projective') {
      return this.projectivePixel(pointHomo)
    }
    return this.parallelPixel(pointHomo)
  }

  projectivePixel(pointHomo) {
    const point2d = MatrixProjectionHomo.multPt(pointHomo).to3D().to2D()
    return this.getPixel(point2d, pointHomo.z)
  }

  parallelPixel(pointHomo) {
    // console.log('doing parallel projection', pointHomo)
    // TODO: generalize the parallel scaling factor
    const ret = this.getPixel(new Point(pointHomo.x / 200, pointHomo.y / 200), pointHomo.z)
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

export { Screen, Pixel }
