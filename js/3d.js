import { Point, Vector } from './geometry.js'
import { StraightStroke, CompositeCurve, Polygon } from './lines.js'
import { cameraTransform } from './scene3d.js'
import { Screen } from './pixelSpace.js'

const threeDScene = {
  template: `
  <g>
  	<circle v-if="showPoints" v-for="point in points" class="stroke medium" v-bind="point.cxcyProps()" r="0.5" />
  	<path v-if="showLines" v-for="line in lines" class="stroke notch" :d="line.d()"/>
  </g>
  `,
  props: {
    frame: Number,
    showPoints: Boolean,
    showLines: Boolean,
    scene: Object,
    screen: Object,
  },
  methods: {
    range: (n) => Array(n).keys(),
  },
  computed: {
    points() {
      let pts = []
      for (let obj of this.scene.objects) {
        for (let pt of obj.getFrame(this.frame).points) {
          let projectedPt = cameraTransform(pt.toHomo(), this.screen)
          pts.push(projectedPt)
        }
      }
      return pts
    },
    lines() {
      let lines = []
      for (let obj of this.scene.objects) {
        let objFrame = obj.getFrame(this.frame)
        let pts = objFrame.points.map((pt) => cameraTransform(pt.toHomo(), this.screen))
        for (let face of objFrame.faces) {
          let faceLines = []
          for (let i = 0; i < face.length; i++) {
            // console.log('lines from', pts[face[i]])
            faceLines.push(
              new StraightStroke(pts[face[i]].point, pts[face[(i + 1) % face.length]].point),
            )
          }
          lines.push(new CompositeCurve(...faceLines))
        }
      }
      // return [new StraightStroke(new Point(100, 100), new Point(200, 200))]
      // console.log('lines', lines)
      return lines
    },
  },
}

export { threeDScene }
