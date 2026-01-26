import { toTransform } from './svg-utils.js'
import { SquareGrid, SquarePositioner, setActiveSquare, sqClassName } from './squares.js'
import { Point, Vector } from './geometry.js'
import { reverseInterpolate } from './math.js'
import { StraightStroke } from './lines.js'

function squareCurves(corners, threshold) {
  // corners are presented in the order of [NW, NE, SW, SE, saddle]
  // console.log('squareCurves', corners, threshold)
  let above = corners.map((val) => val > threshold)
  if (above[0] == above[1] && above[1] == above[2] && above[2] == above[3]) {
    // case 1, all corners the same, no stroke to return
    return []
  }
  if (above[1] == above[2] && above[2] == above[3]) {
    // case 2, top left (NW) corner is different
    const y = 100 * reverseInterpolate(corners[0], corners[2], threshold)
    const x = 100 * reverseInterpolate(corners[0], corners[1], threshold)
    return [{ curve: new StraightStroke(new Point(0, y), new Point(x, 0)), ends: [0, 3] }]
  }
  if (above[0] == above[2] && above[2] == above[3]) {
    // case 3, top right (NE) corner is different
    const y = 100 * reverseInterpolate(corners[1], corners[3], threshold)
    const x = 100 * reverseInterpolate(corners[0], corners[1], threshold)
    return [{ curve: new StraightStroke(new Point(100, y), new Point(x, 0)), ends: [0, 1] }]
  }
  if (above[0] == above[1] && above[1] == above[3]) {
    // case 4, bottom left (SW) corner is different
    const y = 100 * reverseInterpolate(corners[0], corners[2], threshold)
    const x = 100 * reverseInterpolate(corners[2], corners[3], threshold)
    return [{ curve: new StraightStroke(new Point(0, y), new Point(x, 100)), ends: [2, 3] }]
  }
  if (above[0] == above[1] && above[1] == above[2]) {
    // case 5, bottom right (SE) corner is different
    const y = 100 * reverseInterpolate(corners[1], corners[3], threshold)
    const x = 100 * reverseInterpolate(corners[2], corners[3], threshold)
    return [{ curve: new StraightStroke(new Point(100, y), new Point(x, 100)), ends: [1, 2] }]
  }
  if (above[0] == above[1] && above[2] == above[3]) {
    // case 6, horizontal bar
    const y1 = 100 * reverseInterpolate(corners[0], corners[2], threshold)
    const y2 = 100 * reverseInterpolate(corners[1], corners[3], threshold)
    return [{ curve: new StraightStroke(new Point(0, y1), new Point(100, y2)), ends: [1, 3] }]
  }
  if (above[0] == above[2] && above[1] == above[3]) {
    // case 7, vartical bar
    const x1 = 100 * reverseInterpolate(corners[0], corners[1], threshold)
    const x2 = 100 * reverseInterpolate(corners[2], corners[3], threshold)
    return [{ curve: new StraightStroke(new Point(x1, 0), new Point(x2, 100)), ends: [0, 2] }]
  }
  // now we need to consider the saddle point
  if (above[0] == above[4]) {
    // case 8, saddle point, two diagonals to the right
    const x1 = 100 * reverseInterpolate(corners[0], corners[1], threshold)
    const y1 = 100 * reverseInterpolate(corners[0], corners[2], threshold)
    const x2 = 100 * reverseInterpolate(corners[2], corners[3], threshold)
    const y2 = 100 * reverseInterpolate(corners[1], corners[3], threshold)
    return [
      { curve: new StraightStroke(new Point(x1, 0), new Point(100, y2)), ends: [0, 1] },
      { curve: new StraightStroke(new Point(x2, 100), new Point(0, y1)), ends: [2, 3] },
    ]
  }
  if (above[1] == above[4]) {
    // case 9, saddle point, two diagonals to the left
    const x1 = 100 * reverseInterpolate(corners[0], corners[1], threshold)
    const y1 = 100 * reverseInterpolate(corners[0], corners[2], threshold)
    const x2 = 100 * reverseInterpolate(corners[2], corners[3], threshold)
    const y2 = 100 * reverseInterpolate(corners[1], corners[3], threshold)
    return [
      { curve: new StraightStroke(new Point(x1, 0), new Point(0, y1)), ends: [0, 3] },
      { curve: new StraightStroke(new Point(x2, 100), new Point(100, y2)), ends: [1, 2] },
    ]
  }
  throw 'Unexpected case'
}

const marchingSquare = {
  template: `
  <g class="tile">
    <polygon v-if="renderPoly" points="0,0 0,100 100,100 100,0" />
    <path v-for="stroke in strokes" class="stroke" :d="stroke.curve.d()" />
  </g>`,
  props: { corners: Object, threshold: Number, renderPoly: Boolean },
  computed: {
    strokes() {
      return squareCurves(this.corners, this.threshold)
    },
  },
}

const marchingSquares = {
  template: `
  <g class="grid squares">
    <g
      v-if="renderEachSquare || renderPoly"
      v-for="sq in grid.grid.squares"
      :style="toTransform(grid.mapSquare(sq))"
      :class="sqClassName(sq, selected)"
      :data-sq="sq.string()"
    >
      <g class="tile">
        <polygon v-if="renderPoly" points="0,0 0,100 100,100 100,0" />
        <path v-if="renderEachSquare" v-for="stroke in strokes" class="stroke" :d="stroke.curve.d()" />
      </g>
      <marching-square :corners="getSquareCorners(fn,sq)" :threshold="threshold" :renderPoly="renderPoly" />
    </g>
    <path class="stroke" :d="megacurve" />
  </g>`,
  props: {
    grid: Object,
    fn: Function,
    showPoints: Boolean,
    threshold: Number,
    renderPoly: Boolean,
    renderEachSquare: Boolean,
  },
  methods: {
    getSquareCorners: function (fn, sq) {
      // corners are presented in the order of [NW, NE, SW, SE, saddle]
      return [
        this.corners[[sq.x, sq.y]],
        this.corners[[sq.x + 1, sq.y]],
        this.corners[[sq.x, sq.y + 1]],
        this.corners[[sq.x + 1, sq.y + 1]],
        this.corners[[sq.x, sq.y, 1]],
      ]
    },
    toTransform,
    sqClassName,
  },
  computed: {
    corners() {
      console.log('computing corners')
      let corners = {}
      for (let y = 0; y < this.grid.grid.nY + 2; y++) {
        for (let x = 0; x < this.grid.grid.nX + 2; x++) {
          corners[[x, y]] = this.fn(x * 100, y * 100)
          corners[[x, y, 1]] = this.fn((x + 0.5) * 100, (y + 0.5) * 100) // saddle point
        }
      }
      return corners
    },
    curves() {
      let curves = {}
      for (let sq of this.grid.grid.squares) {
        let corners = [
          this.corners[[sq.x, sq.y]],
          this.corners[[sq.x + 1, sq.y]],
          this.corners[[sq.x, sq.y + 1]],
          this.corners[[sq.x + 1, sq.y + 1]],
          this.corners[[sq.x, sq.y, 1]],
        ]
        curves[[sq.x, sq.y]] = squareCurves(corners, this.threshold)
      }
      return curves
    },
    megacurve() {
      let curves = []
      for (let sq of this.grid.grid.squares) {
        let lines = this.curves[[sq.x, sq.y]]
        let vect = new Vector(sq.x * 100, sq.y * 100)
        for (let c of lines) {
          curves.push(c.curve.move(vect).d())
        }
      }
      // console.log("megacurve", curves);
      return curves.join(' ')
    },
  },
  data() {
    return {
      selected: null,
    }
  },
  components: { marchingSquare },
}

export { marchingSquares }
