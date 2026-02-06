import { Point, Vector } from './geometry.js'
import { StraightStroke } from './lines.js'
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
    <g v-for="chord in chords"> <!-- chords -->
      <path class="stroke thick" :d="chord.d()" />
    </g>
  </g>`,
  props: {
    tile: String,
    n: Number,
    radius: Number,
    centerx: Number,
    centery: Number,
  },
  methods: {
    range: (n) => Array(n).keys(),
    StraightStroke,
    hexConversion,
  },
  computed: {
    center() {
      // console.log()
      return new Point(this.centerx, this.centery)
    },
    notchVects() {
      let ret = []
      const initialAngle = 180 - 180 / this.n // ensure that notch number 1 is the top left-most notch, right after the leftmost clockwise
      // const initialAngle = 0;
      for (let i = 0; i < 2 * this.n; i++) {
        ret.push(new Vector(1, 0).rotate(initialAngle - i * (180 / this.n)).mult(this.radius))
      }
      // console.log(ret)
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
    chords() {
      console.log('tile', this.tile)
      let pairs = getPairs(this.tile)
      let ch = []
      for (let p of pairs) {
        const a = getNotchNumber(p[0])
        const b = getNotchNumber(p[1])
        ch.push(new StraightStroke(this.notchPts[a - 1], this.notchPts[b - 1]))
      }
      console.log(ch)
      return ch
    },
  },
}

export { circleChords }
