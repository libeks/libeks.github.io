import { StraightStroke, Polygon } from '/js/lines.js'
import { Point, Vector } from '/js/geometry.js'
import { BBox } from '/js/bbox.js'
import { range, enumerate, zip } from '/js/utils.js'
import {
  incrementalButtons,
  radioButtons,
  toggleButton,
  selector,
  slider,
  getNumberURL,
} from '/js/buttons.js'

import { pens } from '/js/plotter/pens.js'
import { Layer } from '/js/plotter/layer.js'

const svgPlot = {
  template: `
    <div>
      <div class='plot' ref="plot" style="border: solid 1px black">
        <svg viewBox="0,0,13333,10000"  version="1.1" sodipodi:docname="test_inkscape.svg" inkscape:version="1.3.2 (091e20e, 2023-11-25, custom)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg">
          <metadata class="configs" v-html="rawHTMLComment" > </metadata>
          <g v-for="layer in visibleLayers" inkscape:groupmode="layer" :inkscape:label="layer.displayName" :transform="layerPens[layer.id].transform()">
            <path 
              v-for="curve in layer.getAllCurves(layerPens[layer.id].spacing * penMultipliers[layer.id], showFill)" 
              :d="curve.d()" 
              :stroke="colors[layer.id]" 
              fill="none"
              
              :stroke-width="layerPens[layer.id].spacing" 
              stroke-opacity="0.6" 
              :data-line="curve.id"
            > </path>
          </g>
        </svg>
      </div>
      <div class="button-block" style="display:flex; justify-content: center; padding: 10px;">
        <a class="button" ref="download" @click="getSVG">⤓ Download SVG</a>
      </div>
      <div class="flex-block">
        <div class="plot-statistics">
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Time</th>
                <th scope="col">Pen</th>
                <th scope="col">Visibility</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(layer, id) in allLayers">
                <td>{{layer.displayName}}</td>
                <td style="text-align: right">{{prettyTime(layer.statistics(layerPens[layer.id].spacing * penMultipliers[layer.id], showFill).time)}}</td>
                <td v-if="!layer.child" :rowspan="layer.parent ? 2 : 1" :style="{color: pens[layer.id].color}">
                  <div>
                    <div style="display: flex; gap: 10px">
                      <select v-model="pens[layer.id]" :disabled="disabled[layer.id]">
                        <option v-for="pen of allPens" :value="pen">{{pen.name}}</option>
                      </select>
                      <div v-if="!disabled[layer.id]" class="colorSquare" @click="$refs['dialog-'+layer.id][0].showModal()" :style="{'background-color': colors[layer.id]}"></div>
                    </div>
                    <div v-if="layer.parent && layer.parent.fillCurves.length > 0" >
                      <radio-buttons 
                        class="inline-buttons button-block small" 
                        :choices="[{value:1, display: '1.0'}, {value:1.1, display:'1.1'}, {value:1.2, display: '1.2'},{value:1.5, display: '1.5'}, {value:2, display: '2.0'}]" 
                        v-model="penMultipliers[layer.id]" 
                        @value="val=> changeThicknessMultiplier(layer, val)"
                      > 
                      </radio-buttons>
                    </div>
                  </div>
                  <dialog :id="'dialog-'+layer.id" :ref="'dialog-'+layer.id" closedby="any">
                    <p>Pick a color for {{pens[layer.id].name}}</p>
                    <div style="display:flex; gap: 10px;">
                      <div v-for="color of pens[layer.id].colors" class="colorSquare" @click="changeColor(layer, color); $refs['dialog-'+layer.id][0].close()" :style="{'background-color': color}"></div>
                    </div>
                    <button :commandfor="'dialog-'+layer.id" command="close">Close</button>
                  </dialog>
                </td>
                <td v-if="!layer.child" :rowspan="layer.parent ? 2 : 1">
                  <input type="checkbox" :id="'visibility-'+id" v-model="hidden[layer.id]" />
                  <label :for="'visibility-'+id">{{ hidden[layer.id] ? 'Hidden' : 'Visible' }}</label>
                </td> 
              </tr>
            </tbody>
          </table>
        </div>
        <div class="options">
          <div class="button-block">
            <toggle-button text="Show fill" v-model="showFill" update-url="showFill"></toggle-button>
            <div>
              <p>Seed</p>
              <incremental-buttons 
                v-model="globalSeed" 
                :min="0"  
                :max="10000"
                :step="1"
                update-url="seed"
              >
              </incremental-buttons> 
            </div>
          </div>
          <div v-for="option in scene.options">
            <div class="name">{{option.name}}</div>
            <selector 
              v-if="option.type=='dropdown'" 
              :options="option.options" 
              v-model="scene.configs[option.name]"
              :update-url="option.name"
            ></selector>
            <incremental-buttons 
              v-if="option.type=='incremental'" 
              v-model="scene.configs[option.name]" 
              :min="option.min" 
              :max="option.max" 
              :step="option.step"
              :update-url="option.name"
            > </incremental-buttons>
            <radio-buttons
              v-if="option.type=='radioButton'"
              :choices="option.choices"
              v-model="scene.configs[option.name]"
              :update-url="option.name"
            > </radio-buttons>
            <slider
              v-if="option.type=='slider'"
              class="slider"
              :min="option.min"
              :max="option.max"
              :step="option.step"
              v-model="scene.configs[option.name]"
              :update-url="option.name"
            > </slider>
            <div class="button-block">
              <toggle-button 
                v-if="option.type=='toggle'" 
                :text="option.display" 
                v-model="scene.configs[option.name]"
                :update-url="option.name"
              > </toggle-button>
            </div>
          </div>
        </div>
      </div>
    </div>

  `,
  props: {
    scene: Object,
    bbox: Object,
    withFrame: Boolean,
    withGuides: Boolean,
  },
  data() {
    return {
      hidden: {},
      pens: {},
      penMultipliers: {},
      colors: {},
      disabled: {}, // first two layers should not allow for pen or color choice
      allPens: pens,
      showFill: false,
      globalSeed: getNumberURL('seed', 0),
    }
  },
  watch: {
    scene: {
      immediate: true,
      handler: function (newObj, oldObj) {
        console.log('scene has changed, resetting all fields', newObj, oldObj)
        this.hidden = {}
        this.pens = {}
        this.disabled = {}
        this.colors = {}
        this.penMultipliers = {}
      },
    },
    layerSkeletons: {
      immediate: true, // ensures this is run on the initial computation of allLayers
      handler: function (newObj, oldObj) {
        console.log('allLayers has changed', newObj, oldObj)
        if (Object.keys(this.pens).length > 0) {
          // don't do anything
          return
        }
        newObj.forEach((layer) => {
          this.hidden[layer.id] = layer.hidden
          if (layer.pen) {
            this.pens[layer.id] = layer.pen
          } else {
            this.pens[layer.id] = pens.Micron005 // default pen
          }
          this.penMultipliers[layer.id] = 1.0
          if (layer.color) {
            this.colors[layer.id] = layer.color
          } else {
            this.colors[layer.id] = 'black' // default color
          }
          this.disabled[layer.id] = layer.id < 2 // the first two layers shouldn't allow for pen or color choice
        })
      },
    },
    penNames: {
      // watching the computed 'penNames' since deep-watching an object doesn't return different old and new objects, so I can't
      // figure out what has changed
      // https://stackoverflow.com/questions/62729380/vue-watch-outputs-same-oldvalue-and-newvalue
      handler(newObj, oldObj) {
        // console.log('penNames changed', oldObj, newObj)
        for (let [i, [a, b]] of enumerate(zip(oldObj, newObj))) {
          // let [a, b] = ob
          if (a != b) {
            console.log('detected change in pens index', i, a, b, Object.keys(pens)[i])
            let [layerID, pen] = Object.entries(this.pens)[i]
            let layer = this.layersByID[layerID]
            this.changeColor(layer, pen.colors[0])
          }
        }
      },
    },
  },
  methods: {
    getSVG() {
      let svgNode = this.$refs.plot.children[0].cloneNode(true)
      svgNode.setAttribute('width', '12in')
      svgNode.setAttribute('height', '9in')
      let ref = svgNode.outerHTML

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
    changeColor(layer, color) {
      this.colors[layer.id] = color
      if (layer.parent) {
        this.colors[layer.parent.id] = color
      }
    },
    changeThicknessMultiplier(layer, thickness) {
      this.penMultipliers[layer.id] = thickness
      if (layer.parent) {
        this.penMultipliers[layer.parent.id] = thickness
      }
    },
  },
  components: {
    incrementalButtons,
    radioButtons,
    toggleButton,
    selector,
    slider,
  },
  computed: {
    canvas() {
      let yOffset = 0
      if (this.withGuides) {
        yOffset = 800
      }
      const framePadding = 1000
      return new BBox(0, yOffset, 13333, 10000).withIndividualPadding(500, 1000, 1000, 500)
    },
    layerPens() {
      // console.log('layerPens this.pens', this.pens)
      let ret = {}
      // console.log('this.pens', this.pens)
      for (let layerID of Object.keys(this.pens)) {
        let pen = this.pens[layerID]
        if (!(layerID in ret)) {
          // don't overwrite the value set by the parent logic below
          ret[layerID] = pen
        }
        let layer = this.layersByID[layerID]
        // console.log('layer', layer, layerID)
        if (layer.parent) {
          // console.log('layer has parent', layer.id, layer.parent.id)
          ret[layer.parent.id] = pen
        }
      }
      // console.log('layerPens', ret)
      return ret
    },
    penNames() {
      // used to watch changes in pens, watching on pens directly doesn't work since deep watching of objects doesn't provide the old value
      return Object.values(this.pens).map((pen) => pen.name)
    },
    layersByID() {
      let ret = {}
      for (let layer of this.allLayers) {
        ret[layer.id] = layer
      }
      return ret
    },
    guideFrameLayer() {
      return new Layer('frame').withCurves([this.canvas.continuousCurve()])
    },
    layers() {
      // console.log('calling this.scene.place with configs', this.scene.configs)
      // let configs = structuredClone(this.scene.configs)
      // console.log('configs', configs)
      let configs = this.scene.configs
      configs['seed'] = this.globalSeed
      // console.log('configs', configs)
      // this.scene.configs['seed'] = glob
      let layerDict = this.scene.place(this.canvas, configs).layers
      return layerDict
    },
    rawHTMLComment() {
      let output = []
      for (let option of this.scene.options) {
        let key = option.name
        let value =
          option.name in this.scene.configs ? this.scene.configs[option.name] : option.default
        // console.log('value', value, this.scene.configs)
        if (option.type == 'dropdown') {
          value = value.display
        }
        output.push(`${key}: ${value}`)
      }
      return `<!-- ${output} -->`
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
        if (layer.fill) {
          layerObj = layerObj.withFillCurves(layer.fill.curves)
        }
        if (layer.color) {
          layerObj = layerObj.withColor(layer.color)
        }
        if (layer.pen) {
          // console.log('layer pen', layer.pen)
          layerObj = layerObj.withPen(layer.pen)
        }
        if (layer.dontOptimize) {
          layerObj = layerObj.withoutOptimize()
        }
        // console.log('this.pens', this.pens)
        // console.log('before', layerObj.name, layerObj.statistics(20, this.showFill))
        layerObj = layerObj.optimize()
        // console.log('after', layerObj.name, layerObj.statistics(20, this.showFill))
        layers.push(layerObj)
      }
      return layers
    },
    visibleLayers() {
      let retval = this.allLayers.filter((layer) => {
        if (layer.child) {
          return !this.hidden[layer.child.id]
        }
        return !this.hidden[layer.id]
      })
      // console.log('visibleLayers', retval)
      return retval
    },
    layerSkeletons() {
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
          let layerObj = new Layer(`guide - ${layer.name}`)
            // .withCurves([
            //   new StraightStroke(new Point(500, 300), new Point(500, 700)).move(offset),
            //   new StraightStroke(new Point(300, 500), new Point(700, 500)).move(offset),
            // ])
            .withPen({ pen: layer.pen, color: layer.color })

          // if (layer.color) {
          //   layerObj = layerObj.withColor(layer.color)
          // }
          layer.attachChild(layerObj) // make sure the real layer has the guide layer as a child
          layers.push(layerObj)
          offset = offset.add(new Vector(1000, 0))
        }
        layers.push(layer)
      }
      // prefix each layer with a numerical index
      for (let [id, layer] of enumerate(layers)) {
        layer.displayName = `${id} - ${layer.name}`
        layer.id = id
      }

      // console.log('layerSkeletons', layers)
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
          // let pen = layerPens[layer]
          let layerObj = new Layer(`guide - ${layer.name}`)
            .withCurves([
              new StraightStroke(new Point(500, 300), new Point(500, 700)).move(offset),
              new StraightStroke(new Point(300, 500), new Point(700, 500)).move(offset),
            ])
            .withPen({ pen: layer.pen, color: layer.color })

          // if (layer.color) {
          //   layerObj = layerObj.withColor(layer.color)
          // }
          layer.attachChild(layerObj) // make sure the real layer has the guide layer as a child
          layers.push(layerObj)
          offset = offset.add(new Vector(1000, 0))
        }
        layers.push(layer)
      }
      // prefix each layer with a numerical index
      for (let [id, layer] of enumerate(layers)) {
        layer.displayName = `${id} - ${layer.name}`
        layer.id = id
      }

      // console.log('allLayers', layers)
      return layers
    },
  },
}

export { svgPlot }
