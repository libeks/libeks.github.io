import { StraightStroke, Polygon } from '/js/lines.js'
import { Point } from '/js/geometry.js'
import { BBox } from '/js/bbox.js'
import { pens } from '/js/plotter/pens.js'
import { Layer } from '/js/plotter/layer.js'

const svgPlot = {
  template: `
    <svg viewBox="0,0,13333,10000" style="border: solid 1px black">
      <g v-for="layer in allLayers">
        <path v-for="curve in layer.curves" :d="curve.d()" :stroke="layer.color" fill="none" stroke-width="3" stroke-opacity="1"/>
      </g>
    </svg>
  `,
  props: {
    scene: Object,
    bbox: Object,
    withFrame: Boolean,
    withGuides: Boolean,
  },
  computed: {
    guideFrameLayer() {
      let yOffset = 0
      if (this.withGuides) {
        yOffset = 800
      }

      const framePadding = 500
      let bbox = new BBox(0, yOffset, 10000, 10000).withPadding(framePadding)

      // return new Layer('frame').withCurves(bbox)
      let layer = new Layer('frame').withCurves(bbox)
      console.log('bbox', bbox, layer)
      return layer
    },
    layers() {
      // only the layers relevant to the scene
      return this.scene.layers
    },
    allLayers() {
      let layers = []
      if (this.withFrame) {
        layers.push(this.guideFrameLayer)
      }
      for (let [name, layer] of Object.entries(this.layers)) {
        console.log('layer', name, layer)
        layers.push(new Layer(name).withCurves(...layer))
      }
      console.log('layers', layers)
      return layers
    },
  },
}

export { svgPlot }
