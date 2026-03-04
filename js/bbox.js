import { Point } from '/js/geometry.js'

class BBox {
  constructor(x1, y1, x2, y2) {
    if (x1 > x2 || y1 > y2) {
      throw `Invalid parameters to BBox: ${x1} ${y1} ${x2} ${y2}`
    }
    this.x1 = x1
    this.x2 = x2
    this.y1 = y1
    this.y2 = y2
  }

  inside(point) {
    if (point.type != 'Point') {
      throw `BBox.inside unexpected argument ${point.type}`
    }
    if (point.x < this.x1 || point.x > this.x2) {
      return false
    }
    if (point.y < this.y1 || point.y > this.y2) {
      return false
    }
    return true
  }

  // distance is 0 if the point is inside the box, otherwise it is the distance to the closest point on the boudnary
  distance(point) {
    if (point.type != 'Point') {
      throw `BBox.distance unexpected argument ${point.type}`
    }
    if (this.inside(point)) {
      return 0
    }
    if (point.x < this.x1 && point.y >= this.y1 && point.y <= this.y2) {
      return Math.abs(point.x - this.x1)
    }
    if (point.x > this.x2 && point.y >= this.y1 && point.y <= this.y2) {
      return Math.abs(point.x - this.x2)
    }
    if (point.y < this.y1 && point.x >= this.x1 && point.x <= this.x2) {
      return Math.abs(point.y - this.y1)
    }
    if (point.y > this.y2 && point.x >= this.x1 && point.x <= this.x2) {
      return Math.abs(point.y - this.y2)
    }
    return Math.min(
      point.distance(new Point(this.x1, this.y1)),
      point.distance(new Point(this.x2, this.y1)),
      point.distance(new Point(this.x1, this.y2)),
      point.distance(new Point(this.x2, this.y2)),
    )
  }
}

export { BBox }
