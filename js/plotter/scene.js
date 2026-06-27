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
        if (!('curves' in layer)) {
          layer.curves = []
        }
        // if (!('fill' in layer)) {
        //   layer.fill = []
        // }
        let curves = []
        let fill = []

        if (clipToBBox) {
          for (let curve of layer.curves) {
            let clipped = curve.clip(bbox)
            curves.push(...clipped)
          }
          layer.curves = curves
          if (layer.fill) {
            // console.log('layer.fill', layer.fill)
            for (let curve of layer.fill.curves) {
              let clipped = curve.clip(bbox)
              fill.push(...clipped)
            }
            layer.fill.curves = fill
          }
        }
      }
    }
    // console.log('layers', layers)
    this.layers = layers
    this.fill()
    return this
  }

  fill() {
    console.log('filling...')
    for (let layer of Object.values(this.layers)) {
      if (layer.fill && layer.fill.curves.length > 0) {
        let spacing = 20
        if (layer.fill.spacing) {
          spacing = layer.fill.spacing
        }
        let direction = 13
        if (layer.fill.direction) {
          direction = layer.fill.direction
        }
        for (let curve of layer.fill.curves) {
          console.log('filling curve', curve)

          layer.curves.push(...curve.fill(spacing, direction))
        }
      }
    }
    console.log('done filling')
  }
}

export { Scene }
