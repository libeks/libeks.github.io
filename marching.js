import { toTransform } from './svg-utils.js'
import { SquareGrid, SquarePositioner, setActiveSquare, sqClassName } from './squares.js'
import { Point, Vector } from './geometry.js'
import { reverseInterpolate } from './math.js'
import { StraightStroke } from './lines.js'

function squareCurves(corners, threshold, size) {
  // corners are presented in the order of [NW, NE, SW, SE, saddle]
  // console.log('squareCurves', corners, threshold)
  let above = corners.map((val) => val > threshold)
  if (above[0] == above[1] && above[1] == above[2] && above[2] == above[3]) {
    // case 1, all corners the same, no stroke to return
    return []
  }
  if (above[1] == above[2] && above[2] == above[3]) {
    // case 2, top left (NW) corner is different
    const y = size * reverseInterpolate(corners[0], corners[2], threshold)
    const x = size * reverseInterpolate(corners[0], corners[1], threshold)
    return [{ curve: new StraightStroke(new Point(0, y), new Point(x, 0)), ends: [0, 3] }]
  }
  if (above[0] == above[2] && above[2] == above[3]) {
    // case 3, top right (NE) corner is different
    const y = size * reverseInterpolate(corners[1], corners[3], threshold)
    const x = size * reverseInterpolate(corners[0], corners[1], threshold)
    return [{ curve: new StraightStroke(new Point(size, y), new Point(x, 0)), ends: [0, 1] }]
  }
  if (above[0] == above[1] && above[1] == above[3]) {
    // case 4, bottom left (SW) corner is different
    const y = size * reverseInterpolate(corners[0], corners[2], threshold)
    const x = size * reverseInterpolate(corners[2], corners[3], threshold)
    return [{ curve: new StraightStroke(new Point(0, y), new Point(x, size)), ends: [2, 3] }]
  }
  if (above[0] == above[1] && above[1] == above[2]) {
    // case 5, bottom right (SE) corner is different
    const y = size * reverseInterpolate(corners[1], corners[3], threshold)
    const x = size * reverseInterpolate(corners[2], corners[3], threshold)
    return [{ curve: new StraightStroke(new Point(size, y), new Point(x, size)), ends: [1, 2] }]
  }
  if (above[0] == above[1] && above[2] == above[3]) {
    // case 6, horizontal bar
    const y1 = size * reverseInterpolate(corners[0], corners[2], threshold)
    const y2 = size * reverseInterpolate(corners[1], corners[3], threshold)
    return [{ curve: new StraightStroke(new Point(0, y1), new Point(size, y2)), ends: [1, 3] }]
  }
  if (above[0] == above[2] && above[1] == above[3]) {
    // case 7, vartical bar
    const x1 = size * reverseInterpolate(corners[0], corners[1], threshold)
    const x2 = size * reverseInterpolate(corners[2], corners[3], threshold)
    return [{ curve: new StraightStroke(new Point(x1, 0), new Point(x2, size)), ends: [0, 2] }]
  }
  // now we need to consider the saddle point
  if (above[0] == above[4]) {
    // case 8, saddle point, two diagonals to the right
    const x1 = size * reverseInterpolate(corners[0], corners[1], threshold)
    const y1 = size * reverseInterpolate(corners[0], corners[2], threshold)
    const x2 = size * reverseInterpolate(corners[2], corners[3], threshold)
    const y2 = size * reverseInterpolate(corners[1], corners[3], threshold)
    return [
      { curve: new StraightStroke(new Point(x1, 0), new Point(size, y2)), ends: [0, 1] },
      { curve: new StraightStroke(new Point(x2, size), new Point(0, y1)), ends: [2, 3] },
    ]
  }
  if (above[1] == above[4]) {
    // case 9, saddle point, two diagonals to the left
    const x1 = size * reverseInterpolate(corners[0], corners[1], threshold)
    const y1 = size * reverseInterpolate(corners[0], corners[2], threshold)
    const x2 = size * reverseInterpolate(corners[2], corners[3], threshold)
    const y2 = size * reverseInterpolate(corners[1], corners[3], threshold)
    return [
      { curve: new StraightStroke(new Point(x1, 0), new Point(0, y1)), ends: [0, 3] },
      { curve: new StraightStroke(new Point(x2, size), new Point(size, y2)), ends: [1, 2] },
    ]
  }
  throw 'Unexpected case'
}

const marchingSquare = {
  template: `
  <g class="tile">
    <polygon v-if="renderSquareGrid" :points="points" />
    <path v-if="renderSquareStrokes" v-for="stroke in strokes" class="stroke" :d="stroke.curve.d()" />
  </g>`,
  props: {
    corners: Object,
    threshold: Number,
    renderSquareGrid: Boolean,
    renderSquareStrokes: Boolean,
    size: Number,
  },
  computed: {
    strokes() {
      return squareCurves(this.corners, this.threshold, this.size)
    },
    points() {
      return `0,0 0,${this.size} ${this.size},${this.size} ${this.size},0`
    },
  },
}

const marchingSquares = {
  template: `
  <g class="grid squares">
    <g v-if="renderPoints">
      <circle v-for="sq in grid.grid.squares" :cx="sq.x*grid.size" :cy="sq.y*grid.size" :r="grid.size/4" :style="colorFromVal(corners[[sq.x, sq.y]])" />
    </g>
    <g
      v-if="renderSquareStorkes || renderSquareGrid"
      v-for="sq in grid.grid.squares"
      :style="toTransform(grid.mapSquare(sq))"
      :class="sqClassName(sq, selected)"
      :data-sq="sq.string()"
    >
      <marching-square :corners="getSquareCorners(fn,sq)" :threshold="threshold" :renderSquareGrid="renderSquareGrid" :renderSquareStrokes="renderSquareStrokes" :size="grid.size" />
    </g>
    <path v-if="!renderSquareStrokes" class="stroke" :d="megacurve" />
    
  </g>`,
  props: {
    grid: Object,
    fn: Function,
    threshold: Number,
    renderPoints: Boolean,
    renderSquareGrid: Boolean, // render the grid lines of the squares
    renderSquareStrokes: Boolean, // render the strokes within each square, otherwise only render the megacurve
  },
  methods: {
    getSquareCorners: function (fn, sq) {
      // corners are presented in the order of [NW, NE, SW, SE, saddle]
      return [
        this.corners[[sq.x, sq.y]],
        this.corners[[sq.x + 1, sq.y]],
        this.corners[[sq.x, sq.y + 1]],
        this.corners[[sq.x + 1, sq.y + 1]],
        this.corners[[sq.x, sq.y, 1]], // saddle point
      ]
    },
    toTransform,
    sqClassName,
    colorFromVal: function (val) {
      return `fill: hsl(0, 0%, ${100 * ((-val / 2 + 1) / 2)}%)`
    },
  },
  computed: {
    corners() {
      let corners = {}
      for (let y = 0; y < this.grid.grid.nY + 2; y++) {
        for (let x = 0; x < this.grid.grid.nX + 2; x++) {
          corners[[x, y]] = this.fn(x * this.grid.size, y * this.grid.size)
          corners[[x, y, 1]] = this.fn((x + 0.5) * this.grid.size, (y + 0.5) * this.grid.size) // saddle point
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
        curves[[sq.x, sq.y]] = squareCurves(corners, this.threshold, this.grid.size)
      }
      return curves
    },
    megacurve() {
      let curves = []
      for (let sq of this.grid.grid.squares) {
        let lines = this.curves[[sq.x, sq.y]]
        let vect = new Vector(sq.x * this.grid.size, sq.y * this.grid.size)
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
