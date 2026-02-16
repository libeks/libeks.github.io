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
      // console.log(this.screen)
      return this.scene.getFrame(this.screen, this.frame)
    },
    points() {
      let pts = []
      // console.log(this.sceneFrame)
      for (let obj of this.sceneFrame.objects) {
        // console.log('obj', obj)
        for (let pt of obj.points) {
          // console.log(this.screen)
          let projectedPt = this.screen.homoToPixel(pt)

          // for debugging purposes, reverse engineer the position of the point by sending a ray back into the scene
          let ray = this.screen.reverseRay(projectedPt.point.x, projectedPt.point.y)
          let p = ray.at(1)
          let newPixel = this.screen.homoToPixel(new PointHomo(p.x, p.y, p.z, 1))
          pts.push(newPixel)
        }
      }
      pts = pts.filter((pt) => pt.depth > 0) // filter out points behind the camera
      return pts
    },
    wireframe() {
      let lines = []
      for (let obj of this.sceneFrame.objects) {
        // let objFrame = obj.getFrame(this.frame)

        let pts = obj.points.map((pt) => this.screen.homoToPixel(pt))
        let validPts = pts.map((pt) => pt.depth > 0) // bool value mapping whether a point is in front of the camera
        for (let face of obj.faces) {
          if (face.map((id) => validPts[id]).every((val) => val)) {
            // all points are in front of the camera
            let faceLines = []
            for (let i = 0; i < face.length; i++) {
              faceLines.push(
                new StraightStroke(pts[face[i]].point, pts[face[(i + 1) % face.length]].point),
              )
            }
            lines.push(new CompositeCurve(...faceLines))
          } else {
            console.log('face has some points behind the camera')
          }
        }
      }
      return lines
    },
    faces() {
      let faces = []
      for (let obj of this.scene.objects) {
        let objFrame = obj.getFrame(this.frame)
        let pts = objFrame.points.map((pt) => this.screen.homoToPixel(pt))
        let validPts = pts.map((pt) => pt.depth > 0) // bool value mapping whether a point is in front of the camera
        for (let face of objFrame.faces) {
          if (face.map((id) => validPts[id]).every((val) => val)) {
            // all points are in front of the camera
            let faceLines = []
            for (let i = 0; i < face.length; i++) {
              faceLines.push(
                new StraightStroke(pts[face[i]].point, pts[face[(i + 1) % face.length]].point),
              )
            }
            lines.push(new CompositeCurve(...faceLines))
          } else {
            console.log('face has some points behind the camera')
          }
        }
      }
      return faces
    },
  },
}

export { threeDScene }
