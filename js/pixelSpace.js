import { Point } from './geometry.js'

class Screen {
  constructor(width, height) {
    this.width = width
    this.height = height
    const whRatio = width / height
    this.scale = Math.min(width / 2, height / 2)
  }

  getPixel(point, depth) {
    return new Pixel(
      new Point(point.x * this.scale + this.width / 2, point.y * this.scale + this.height / 2),
      depth,
    )
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
