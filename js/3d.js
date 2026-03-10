import { Point, Vector } from '/js//geometry.js'
import { PointHomo } from '/js/geometryHomo.js'
import { StraightStroke, CompositeCurve, Polygon } from '/js/lines.js'
import { Screen } from '/js/pixelSpace.js'

const threeDScene = {
  template: `
  <g>
    <circle v-if="showPoints" v-for="point in points" class="stroke medium" v-bind="point.cxcyProps()" r="2" />
    <path v-if="showWireframe" v-for="line in wireframe" class="stroke notch" :d="line.d()" :style="{stroke: line.color}"/>
    <path v-if="showTransparentFaces" v-for="face in faces" class="face transparent" :d="face.d()" :style="{fill: face.color}" />
    <path v-if="showFaces" v-for="face in visibleFaces" class="face" :d="face.d()" :style="{fill: face.color}" />
    <path v-if="showVisibleLines" v-for="line in visibleSegments" class="stroke notch segment" :d="line.d()" :style="{stroke:line.color}" />
    <circle v-if="showIntersectionPoints" v-for="point in intersectionPoints" class="stroke medium" v-bind="point.cxcyProps()" r="2" :style="{stroke:point.color}" />
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
    debugColors: Object, // has two keys: points and lines, with a mapping from keys to colors
  },
  methods: {
    range: (n) => Array(n).keys(),
  },
  computed: {
    sceneFrame() {
      return this.scene.getFrame(this.screen, this.frame)
    },
    debugPoints() {
      return this.sceneFrame.debugPoints
    },
    points() {
      return this.sceneFrame.getPointsInCamera()
    },
    wireframe() {
      return this.sceneFrame.getLineObjs().map((line) => {
        let stroke = new StraightStroke(
          line.pointObjs[0].projected.point,
          line.pointObjs[1].projected.point,
        )
        stroke.color = 'black' // default color
        if (this.debugColors && this.debugColors.lines && line.key in this.debugColors.lines) {
          stroke.color = this.debugColors.lines[line.key]
        }
        if (this.debugColors && this.debugColors.faces) {
          let lineFaces = Object.values(line.faces).map((face) => face.key)
          for (let faceID of lineFaces) {
            if (faceID in this.debugColors.faces) {
              stroke.color = this.debugColors.faces[faceID]
            }
          }
        }
        return stroke
      })
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
            ;[ptA, ptB] = [ptB, ptA] // swap
          }
          lines.push(new StraightStroke(ptA, ptB))
        }
        if (lines.length > 0) {
          ret.push(new CompositeCurve(...lines).withColor(face.color))
        }
      }
      return ret
    },
    intersectionPoints() {
      return this.sceneFrame.getIntersectionPoints().map((ptObj) => {
        let point = ptObj.point
        // console.log('this.debugColors.points', this.debugColors.points, ptObj.key)
        if (this.debugColors && this.debugColors.points && ptObj.key in this.debugColors.points) {
          point.color = this.debugColors.points[ptObj.key]
        } else {
          point.color = ptObj.visible ? 'black' : 'red'
        }
        return point
      })
    },
    visibleFaces() {
      return this.sceneFrame.getVisibleFaceSurfaces()
    },
    visibleSegments() {
      return this.sceneFrame.getAllSegments().map((seg) => {
        let stroke = new StraightStroke(seg.a, seg.b)
        if (this.debugColors && this.debugColors.segments && seg.key in this.debugColors.segments) {
          stroke.color = this.debugColors.segments[seg.key]
        } else {
          stroke.color = seg.visible ? 'black' : 'orange'
        }
        if (seg.failure) {
          stroke.color = 'cyan'
        }
        return stroke
      })
    },
  },
}

export { threeDScene }
