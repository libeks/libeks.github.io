import { Point, Vector, Line } from '/js/geometry.js'
import { StraightStroke, CompositeCurve } from '/js/lines.js'
import { reduceIntervals, enumerate, pairs, range } from '/js/utils.js'

const THRESHOLD = 0.1

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
    if (bbox.type != 'BBox') {
      throw `bbox.boxInside called with unexpected argument ${bbox.type}`
    }
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
    return new Line(this.upperRight(), this.upperRight().vectTo(this.upperLeft()))
  }

  right() {
    return new Line(this.lowerRight(), this.lowerRight().vectTo(this.upperRight()))
  }

  bottom() {
    return new Line(this.lowerLeft(), this.lowerLeft().vectTo(this.lowerRight()))
  }

  left() {
    return new Line(this.upperLeft(), this.upperLeft().vectTo(this.lowerLeft()))
  }

  // return the perimeter lines, in counter-clockwise order, starting at the top
  lines() {
    return [this.top(), this.left(), this.bottom(), this.right()]
  }

  // combine two bboxes together, producing a possibly larger box
  add(bbox) {
    return new BBox(
      Math.min(this.x1, bbox.x1),
      Math.min(this.y1, bbox.y1),
      Math.max(this.x2, bbox.x2),
      Math.max(this.y2, bbox.y2),
    )
  }

  corners() {
    return [this.upperLeft(), this.upperRight(), this.lowerRight(), this.lowerLeft()]
  }

  // return a composite line that traces the perimeter, counter-clockwise, starting at the top
  continuousCurve() {
    return new CompositeCurve(
      new StraightStroke(this.upperRight(), this.upperLeft()),
      new StraightStroke(this.upperLeft(), this.lowerLeft()),
      new StraightStroke(this.lowerLeft(), this.lowerRight()),
      new StraightStroke(this.lowerRight(), this.upperRight()),
    )
  }

  // return a point on the perimeter, given the t-value [0,4), such that,
  // counter-clockwise [0,1) is top, [1,2) is left, [2,3) is bottom, [3,4) is right
  at(t) {
    if (t < 0 || t > 4) {
      throw `BBox.at got unexpected argument ${t}`
    }
    if (t < 1) {
      return this.top().at(t)
    }
    if (t < 2) {
      return this.left().at(t - 1)
    }
    if (t < 3) {
      return this.bottom().at(t - 2)
    }
    return this.right().at(t - 3)
  }

  // given a point on the perimeter, return the t-value that matches to it, so pt.same(bbox.at(bbox.perimeterPoint(pt))) == true
  perimeterPointT(point) {
    if (point.type != 'Point') {
      throw `BBox.perimeterPointT got unexpected argument ${point.type}`
    }
    let distances = []
    for (let [id, line] of enumerate(this.lines())) {
      let nPt = line.projectPoint(point)
      if (nPt.distance(point) < THRESHOLD) {
        return id + line.pointProjectionTValue(point)
      } else {
        distances.push(nPt.distance(point))
      }
    }
    console.trace()
    console.warn('point', point, 'bbox', this, distances)
    throw `Point ${point.string()} doesn't appear to be on the perimeter of bbox, distance of ${distances}`
  }

  // given two t-values in the range [0,4), return the counter-clockwise path on the perimeter from a to b
  // if a > b, pass through the upper right corner
  // t-values correspond to the at(t) method
  perimeterPath(a, b) {
    if (a == b) {
      return new CompositeCurve(new StraightStroke(this.at(a), this.at(b)))
    }
    if (b < a) {
      b += 4
    }
    // let start = this.at(a)
    let controls = [a]
    for (let i = Math.floor(a + 1); i < b; i++) {
      controls.push(i % 4)
    }
    controls.push(b % 4)
    let components = pairs(controls).map(([a, b]) => new StraightStroke(this.at(a), this.at(b)))
    return new CompositeCurve(...components)
  }

  // partition the bbox into rows and columns, returning an array of {row, column, bbox}
  partition(rows, columns) {
    let ret = []
    let colWidth = this.width() / columns
    let rowHeight = this.height() / rows
    for (let rowID of range(rows)) {
      for (let columnID of range(columns)) {
        let upperLeft = this.upperLeft().addVect(new Vector(colWidth * columnID, rowHeight * rowID))
        let lowerRight = upperLeft.addVect(new Vector(colWidth, rowHeight))
        ret.push({
          bbox: new BBox(upperLeft.x, upperLeft.y, lowerRight.x, lowerRight.y),
          row: rowID,
          column: columnID,
        })
      }
    }
    return ret
  }

  clipLine(line) {
    if (line.type != 'Line') {
      throw `BBox.clipLine got unexpected argument ${line.type}`
    }
    let ts = []
    for (let boxLine of this.lines()) {
      let t = line.intersectT(boxLine)
      if (t != null) {
        ts.push(t)
      }
    }
    ts.sort((a, b) => a - b)
    let intervals = reduceIntervals(ts, (t) => this.inside(line.at(t)))
    let ans = reduceIntervals(ts, (t) => this.inside(line.at(t))).map(
      ([a, b]) => new StraightStroke(line.at(a), line.at(b)),
    )
    return ans
  }

  d() {
    return `M ${this.x1} ${this.y1} L ${this.x2} ${this.y1} L ${this.x2} ${this.y2} L ${this.x1} ${this.y2} L ${this.x1} ${this.y1}`
  }
}

function composeBBoxes(bboxes) {
  if (bboxes.length == 0) {
    return new BBox(0, 0, 0, 0)
  }
  let bbox = bboxes[0]
  for (let [_, box] of pairs(bboxes)) {
    bbox = bbox.add(box)
  }
  return bbox
}

function bboxFromPointCloud(...points) {
  for (let pt of points) {
    if (pt.type != 'Point') {
      throw `bboxFromPointCloud got unexpected argument ${pt.type}`
    }
  }
  let xs = points.map((pt) => pt.x)
  let ys = points.map((pt) => pt.y)
  return new BBox(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys))
}

const svgBox = {
  template: `
    <svg :viewBox="[bbox.x1, bbox.y1, bbox.width(), bbox.height()]">
      <slot></slot>
    </svg>
  `,
  props: {
    bbox: Object,
  },
}

export { BBox, svgBox, bboxFromPointCloud, composeBBoxes }
