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

  width() {
    return this.x2 - this.x1
  }

  height() {
    return this.y2 - this.y1
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

  d() {
    return `M ${this.x1} ${this.y1} L ${this.x2} ${this.y1} L ${this.x2} ${this.y2} L ${this.x1} ${this.y2} L ${this.x1} ${this.y1}`
  }
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

export { BBox, svgBox }
