import { Point, Vector } from './geometry.js'
import { PointHomo } from './geometryHomo.js'
import { StraightStroke, CompositeCurve, Polygon } from './lines.js'
import { Screen } from './pixelSpace.js'

const threeDScene = {
  template: `
  <g>
    <circle v-if="showPoints" v-for="point in points" class="stroke medium" v-bind="point.cxcyProps()" r="2" />
    <path v-if="showWireframe" v-for="line in wireframe" class="stroke notch" :d="line.d()" />
    <path v-if="showTransparentFaces" v-for="face in faces" class="face" :d="face.d()" :style="{fill: face.color}" />
    <path v-if="showFaces" v-for="face in visibleFaces" class="face" :d="face.d()" :style="{fill: face.color}" />
    <path v-if="showVisibleLines" v-for="line in visibleLines" class="stroke notch segment" :d="line.d()" :style="{stroke:line.color}" />
    <circle v-if="showIntersectionPoints" v-for="point in sceneFrame.getIntersectionPoints()" class="stroke medium" v-bind="point.cxcyProps()" r="2" />
  </g>
  `,
  props: {
    frame: Number,
    showPoints: Boolean, // show all the points as little circles
    showWireframe: Boolean, // show the wireframe of the scene, all edges drawn
    showTransparentFaces: Boolean, // show all faces facing the camere, ignore occlusion
    showFaces: Boolean, // show only face segments that are visible from the camera
    showIntersectionPoints: Boolean, // show the points where visible lines intersect
    showVisibleLines: Boolean, // show all the line segments that are visible from the camera (without fill or sequential joining)
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
          ret.push(new CompositeCurve(...lines).withColor(face.color))
        }
      }
      return ret
    },
    visibleFaces() {
      // let
      return this.faces
    },
    visibleLines() {
      return this.sceneFrame.getAllSegments().map((seg) => {
        let stroke = new StraightStroke(seg.a, seg.b)
        stroke.color = seg.inFront ? 'black' : 'orange'
        return stroke
      })
    },
  },
}

export { threeDScene }
