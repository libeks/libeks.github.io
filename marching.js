import { toTransform } from './svg-utils.js'
import { SquareGrid, SquarePositioner, setActiveSquare, sqClassName } from './squares.js'
import { Point } from './geometry.js'
import { reverseInterpolate } from './math.js'
import { StraightStroke } from './lines.js'

const marchingSquare = {
  template: `
  <g class="tile">
    <polygon v-if="renderPoly" points="0,0 0,100 100,100 100,0" />
    <path v-for="stroke in strokes(corners)" class="stroke" :d="stroke.d()" />
  </g>`,
  props: { corners: Object, threshold: Number, renderPoly: Boolean },
  methods: {
    strokes: function (corners) {
      // corners are presented in the order of [NW, NE, SW, SE, saddle]
      let above = corners.map((val) => val > this.threshold)
      if (above[0] == above[1] && above[1] == above[2] && above[2] == above[3]) {
        // case 1, all corners the same, no stroke to return
        return []
      }
      if (above[1] == above[2] && above[2] == above[3]) {
        // case 2, top left (NW) corner is different
        const y = 100 * reverseInterpolate(corners[0], corners[2], this.threshold)
        const x = 100 * reverseInterpolate(corners[0], corners[1], this.threshold)
        return [new StraightStroke(new Point(0, y), new Point(x, 0))]
      }
      if (above[0] == above[2] && above[2] == above[3]) {
        // case 3, top left (NE) corner is different
        const y = 100 * reverseInterpolate(corners[1], corners[3], this.threshold)
        const x = 100 * reverseInterpolate(corners[0], corners[1], this.threshold)
        return [new StraightStroke(new Point(100, y), new Point(x, 0))]
      }
      if (above[0] == above[1] && above[1] == above[3]) {
        // case 4, top left (SW) corner is different
        const y = 100 * reverseInterpolate(corners[0], corners[2], this.threshold)
        const x = 100 * reverseInterpolate(corners[2], corners[3], this.threshold)
        return [new StraightStroke(new Point(0, y), new Point(x, 100))]
      }
      if (above[0] == above[1] && above[1] == above[2]) {
        // case 5, top left (SE) corner is different
        const y = 100 * reverseInterpolate(corners[1], corners[3], this.threshold)
        const x = 100 * reverseInterpolate(corners[2], corners[3], this.threshold)
        return [new StraightStroke(new Point(100, y), new Point(x, 100))]
      }
      if (above[0] == above[1] && above[2] == above[3]) {
        // case 6, horizontal bar
        const y1 = 100 * reverseInterpolate(corners[0], corners[2], this.threshold)
        const y2 = 100 * reverseInterpolate(corners[1], corners[3], this.threshold)
        return [new StraightStroke(new Point(0, y1), new Point(100, y2))]
      }
      if (above[0] == above[2] && above[1] == above[3]) {
        // case 7, vartical bar
        const x1 = 100 * reverseInterpolate(corners[0], corners[1], this.threshold)
        const x2 = 100 * reverseInterpolate(corners[2], corners[3], this.threshold)
        return [new StraightStroke(new Point(x1, 0), new Point(x2, 100))]
      }
      // now we need to consider the saddle point
      if (above[0] == above[4]) {
        // case 8, saddle point, two diagonals to the right
        const x1 = 100 * reverseInterpolate(corners[0], corners[1], this.threshold)
        const y1 = 100 * reverseInterpolate(corners[0], corners[2], this.threshold)
        const x2 = 100 * reverseInterpolate(corners[2], corners[3], this.threshold)
        const y2 = 100 * reverseInterpolate(corners[1], corners[3], this.threshold)
        return [
          new StraightStroke(new Point(x1, 0), new Point(100, y2)),
          new StraightStroke(new Point(x2, 100), new Point(0, y1)),
        ]
      }
      if (above[1] == above[4]) {
        // case 9, saddle point, two diagonals to the left
        const x1 = 100 * reverseInterpolate(corners[0], corners[1], this.threshold)
        const y1 = 100 * reverseInterpolate(corners[0], corners[2], this.threshold)
        const x2 = 100 * reverseInterpolate(corners[2], corners[3], this.threshold)
        const y2 = 100 * reverseInterpolate(corners[1], corners[3], this.threshold)
        return [
          new StraightStroke(new Point(x1, 0), new Point(0, y1)),
          new StraightStroke(new Point(x2, 100), new Point(100, y2)),
        ]
      }
      throw 'Unexpected case'
    },
  },
}

const marchingSquares = {
  template: `
  <g class="grid squares">
    <g
      v-for="sq in grid.grid.squares"
      :style="toTransform(grid.mapSquare(sq))"
      :class="sqClassName(sq, selected)"
      :data-sq="sq.string()"
    >
      <marching-square :corners="getSquareCorners(fn,sq)" :threshold="threshold" :renderPoly="renderPoly" />
    </g>
  </g>`,
  props: {
    grid: Object,
    fn: Function,
    showPoints: Boolean,
    threshold: Number,
    renderPoly: Boolean,
  },
  methods: {
    getSquareCorners: function (fn, sq) {
      // corners are presented in the order of [NW, NE, SW, SE, saddle]
      return [
        fn(sq.x * 100, sq.y * 100),
        fn((sq.x + 1) * 100, sq.y * 100),
        fn(sq.x * 100, (sq.y + 1) * 100),
        fn((sq.x + 1) * 100, (sq.y + 1) * 100),
        fn((sq.x + 0.5) * 100, (sq.y + 0.5) * 100),
      ]
    },
    toTransform,
    sqClassName,
  },
  data() {
    return {
      selected: null,
    }
  },
  components: { marchingSquare },
}

export { marchingSquares }
