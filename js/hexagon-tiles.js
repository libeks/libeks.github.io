import { Point, Vector, Line } from '/js/geometry.js'
import {
  CircleArc,
  CubicBezier,
  QuadraticBezier,
  CompositeCurve,
  StraightStroke,
} from '/js/lines.js'

const hexagon = {
  template: `<path class="polygon" :d="getCurve().d()" />`,
  props: {
    side: {
      type: Number,
      default: 100,
    },
  },
  methods: {
    getCurve: function () {
      const halfSide = this.side / 2
      const height = Math.sqrt(3) * halfSide
      const p1 = new Point(-halfSide, -height)
      const p2 = new Point(halfSide, -height)
      const p3 = new Point(this.side, 0)
      const p4 = new Point(halfSide, height)
      const p5 = new Point(-halfSide, height)
      const p6 = new Point(-this.side, 0)
      return new CompositeCurve(
        new StraightStroke(p1, p2),
        new StraightStroke(p2, p3),
        new StraightStroke(p3, p4),
        new StraightStroke(p4, p5),
        new StraightStroke(p5, p6),
        new StraightStroke(p6, p1),
      )
    },
  },
}

export { hexagon }
