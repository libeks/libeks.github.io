import { Point, Vector } from './geometry.js'
import { PointHomo } from './geometryHomo.js'
import { StraightStroke, CompositeCurve, Polygon } from './lines.js'
import { Screen } from './pixelSpace.js'

const threeDScene = {
  template: `
  <g>
  	<circle v-if="showPoints" v-for="point in points" class="stroke medium" v-bind="point.cxcyProps()" r="2" />
  	<path v-if="showWireframe" v-for="line in wireframe" class="stroke notch" :d="line.d()" />
  	<path v-if="showFaces" v-for="face in faces" class="face" :d="face.d()" />
  </g>
  `,
  props: {
    frame: Number,
    showPoints: Boolean,
    showWireframe: Boolean,
    showFaces: Boolean,
    scene: Object,
    screen: Object,
  },
  methods: {
    range: (n) => Array(n).keys(),
  },
  computed: {
    sceneFrame() {
      return this.scene.getFrame(this.screen, this.frame)
    },
    points() {
      return this.sceneFrame.getPointsInCamera()
    },
    wireframe() {
      return this.sceneFrame
        .getLineObjs()
        .map(
          (line) =>
            new StraightStroke(
              line.pointObjs[0].projected.point,
              line.pointObjs[1].projected.point,
            ),
        )
    },
    faces() {
      let ret = []
      for (let face of this.sceneFrame.getFaceObjs()) {
        if (!face.facesCamera) {
          continue
        }
        let lines = []
        for (let line of face.lines) {
          let ptA = line.line.pointObjs[0].projected.point
          let ptB = line.line.pointObjs[1].projected.point
          if (line.reverse) {
            let temp = ptA
            ptA = ptB
            ptB = temp
          }
          lines.push(new StraightStroke(ptA, ptB))
        }
        if (lines.length > 0) {
          ret.push(new CompositeCurve(...lines))
        }
      }
      return ret
    },
  },
}

export { threeDScene }
