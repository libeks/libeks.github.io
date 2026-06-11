const clipToBBox = true

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
    this.layerFn = (template) => []

    this.options = []
    this.configs = {}
  }

  withTemplate(template, parameterFn, options) {
    this.rawTemplate = template
    this.parameterFn = parameterFn
    this.options = options

    // console.log('options', options)
    for (let option of options) {
      this.configs[option.name] = option.default
    }
    return this
  }

  withLayers(layerFn) {
    this.layerFn = layerFn
    return this
  }

  place(bbox, options) {
    this.parameters = this.parameterFn(bbox, options)
    this.template = applyTemplate(this.rawTemplate, this.parameters)
    let layers = this.layerFn(this.template)
    if (clipToBBox) {
      let newLayers = {}
      for (let [name, layer] of Object.entries(layers)) {
        let curves = []

        if (clipToBBox) {
          for (let curve of layer.curves) {
            let clipped = curve.clip(bbox)
            curves.push(...clipped)
          }
        } else {
          curves.push(...layer)
        }
        layer.curves = curves
      }
    }
    this.layers = layers
    return this
  }
}

export { Scene }
