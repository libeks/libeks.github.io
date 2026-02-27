import { Point, Vector, Line } from '/js/geometry.js'
import {
  CircleArc,
  CubicBezier,
  QuadraticBezier,
  CompositeCurve,
  StraightStroke,
} from '/js/lines.js'

const hexagon = {
  template: `<path class="stroke" :d="getCurve().d()" />`,
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

      // const points = squareTwoPointFactory(this.side, this.notch)
      // let center = points['center']
      // let p1 = curve[0]
      // let p2 = curve[1]
      // let n1 = points['n' + p1]
      // let n2 = points['n' + p2]
      // let n1star = points['n' + p1 + 'star']
      // let n2star = points['n' + p2 + 'star']

      // if (['12', '34', '56', '78'].includes(curve)) {
      //   // same side
      //   return new CubicBezier(n1, n1star, n2star, n2)
      // }
      // if (['18', '23', '45', '67'].includes(curve)) {
      //   // wrap around a corner
      //   return new QuadraticBezier(n1, n1star, n2)
      // }
      // if (['16', '25', '38', '47'].includes(curve)) {
      //   // straight across
      //   return new StraightStroke(n1, n2)
      // }
      // if (['14', '27', '36', '58'].includes(curve)) {
      //   return new CubicBezier(n1, n1star, n2star, n2)
      // }
      // // catch-all
      // return new StraightStroke(n1, n2)
    },
  },
}

export { hexagon }
