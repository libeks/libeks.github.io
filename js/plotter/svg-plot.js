import { StraightStroke, Polygon } from '/js/lines.js'
import { Point, Vector } from '/js/geometry.js'
import { BBox } from '/js/bbox.js'
import { range, enumerate } from '/js/utils.js'
import { incrementalButtons, radioButtons } from '/js/buttons.js'

import { pens } from '/js/plotter/pens.js'
import { Layer } from '/js/plotter/layer.js'

const svgPlot = {
  template: `
    <div>
      <div class='plot' ref="plot" style="border: solid 1px black">
        <svg viewBox="0,0,13333,10000"  version="1.1" sodipodi:docname="test_inkscape.svg" inkscape:version="1.3.2 (091e20e, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg">
          <metadata class="configs" v-html="rawHTMLComment" />
          <g v-for="layer in allLayers" inkscape:groupmode="layer" :inkscape:label="layer.displayName" :transform="layer.transform()">
            <path v-for="curve in layer.curves" :d="curve.d()" :stroke="layer.color" fill="none" :stroke-width="layer.pen.spacing" stroke-opacity="0.5"/>
          </g>
        </svg>
      </div>
      <a ref="download" @click="getSVG" >⤓ Download SVG</a>
      <div class="plot-statistics">
        <table>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Time</th>
              <th scope="col">Pen</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="layer in allLayers">
              <td>{{layer.displayName}}</td>
              <td style="text-align: right">{{prettyTime(layer.statistics().time)}}</td>
              <td v-if="!layer.child" :rowspan="layer.parent ? 2 : 1" :style="{color: layer.color}">{{layer.pen.name}}</td>
            </tr>
          </tbody>
        </table>
        <div class="options">
          <div v-for="option in scene.options">
            <div class="name">{{option.name}}</div>
            <select v-if="option.type=='dropdown' "v-model="scene.configs[option.name]">
              <option v-for="elt of option.options" :value="elt.value">{{elt.name}}</option>
            </select>
            <incremental-buttons 
              v-if="option.type=='incremental'" 
              :n="scene.configs[option.name]" 
              :min="option.min" 
              :max="option.max" 
              :step="option.step"
              @value="(n) => scene.configs[option.name] = n"/>
            <radio-buttons
              v-if="option.type=='radioButton'"
              :choices="option.choices"
              :value="scene.configs[option.name]"
              @set-choice="(v) => scene.configs[option.name] = v"
            > </radio-buttons>
            <input
              v-if="option.type=='slider'"
              class="slider"
              type="range"
              :name="option.name"
              :min="option.min"
              :max="option.max"
              :step="option.step"
              v-model.number="scene.configs[option.name]"
            />
            
          </div>
        </div>
      </div>

    </div>

  `,
  // data() {
  //   let configs = {}
  //   for (let option of this.scene.options) {
  //     configs[option.name] = option.default
  //   }
  //   console.log('configs', configs)
  //   return {
  //     configs,
  //   }
  // },
  props: {
    scene: Object,
    bbox: Object,
    withFrame: Boolean,
    withGuides: Boolean,
  },
  methods: {
    getSVG() {
      let ref = this.$refs.plot.children[0].outerHTML
      const blob = new Blob([ref], { type: 'image/svg+xml' })
      const href = URL.createObjectURL(blob)
      let element = document.createElement('a')
      element.setAttribute('href', href)
      element.setAttribute('download', 'plot.svg')
      element.setAttribute('target', '_blank')
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      setTimeout(function () {
        URL.revokeObjectURL(href)
      }, 20)
    },
    prettyTime(t) {
      let hours = Math.trunc(t / 3600)
      let minutes = Math.trunc((t % 3600) / 60)
      let seconds = Math.trunc(t % 60)
      let hoursChunk = hours > 0 ? `${hours}h` : ''
      let minutesChunk = minutes > 0 ? `${minutes}m` : ''
      let secondsChunk = `${seconds}s` // display '0s' as a last resort
      return `${hoursChunk}${minutesChunk}${secondsChunk}`
    },
    // configValue(key) {
    //   if (key in this.configs) {
    //     return this.configs[key]
    //   }
    //   return this.scene.options[key].default
    // },
  },
  components: {
    incrementalButtons,
    radioButtons,
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
      return new Layer('frame').withCurves([this.canvas.continuousCurve()])
    },
    layers() {
      // only the layers relevant to the scene
      console.log('computing layers with', this.scene.configs)
      let layerDict = this.scene.place(this.canvas, this.scene.configs).layers
      // console.log('layers', layerDict)
      // Object.values(layerDict).forEach((elt) => elt.optimize()) // optimize the layer
      return layerDict
    },
    rawHTMLComment() {
      return `<!-- ${Object.keys(this.scene.configs)} -->`
    },
    combLayer() {
      // return the combs for the guides to be printed into
      if (!this.withGuides) {
        return []
      }

      let n = 0
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
        let layerObj = new Layer(name).withCurves(layer.curves).withGuides()
        if (layer.color) {
          layerObj = layerObj.withColor(layer.color)
        }
        if (layer.pen) {
          layerObj = layerObj.withPen(layer.pen)
        }
        if (layer.dontOptimize) {
          layerObj = layerObj.withoutOptimize()
        }
        console.log('before', layerObj.name, layerObj.statistics())
        layerObj = layerObj.optimize()
        console.log('after', layerObj.name, layerObj.statistics())
        layers.push(layerObj)
      }
      return layers
    },
    allLayers() {
      let layers = []
      console.log('scene options', this.scene.options)
      if (this.withFrame) {
        layers.push(this.guideFrameLayer)
      }
      if (this.withGuides && this.combLayer) {
        layers.push(this.combLayer)
      }

      let offset = new Vector(0, 0)
      for (let layer of this.namedLayers) {
        if (layer.drawGuides) {
          let layerObj = new Layer(`guide - ${layer.name}`)
            .withCurves([
              new StraightStroke(new Point(500, 300), new Point(500, 700)).move(offset),
              new StraightStroke(new Point(300, 500), new Point(700, 500)).move(offset),
            ])
            .withPen(layer.pen)

          if (layer.color) {
            layerObj = layerObj.withColor(layer.color)
          }
          layer.attachChild(layerObj) // make sure the real layer has the guide layer as a child
          layers.push(layerObj)
          offset = offset.add(new Vector(1000, 0))
        }
        layers.push(layer)
      }
      // prefix each layer with a numerical index
      for (let [id, layer] of enumerate(layers)) {
        layer.displayName = `${id} - ${layer.name}`
      }

      return layers
    },
  },
}

export { svgPlot }
