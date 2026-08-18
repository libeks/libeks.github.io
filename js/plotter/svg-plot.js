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
          <g v-for="layer in visibleLayers" inkscape:groupmode="layer" :inkscape:label="layer.displayName" :transform="pens[layer.penID].transform()">
            <path 
              v-for="curve in layer.getAllCurves(pens[layer.penID].spacing * penMultipliers[layer.penID].value, showFill)" 
              :d="curve.d()" 
              :stroke="colors[layer.penID]"
              :fill="(layer.penID <2 || showFill) ? 'none' : colors[layer.penID]"
              fill-opacity="0.6"
              
              :stroke-width="pens[layer.penID].spacing" 
              stroke-opacity="0.6" 
              :data-line="curve.id"
            > </path>
          </g>
        </svg>
      </div>
      <div class="button-block" style="display:flex; justify-content: center; padding: 10px;">
        <a v-if="showFill" class="button" ref="download" @click="getSVG">⤓ Download SVG</a>
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
                <td style="text-align: right">{{prettyTime(layer.statistics(pens[layer.penID].spacing * penMultipliers[layer.penID].value, showFill).time)}}</td>
                <td v-if="!layer.child" :rowspan="layer.parent ? 2 : 1" :style="{color: pens[layer.penID].color}">
                  <div>
                    <div style="display: flex; gap: 10px">
                      <select v-model="pens[layer.penID]" :disabled="disabled[layer.penID]">
                        <option v-for="pen of allPens" :value="pen">{{pen.name}}</option>
                      </select>
                      <div v-if="!disabled[layer.penID]" class="colorSquare" @click="$refs['dialog-'+layer.penID][0].showModal()" :style="{'background-color': colors[layer.penID]}"></div>
                    </div>
                    <div v-if="layer.parent && layer.parent.fillCurves.length > 0" >
                      <radio-buttons 
                        class="inline-buttons button-block small" 
                        :choices="[{value:1, display: '1.0'}, {value:1.1, display:'1.1'}, {value:1.2, display: '1.2'},{value:1.5, display: '1.5'}, {value:2, display: '2.0'}]" 
                        v-model="penMultipliers[layer.penID]" 
                        @value="val=> penMultipliers[layer.penID] = val"
                      > 
                      </radio-buttons>
                    </div>
                  </div>
                  <dialog :id="'dialog-'+layer.penID" :ref="'dialog-'+layer.penID" closedby="any">
                    <p>Pick a color for {{pens[layer.penID].name}}</p>
                    <div style="display:flex; gap: 10px;">
                      <div v-for="color of pens[layer.penID].colors" class="colorSquare" @click="colors[layer.penID] = color; $refs['dialog-'+layer.penID][0].close()" :style="{'background-color': color}"></div>
                    </div>
                    <button :commandfor="'dialog-'+layer.penID" command="close">Close</button>
                  </dialog>
                </td>
                <td v-if="!layer.child" :rowspan="layer.parent ? 2 : 1">
                  <input type="checkbox" :id="'visibility-'+id" v-model="hidden[layer.penID]" />
                  <label :for="'visibility-'+id">{{ hidden[layer.penID] ? 'Hidden' : 'Visible' }}</label>
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
              v-model="configs[option.name]"
              :update-url="option.name"
            ></selector>
            <incremental-buttons 
              v-if="option.type=='incremental'" 
              v-model="configs[option.name]" 
              :min="option.min" 
              :max="option.max" 
              :step="option.step"
              :update-url="option.name"
            > </incremental-buttons>
            <radio-buttons
              v-if="option.type=='radioButton'"
              :choices="option.choices"
              v-model="configs[option.name]"
              :update-url="option.name"
            > </radio-buttons>
            <slider
              v-if="option.type=='slider'"
              class="slider"
              :min="option.min"
              :max="option.max"
              :step="option.step"
              v-model="configs[option.name]"
              :update-url="option.name"
            > </slider>
            <div class="button-block">
              <toggle-button 
                v-if="option.type=='toggle'" 
                :text="option.display" 
                v-model="configs[option.name]"
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
      configs: this.scene.getConfigs(),
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
        if (oldObj == undefined) {
          // initial render, setting of these values are handled by data()
          return
        }
        console.log('scene has changed, resetting all fields', newObj, oldObj)
        // reset all URL parameters, preserving only the 'scene' field
        let urlParams = new URLSearchParams(window.location.search)
        let newURLParams = new URLSearchParams()
        if (urlParams.has('scene')) {
          newURLParams.set('scene', urlParams.get('scene'))
        }
        window.history.replaceState({ path: 'home' }, '', `?${newURLParams.toString()}`)
        this.hidden = {}
        this.configs = newObj.getConfigs() // fetch configs from default (URL params are reset above)
        this.pens = {}
        this.disabled = {}
        this.colors = {}
        this.penMultipliers = {}
        this.showFill = false
        this.globalSeed = 0
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
          this.hidden[layer.penID] = layer.hidden
          if (layer.pen) {
            this.pens[layer.penID] = layer.pen
          } else {
            this.pens[layer.penID] = pens.Micron005 // default pen
          }
          this.penMultipliers[layer.penID] = { display: '1.0', value: 1 }
          if (layer.color) {
            this.colors[layer.penID] = layer.color
          } else {
            this.colors[layer.penID] = 'black' // default color
          }
          this.disabled[layer.penID] = layer.staticPen // the first two layers shouldn't allow for pen or color choice
        })
        console.log('this.pens after layerSkeleton watcher', this.pens, newObj)
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
            this.colors[layer.penID] = pen.colors[0]
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
      let configs = this.configs
      configs['seed'] = this.globalSeed
      let layerDict = this.scene.place(this.canvas, configs).layers
      return layerDict
    },
    rawHTMLComment() {
      let search = new URLSearchParams()
      for (let option of this.scene.options) {
        let value = option.name in this.configs ? this.configs[option.name] : option.default
        if (option.type == 'dropdown' || option.type == 'radioButton') {
          value = value.display
        } else if (option.type == 'toggle') {
          value = value ? '1' : '0'
        }
        search.set(option.name, value)
      }
      if ('seed' in this.configs) {
        search.set('seed', this.configs['seed'])
      }
      return `<!-- ${search.toString()} -->`
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
          layerObj = layerObj.withPen(layer.pen)
        }
        if (layer.dontOptimize) {
          layerObj = layerObj.withoutOptimize()
        }
        layerObj = layerObj.optimize()
        layers.push(layerObj)
      }
      return layers
    },
    visibleLayers() {
      let retval = this.allLayers.filter((layer) => {
        if (layer.child) {
          return !this.hidden[layer.child.penID]
        }
        return !this.hidden[layer.penID]
      })
      return retval
    },
    layerSkeletons() {
      let layers = []
      let penID = 0
      if (this.withFrame) {
        let layer = this.guideFrameLayer
        layer = layer.withPenID(penID).withStaticPen()
        penID += 1
        layers.push(layer)
      }
      if (this.withGuides && this.combLayer) {
        let layer = this.combLayer
        layer = layer.withPenID(penID).withStaticPen()
        penID += 1
        layers.push(layer)
      }

      let offset = new Vector(0, 0)
      for (let layer of this.namedLayers) {
        if (layer.drawGuides) {
          let layerObj = new Layer(`guide - ${layer.name}`)
            .withPen({
              pen: layer.pen,
              color: layer.color,
            })
            .withPenID(penID)

          layer.attachChild(layerObj) // make sure the real layer has the guide layer as a child
          layers.push(layerObj)
          offset = offset.add(new Vector(1000, 0))
        }
        layer = layer.withPenID(penID)
        layers.push(layer)
        penID += 1
      }
      // prefix each layer with a numerical index
      for (let [id, layer] of enumerate(layers)) {
        layer.displayName = `${id} - ${layer.name}`
        layer.id = id
      }
      return layers
    },
    allLayers() {
      let layers = []
      let penID = 0
      if (this.withFrame) {
        let layer = this.guideFrameLayer
        layer = layer.withPenID(penID).withStaticPen()
        penID += 1
        layers.push(layer)
      }
      if (this.withGuides && this.combLayer) {
        let layer = this.combLayer
        layer = layer.withPenID(penID).withStaticPen()
        penID += 1
        layers.push(layer)
      }

      let offset = new Vector(0, 0)
      for (let layer of this.namedLayers) {
        if (layer.drawGuides) {
          let layerObj = new Layer(`guide - ${layer.name}`)
            .withCurves([
              new StraightStroke(new Point(500, 300), new Point(500, 700)).move(offset),
              new StraightStroke(new Point(300, 500), new Point(700, 500)).move(offset),
            ])
            .withPen({ pen: layer.pen, color: layer.color })
            .withPenID(penID)

          layer.attachChild(layerObj) // make sure the real layer has the guide layer as a child
          layers.push(layerObj)
          offset = offset.add(new Vector(1000, 0))
        }
        layer = layer.withPenID(penID)
        layers.push(layer)
        penID += 1
      }
      // prefix each layer with a numerical index
      for (let [id, layer] of enumerate(layers)) {
        layer.displayName = `${id} - ${layer.name}`
        layer.id = id
      }
      console.log('layers', layers)

      return layers
    },
  },
}

export { svgPlot }
