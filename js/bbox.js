import { Point, Vector, Line } from '/js/geometry.js'
import { StraightStroke, CompositeCurve } from '/js/lines.js'

class BBox {
  constructor(x1, y1, x2, y2) {
    if (x1 > x2 || y1 > y2) {
      throw `Invalid parameters to BBox: ${x1} ${y1} ${x2} ${y2}`
    }
    this.x1 = x1
    this.x2 = x2
    this.y1 = y1
    this.y2 = y2
    this.type = 'BBox'
  }

  width() {
    return this.x2 - this.x1
  }

  height() {
    return this.y2 - this.y1
  }

  upperLeft() {
    return new Point(this.x1, this.y1)
  }

  upperRight() {
    return new Point(this.x2, this.y1)
  }

  lowerLeft() {
    return new Point(this.x1, this.y2)
  }

  lowerRight() {
    return new Point(this.x2, this.y2)
  }

  // return a new BBox with 'size' taken off on each side
  withPadding(size) {
    if (this.width() < size * 2 || this.height() < size * 2) {
      throw `BBox is too small to be padded by ${size}, ${this.width()}x${this.height()}`
    }
    return new BBox(this.x1 + size, this.y1 + size, this.x2 - size, this.y2 - size)
  }

  withIndividualPadding(top, right, bottom, left) {
    if (this.width() < left + right || this.height() < top + bottom) {
      throw `BBox is too small to be padded, ${this.width()}x${this.height()}`
    }
    return new BBox(this.x1 + left, this.y1 + top, this.x2 - right, this.y2 - bottom)
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

  // returns whether the bbox is completely inside the current box
  boxInside(bbox) {
    return this.x1 <= bbox.x1 && this.x2 >= bbox.x2 && this.y1 <= bbox.y1 && this.y2 >= bbox.y2
  }

  // returns whether bbox is completely outside the current box
  boxOutside(bbox) {
    return this.x2 < bbox.x1 || this.x1 > bbox.x2 || this.y2 < bbox.y1 || this.y1 > bbox.y2
  }

  // returns whether bbox intersects at all with the current box
  boxHasIntersection(bbox) {
    return !this.boxOutside(bbox)
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
      let ret = Math.abs(point.x - this.x1)
      return ret
    }
    if (point.x > this.x2 && point.y >= this.y1 && point.y <= this.y2) {
      let ret = Math.abs(point.x - this.x2)
      return ret
    }
    if (point.y < this.y1 && point.x >= this.x1 && point.x <= this.x2) {
      let ret = Math.abs(point.y - this.y1)
      return ret
    }
    if (point.y > this.y2 && point.x >= this.x1 && point.x <= this.x2) {
      let ret = Math.abs(point.y - this.y2)
      return ret
    }
    let ret = Math.min(
      point.distance(new Point(this.x1, this.y1)),
      point.distance(new Point(this.x2, this.y1)),
      point.distance(new Point(this.x1, this.y2)),
      point.distance(new Point(this.x2, this.y2)),
    )
    return ret
  }

  center() {
    return new Point(this.x1, this.y1).addVect(new Vector(this.width(), this.height()).mult(0.5))
  }

  top() {
    return new Line(this.upperLeft(), this.upperLeft().vectTo(this.upperRight()))
  }

  right() {
    return new Line(this.upperRight(), this.upperRight().vectTo(this.lowerRight()))
  }

  bottom() {
    return new Line(this.lowerRight(), this.lowerRight().vectTo(this.lowerLeft()))
  }

  left() {
    return new Line(this.lowerLeft(), this.lowerLeft().vectTo(this.upperLeft()))
  }

  lines() {
    return [this.top(), this.right(), this.bottom(), this.left()]
  }

  // combine two bboxes together, producing a possibly larger box
  add(bbox) {
    return new BBox(
      Math.min(this.x1, bbox.x1),
      Math.max(this.x2, bbox.x2),
      Math.min(this.y1, bbox.y1),
      Math.max(this.y2, bbox.y2),
    )
  }

  continuousCurve() {
    return new CompositeCurve(
      new StraightStroke(this.upperLeft(), this.upperRight()),
      new StraightStroke(this.upperRight(), this.lowerRight()),
      new StraightStroke(this.lowerRight(), this.lowerLeft()),
      new StraightStroke(this.lowerLeft(), this.upperLeft()),
    )
  }

  d() {
    return `M ${this.x1} ${this.y1} L ${this.x2} ${this.y1} L ${this.x2} ${this.y2} L ${this.x1} ${this.y2} L ${this.x1} ${this.y1}`
  }
}

function bboxFromPointCloud(...points) {
  let xs = points.map((pt) => pt.x)
  let ys = points.map((pt) => pt.y)
  return new BBox(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys))
}

const svgBox = {
  template: `
    <svg :viewBox="[bbox.x1, bbox.y1, bbox.x2, bbox.y2]">
      <slot></slot>
    </svg>
  `,
  props: {
    bbox: Object,
  },
}

export { BBox, svgBox, bboxFromPointCloud }
