import { enumerate } from '/js/utils.js'
import { pens } from '/js/plotter/pens.js'
import { getSelectorURLOption, getBoolURL, getNumberURL, getStringURL } from '/js/buttons.js'

// consts used as kill switches for debugging
const clipToBBox = true
const fill = true

function applyTemplate(template, parameters) {
  let obj = { __cached__: {} }
  if (template.props) {
    for (let [prop, typeDefault] of Object.entries(template.props)) {
      if (!(prop in parameters)) {
        console.warn(`Using default value for prop ${prop}`)
        if ('default' in typeDefault) {
          obj[prop] = typeDefault.default
        } else {
          obj[prop] = typeDefault()
        }
      } else {
        obj[prop] = parameters[prop]
      }
    }
  }
  if (template.computed) {
    for (let [name, value] of Object.entries(template.computed)) {
      Object.defineProperty(obj, name, {
        get() {
          if (name in obj['__cached__']) {
            return obj['__cached__'][name]
          }
          let val = template.computed[name].bind(obj)()
          obj['__cached__'][name] = val
          return obj['__cached__'][name]
        },
      })
    }
  }
  return obj
}

class Scene {
  constructor(name) {
    this.name = name
    this.layers = []
    this.rawTemplate = {}
    this.parameterFn = (bbox) => {}
    this.templateLayerFn = null
    this.layerFn = null

    this.options = []
    this.configs = {}
    this.pens = {}
  }

  // render layers based on a pre-existing Vue template
  // layerFn: ({template}) => ({namedLayers...}), note that it doesn't receive any of the parameters directly
  withTemplate(template, parameterFn, options, layerFn) {
    this.rawTemplate = template
    this.parameterFn = parameterFn
    this.options = options

    for (let option of options) {
      if (option.type == 'dropdown') {
        this.configs[option.name] = option.options.filter((o) => o.display == option.default)[0]
      } else {
        this.configs[option.name] = option.default
      }
    }
    this.templateLayerFn = layerFn
    return this
  }

  // render layers directly from options, without a Vue template
  // layerFn: ({parameters...}) => ({namedLayers...})
  withOptions(parameterFn, options, layerFn) {
    this.parameterFn = parameterFn
    this.options = options
    for (let option of options) {
      if (option.type == 'dropdown') {
        this.configs[option.name] = option.options.filter((o) => o.display == option.default)[0]
      } else {
        this.configs[option.name] = option.default
      }
    }
    this.layerFn = layerFn
    return this
  }

  // return an object with the config values populated either from the URL, or from the option defaults
  getConfigs() {
    let configs = {}
    for (let option of this.options) {
      if (option.type == 'dropdown') {
        configs[option.name] = getSelectorURLOption(option.options, option.name, option.default)
      } else if (option.type == 'toggle') {
        configs[option.name] = getBoolURL(option.name, option.default)
      } else if (option.type == 'slider' || option.type == 'incremental') {
        configs[option.name] = getNumberURL(option.name, option.default)
      } else {
        configs[option.name] = getStringURL(option.name, option.default)
      }
    }
    console.log('getConfigs', configs)
    return configs
  }

  withPens(pens) {
    // pens is an object, each pen has {pen: , color:} fields
    this.pens = pens
    return this
  }

  place(bbox, options) {
    this.parameters = this.parameterFn(bbox, options)
    let layers
    if (this.rawTemplate && this.templateLayerFn) {
      this.template = applyTemplate(this.rawTemplate, this.parameters)
      layers = this.templateLayerFn(this.template)
    } else {
      // no template, use layerFn directly
      layers = this.layerFn(this.parameters)
    }
    if (clipToBBox) {
      let newLayers = {}
      for (let [name, layer] of Object.entries(layers)) {
        if (!('curves' in layer)) {
          layer.curves = []
        }
        let curves = []
        let fill = []

        if (name in this.pens) {
          layer.pen = this.pens[name]
        } else {
          layer.pen = { pen: pens.Micron005, color: 'black' }
        }

        if (clipToBBox) {
          for (let curve of layer.curves) {
            let clipped = curve.clip(bbox)
            if (
              layer.fill &&
              layer.fill.curves.some((curve) => !curve.curve.curve.isContinousDebug())
            ) {
              throw `fill curve became non-continuous`
            }
            curves.push(...clipped)
          }
          layer.curves = curves
          if (layer.fill) {
            let c = layer.fill.curves[3]
            for (let curve of layer.fill.curves) {
              if (!curve.curve.curve.isContinousDebug()) {
                console.trace()
                throw `fill layer has a non-continuous curve`
              }
              curve = curve.counterClockwise()
              let clipped = curve.clip(bbox)
              fill.push(...clipped)
            }
            layer.fill.curves = fill
          }
        }
      }
    }
    this.layers = layers
    return this
  }

  fill(paramMap) {
    console.info('filling...')
    let layers = {}
    for (let layer of Object.values(this.layers)) {
      let spacing = 20 // default if the layer doesn't specify its fill
      let direction = 13 // default if the layer doesn't specify its fill
      if (layer.name in paramMap) {
        let p = paramMap[layer.name]
        spacing = p.spacing
        direction = p.direction
      }

      if (layer.fill && layer.fill.curves.length > 0) {
        let curves = []
        for (let curve of layer.fill.curves) {
          let fill = curve.fill(spacing, direction)
          if (curve.id) {
            enumerate(fill).forEach(([id, c]) => (c.id = `${curve.id}.${id}`))
          }
          layers[layer.name] = curves
        }
      }
    }
    console.info('done filling')
    return layers
  }
}

export { Scene }
