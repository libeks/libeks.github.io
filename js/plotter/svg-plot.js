import { StraightStroke, Polygon } from '/js/lines.js'
import { Point, Vector } from '/js/geometry.js'
import { BBox } from '/js/bbox.js'
import { pens } from '/js/plotter/pens.js'
import { Layer } from '/js/plotter/layer.js'
import { range, enumerate } from '/js/utils.js'

const svgPlot = {
  template: `
    <div>
      <div class='plot' ref="plot" style="border: solid 1px black">
        <svg viewBox="0,0,13333,10000"  version="1.1" sodipodi:docname="test_inkscape.svg" inkscape:version="1.3.2 (091e20e, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg">
          <g v-for="layer in allLayers" inkscape:groupmode="layer" :inkscape:label="layer.name">
            <path v-for="curve in layer.curves" :d="curve.d()" :stroke="layer.color" fill="none" stroke-width="3" stroke-opacity="0.5"/>
          </g>
        </svg>
      </div>
      <a ref="download" @click="getSVG" >⤓ Download SVG</a>
      <div class="plot-statistics">
        <ul>
          <li v-for="layer in allLayers">{{layer.name}}</li>
        </ul>
      </div>

    </div>

  `,
  props: {
    scene: Object,
    bbox: Object,
    withFrame: Boolean,
    withGuides: Boolean,
  },
  methods: {
    getSVG() {
      // console.log()
      // const data = new XMLSerializer().serializeToString(this.$refs.plot.children[0])
      let ref = this.$refs.plot.children[0].outerHTML
      // console.log('blob', ref)
      const blob = new Blob([ref], { type: 'image/svg+xml' })
      // console.log('blob', blob)
      const href = URL.createObjectURL(blob)
      // console.log('href', href)
      let element = document.createElement('a')
      // element.setAttribute('href', 'data:application/json;charset=utf-8,' + href)
      element.setAttribute('href', href)
      element.setAttribute('download', 'plot.svg')
      element.setAttribute('target', '_blank')
      element.style.display = 'none'
      document.body.appendChild(element)
      // console.log('element', element)
      element.click()
      document.body.removeChild(element)
      setTimeout(function () {
        URL.revokeObjectURL(href)
      }, 20)
    },
  },
  computed: {
    canvas() {
      let yOffset = 0
      if (this.withGuides) {
        yOffset = 800
      }
      const framePadding = 500
      return new BBox(0, yOffset, 13333, 10000).withPadding(framePadding)
    },
    guideFrameLayer() {
      return new Layer('frame').withCurves([this.canvas])
    },
    layers() {
      // only the layers relevant to the scene
      return this.scene.place(this.canvas).layers
    },
    combLayer() {
      // return the combs for the guides to be printed into
      if (!this.withGuides) {
        return []
      }

      let n = 0
      // console.log('layers', this.layers)
      for (let layer of Object.values(this.namedLayers)) {
        if (layer.drawGuides) {
          n += 1
        }
      }

      let lines = []

      for (let i of range(n)) {
        let offset = new Vector(i * 1000, 0)
        let increment = 25 // gap between comb ticks
        let top = []
        let right = []
        let bottom = []
        let left = []
        for (let j = 300.0; j <= 700.0; j += increment) {
          let len = 75.0
          if (j == 500) {
            len = 100.0
          }
          top.push(new StraightStroke(new Point(j, 300 - len), new Point(j, 300)).move(offset))
          bottom.push(new StraightStroke(new Point(j, 700), new Point(j, 700 + len)).move(offset))
          left.push(new StraightStroke(new Point(300 - len, j), new Point(300, j)).move(offset))
          right.push(new StraightStroke(new Point(700 + len, j), new Point(700, j)).move(offset))
        }
        lines.push(...top, ...right, ...bottom, ...left)
      }
      if (lines.length == 0) {
        return null
      }
      return new Layer('combs').withCurves(lines)
    },
    namedLayers() {
      let layers = []
      for (let [name, layer] of Object.entries(this.layers)) {
        // console.log('namedLayers', layer)
        layers.push(new Layer(name).withCurves(layer).withGuides())
      }
      return layers
    },
    allLayers() {
      let layers = []
      if (this.withFrame) {
        layers.push(this.guideFrameLayer)
      }
      if (this.withGuides && this.combLayer) {
        layers.push(this.combLayer)
      }

      let offset = new Vector(0, 0)
      for (let layer of this.namedLayers) {
        if (layer.drawGuides) {
          layers.push(
            new Layer(`guide - ${layer.name}`).withCurves([
              new StraightStroke(new Point(500, 300), new Point(500, 700)).move(offset),
              new StraightStroke(new Point(300, 500), new Point(700, 500)).move(offset),
            ]),
          )
          offset = offset.add(new Vector(1000, 0))
        }
        layers.push(layer)
      }
      // prefix each layer with a numerical index
      for (let [id, layer] of enumerate(layers)) {
        layer.name = `${id} - ${layer.name}`
      }

      return layers
    },
  },
}

export { svgPlot }
