import { Point, Vector } from './geometry.js'
import { StraightStroke, CircleArc, CompositeCurve } from './lines.js'
import { hexConversion, getNotchNumber } from './catalan.js'

// Given a string, return an array of strings of two characters each, which add up to the input string
function getPairs(s) {
  const len = 2
  var chunks = []

  for (var i = 0, charsLength = s.length; i < charsLength; i += len) {
    chunks.push(s.substring(i, i + len))
  }
  return chunks
}

const circleChords = {
  template: `
  <g>
    <circle :cx="centerx" :cy="centery" :r="radius" />
    <g v-for="(nv, index) in notchVects"> <!-- notches -->
      <path class="notch" :d="new StraightStroke(center.addVect(nv.mult(0.95)), center.addVect(nv.mult(1.05))).d()" />
      <text :x="notchLabelPos[index].x" :y="notchLabelPos[index].y" class="notchText">{{hexConversion(index+1)}}</text>
    </g>
    <g v-if="!showArcs" v-for="chord in chords"> <!-- chords -->
      <path class="stroke thick" :d="chord.d()" />
    </g>
    <g v-if="showArcs" v-for="chord in arcChords"> <!-- arcChords -->
      <path class="stroke thick" :d="chord.d()" />
    </g>
  </g>`,
  props: {
    tile: String,
    n: Number,
    radius: Number,
    centerx: Number,
    centery: Number,
    showArcs: Boolean,
  },
  methods: {
    range: (n) => Array(n).keys(),
    StraightStroke,
    hexConversion,
  },
  computed: {
    center() {
      return new Point(this.centerx, this.centery)
    },
    notchVects() {
      let ret = []
      const initialAngle = 180 - 180 / this.n // ensure that notch number 1 is the top left-most notch, right after the leftmost clockwise
      for (let i = 0; i < 2 * this.n; i++) {
        ret.push(new Vector(1, 0).rotate(initialAngle - i * (180 / this.n)).mult(this.radius))
      }
      return ret
    },
    notchPts() {
      let ret = []
      for (let nv of this.notchVects) {
        ret.push(this.center.addVect(nv))
      }
      return ret
    },
    notchLabelPos() {
      let ret = []
      for (let [i, nv] of this.notchVects.entries()) {
        ret.push(this.notchPts[i].addVect(nv.unit().mult(30).add(new Vector(0, 10))))
      }
      return ret
    },
    arcChords() {
      let pairs = getPairs(this.tile)
      let ch = []
      const angleStep = (2 * Math.PI) / (2 * this.n)
      for (let p of pairs) {
        let a = getNotchNumber(p[0])
        let b = getNotchNumber(p[1])
        let distance = b - a
        if (distance > this.n) {
          // swap a and b
          let temp = a
          a = b
          b = temp
          distance = 2 * this.n - distance // use the shorter distance the other way around the circle
        }
        const angle = (angleStep * distance) / 2
        ch.push(
          new CircleArc(
            this.notchPts[a - 1],
            this.notchPts[b - 1],
            this.radius * Math.tan(angle),
            0,
            0,
          ),
        )
      }
      return ch
    },
    chords() {
      let pairs = getPairs(this.tile)
      let ch = []
      for (let p of pairs) {
        const a = getNotchNumber(p[0])
        const b = getNotchNumber(p[1])
        ch.push(new StraightStroke(this.notchPts[a - 1], this.notchPts[b - 1]))
      }
      return ch
    },
  },
}

const latticePaths = {
  template: `
  <g>
    <g v-for="x in range(n)"> <!-- lattice -->
      <path class="dashed gray" :d="new StraightStroke(leftCorner.addVect(new Vector(size,0).mult(x)), leftCorner.addVect(new Vector(size,0).mult(x)).addVect(upRight.mult(n-x))).d()" />
      <path class="dashed gray" :d="new StraightStroke(rightCorner.addVect(new Vector(-size,0).mult(x)), rightCorner.addVect(new Vector(-size,0).mult(x)).addVect(upLeft.mult(n-x))).d()" />
    </g>
    <path class="red" :d="new StraightStroke(leftCorner, rightCorner).d()" />
    <g> <!-- path -->
      <path class="stroke medium" :d="path.d()" />
    </g>
  </g>`,
  props: {
    tile: String,
    n: Number,
    size: Number,
    padding: Number,
  },
  methods: {
    range: (n) => Array(n).keys(),
    StraightStroke,
    Point,
    Vector,
  },
  computed: {
    upRight() {
      return new Vector(this.size / 2, -this.size / 2)
    },
    upLeft() {
      return new Vector(-this.size / 2, -this.size / 2)
    },
    leftCorner() {
      return new Point(this.padding, (this.n / 2) * this.size + this.padding)
    },
    rightCorner() {
      return new Point(this.n * this.size + this.padding, (this.n / 2) * this.size + this.padding)
    },
    path() {
      let curves = new CompositeCurve()
      let startPoint = this.leftCorner
      for (let ch of this.tile) {
        let endPoint
        if (ch == '(') {
          endPoint = startPoint.addVect(this.upRight)
        } else if (ch == ')') {
          endPoint = startPoint.addVect(this.upLeft.mult(-1))
        } else {
          throw 'Unknown character'
        }
        curves.add(new StraightStroke(startPoint, endPoint))
        startPoint = endPoint
      }
      return curves
    },
  },
}

export { circleChords, latticePaths }
